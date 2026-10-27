// Verarbeitung von Strava-Webhook-Ereignissen. Alle Seiteneffekte laufen über
// "deps", damit die Logik mit Beispiel-Payloads getestet werden kann.
import { z } from "zod";
import { matchActivity, type MatchResult } from "@/lib/calc/matching";
import { mapStravaSport, type Sport } from "@/lib/calc/sport";
import type { PlanContent } from "@/lib/plan/schema";
import type { StravaActivity } from "./api";

export const WebhookEventSchema = z.object({
  object_type: z.enum(["activity", "athlete"]),
  object_id: z.number(),
  aspect_type: z.enum(["create", "update", "delete"]),
  owner_id: z.number(),
  subscription_id: z.number(),
  event_time: z.number(),
  updates: z.record(z.string(), z.unknown()).optional(),
});
export type WebhookEvent = z.infer<typeof WebhookEventSchema>;

export interface Connection {
  clientId: string;
  connectedAt: string;
}

export interface MatchContext {
  planId: string;
  planVersion: number;
  plan: PlanContent;
  takenSessionIds: Set<string>;
}

export interface StoredActivity {
  clientId: string;
  stravaActivityId: number;
  sportType: string;
  sport: Sport;
  startTime: string;
  startDateLocal: string;
  movingTimeSeconds: number;
  distanceM: number | null;
  avgHr: number | null;
  isTest: boolean;
}

export interface WebhookDeps {
  /** Gespeicherte Abo-ID; Ereignisse anderer Abos werden ignoriert. null = noch nicht registriert. */
  subscriptionId(): Promise<number | null>;
  findConnection(athleteId: number): Promise<Connection | null>;
  /** Liefert ein gültiges Access Token (erneuert bei Bedarf); wirft bei entzogenem Zugriff. */
  accessToken(clientId: string): Promise<string>;
  fetchActivity(accessToken: string, activityId: number): Promise<StravaActivity | "not_found">;
  /** Gegenprüfung bei Deautorisierung: hat die App noch Zugriff? */
  stillAuthorized(clientId: string): Promise<boolean>;
  /** Nur Aktivitäten DIESES Kunden (nie über Kundengrenzen hinweg) */
  activityExists(clientId: string, stravaActivityId: number): Promise<boolean>;
  loadMatchContext(clientId: string): Promise<MatchContext | null>;
  insertActivity(activity: StoredActivity, match: (MatchResult & { planId: string; planVersion: number }) | null): Promise<void>;
  updateActivity(activity: StoredActivity): Promise<void>;
  deleteActivity(clientId: string, stravaActivityId: number): Promise<void>;
  deleteAllStravaData(clientId: string): Promise<void>;
}

export type WebhookOutcome =
  | { status: "created"; matched: boolean; sessionId?: string }
  | { status: "updated" }
  | { status: "deleted" }
  | { status: "deauthorized" }
  | { status: "ignored"; reason: string };

/** Strava "workout_type": 1 = Wettkampf (Lauf), 11 = Wettkampf (Rad). */
function isRace(a: StravaActivity): boolean {
  return a.workout_type === 1 || a.workout_type === 11;
}

export function toStoredActivity(clientId: string, a: StravaActivity): StoredActivity {
  return {
    clientId,
    stravaActivityId: a.id,
    sportType: a.sport_type,
    sport: mapStravaSport(a.sport_type),
    startTime: a.start_date,
    startDateLocal: a.start_date_local.slice(0, 10),
    movingTimeSeconds: Math.round(a.moving_time),
    distanceM: a.distance != null ? Math.round(a.distance * 10) / 10 : null,
    avgHr: a.average_heartrate != null ? Math.round(a.average_heartrate * 10) / 10 : null,
    isTest: isRace(a),
  };
}

export async function handleStravaEvent(event: WebhookEvent, deps: WebhookDeps): Promise<WebhookOutcome> {
  // Strava signiert Ereignisse nicht: ohne gespeicherte Abo-ID (Button in "Einrichtung") wird nichts verarbeitet.
  const expected = await deps.subscriptionId();
  if (expected == null || event.subscription_id !== expected) {
    return { status: "ignored", reason: "fremdes oder kein registriertes Abo" };
  }

  const connection = await deps.findConnection(event.owner_id);
  if (!connection) return { status: "ignored", reason: "Athlet nicht verbunden" };

  if (event.object_type === "athlete") {
    const authorized = event.updates?.authorized;
    if (event.aspect_type === "update" && (authorized === "false" || authorized === false)) {
      // Gegenprüfung, damit ein gefälschtes Ereignis keine Daten löscht.
      if (await deps.stillAuthorized(connection.clientId)) {
        return { status: "ignored", reason: "Deautorisierung nicht bestätigt" };
      }
      await deps.deleteAllStravaData(connection.clientId);
      return { status: "deauthorized" };
    }
    return { status: "ignored", reason: "Athleten-Ereignis ohne Relevanz" };
  }

  const token = await deps.accessToken(connection.clientId);

  if (event.aspect_type === "delete") {
    if (!(await deps.activityExists(connection.clientId, event.object_id))) return { status: "ignored", reason: "Aktivität unbekannt" };
    // Gegenprüfung: nur löschen, wenn Strava die Aktivität wirklich nicht mehr liefert.
    if ((await deps.fetchActivity(token, event.object_id)) !== "not_found") {
      return { status: "ignored", reason: "Aktivität existiert noch" };
    }
    await deps.deleteActivity(connection.clientId, event.object_id);
    return { status: "deleted" };
  }

  const activity = await deps.fetchActivity(token, event.object_id);
  if (activity === "not_found") return { status: "ignored", reason: "Aktivität nicht abrufbar" };
  if (activity.athlete.id !== event.owner_id) return { status: "ignored", reason: "Aktivität gehört nicht dem Absender" };
  const stored = toStoredActivity(connection.clientId, activity);

  if (await deps.activityExists(connection.clientId, activity.id)) {
    // Auch doppelt zugestellte "create"-Ereignisse landen hier. Zuordnung bleibt unverändert.
    await deps.updateActivity(stored);
    return { status: "updated" };
  }

  // Keine Historie: nur Aktivitäten ab dem Verbindungszeitpunkt.
  if (new Date(activity.start_date).getTime() < new Date(connection.connectedAt).getTime()) {
    return { status: "ignored", reason: "vor der Verbindung" };
  }

  const ctx = await deps.loadMatchContext(connection.clientId);
  const match = ctx ? matchActivity({ sport: stored.sport, date: stored.startDateLocal }, ctx.plan, ctx.takenSessionIds) : null;
  await deps.insertActivity(stored, match && ctx ? { ...match, planId: ctx.planId, planVersion: ctx.planVersion } : null);
  return match ? { status: "created", matched: true, sessionId: match.sessionId } : { status: "created", matched: false };
}
