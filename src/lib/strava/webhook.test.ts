import { describe, expect, it } from "vitest";
import { samplePlan } from "@/lib/plan/fixtures";
import type { StravaActivity } from "./api";
import { handleStravaEvent, WebhookEventSchema, type StoredActivity, type WebhookDeps } from "./webhook";

// Beispiel-Payloads im Format der Strava-Webhook-Doku.
const createEvent = {
  aspect_type: "create",
  event_time: 1761552000,
  object_id: 1360128428,
  object_type: "activity",
  owner_id: 134815,
  subscription_id: 120475,
  updates: {},
};
const updateEvent = { ...createEvent, aspect_type: "update", updates: { title: "Abendlauf" } };
const deleteEvent = { ...createEvent, aspect_type: "delete" };
const deauthEvent = {
  aspect_type: "update",
  event_time: 1761552000,
  object_id: 134815,
  object_type: "athlete",
  owner_id: 134815,
  subscription_id: 120475,
  updates: { authorized: "false" },
};

const run: StravaActivity = {
  id: 1360128428,
  sport_type: "Run",
  start_date: "2026-10-29T17:02:00Z",
  start_date_local: "2026-10-29T18:02:00Z",
  moving_time: 2580,
  distance: 8420.4,
  average_heartrate: 151.3,
  workout_type: 0,
};

function fakeDeps(opts: { activity?: StravaActivity | "not_found"; authorized?: boolean; connectedAt?: string; existing?: boolean; subscriptionId?: number | null } = {}) {
  const calls: { inserted: { a: StoredActivity; sessionId: string | null }[]; updated: StoredActivity[]; deleted: number[]; wiped: string[]; tokens: string[] } = {
    inserted: [],
    updated: [],
    deleted: [],
    wiped: [],
    tokens: [],
  };
  const deps: WebhookDeps = {
    subscriptionId: async () => (opts.subscriptionId === undefined ? 120475 : opts.subscriptionId),
    findConnection: async (athleteId) => (athleteId === 134815 ? { clientId: "kunde-a", connectedAt: opts.connectedAt ?? "2026-10-01T00:00:00Z" } : null),
    accessToken: async (clientId) => {
      calls.tokens.push(clientId);
      return "token-123";
    },
    fetchActivity: async () => opts.activity ?? run,
    stillAuthorized: async () => opts.authorized ?? false,
    activityExists: async () => opts.existing ?? false,
    loadMatchContext: async () => ({ planId: "plan-1", planVersion: 3, plan: samplePlan(), takenSessionIds: new Set() }),
    insertActivity: async (a, match) => {
      calls.inserted.push({ a, sessionId: match?.sessionId ?? null });
    },
    updateActivity: async (a) => {
      calls.updated.push(a);
    },
    deleteActivity: async (id) => {
      calls.deleted.push(id);
    },
    deleteAllStravaData: async (clientId) => {
      calls.wiped.push(clientId);
    },
  };
  return { deps, calls };
}

const parse = (p: unknown) => WebhookEventSchema.parse(p);

describe("Strava-Webhook", () => {
  it("create: speichert nur erlaubte Felder und ordnet der geplanten Einheit zu", async () => {
    const { deps, calls } = fakeDeps();
    const out = await handleStravaEvent(parse(createEvent), deps);
    expect(out).toEqual({ status: "created", matched: true, sessionId: "w1d4-lauf" });
    expect(calls.inserted[0].a).toEqual({
      clientId: "kunde-a",
      stravaActivityId: 1360128428,
      sportType: "Run",
      sport: "laufen",
      startTime: "2026-10-29T17:02:00Z",
      startDateLocal: "2026-10-29",
      movingTimeSeconds: 2580,
      distanceM: 8420.4,
      avgHr: 151.3,
      isTest: false,
    });
  });

  it("create ohne passende Einheit → ungeplant", async () => {
    const { deps, calls } = fakeDeps({ activity: { ...run, sport_type: "Swim" } });
    expect(await handleStravaEvent(parse(createEvent), deps)).toEqual({ status: "created", matched: false });
    expect(calls.inserted[0].sessionId).toBeNull();
  });

  it("create einer Aktivität von vor der Verbindung wird ignoriert (kein Historienimport)", async () => {
    const { deps, calls } = fakeDeps({ connectedAt: "2026-10-30T00:00:00Z" });
    expect(await handleStravaEvent(parse(createEvent), deps)).toEqual({ status: "ignored", reason: "vor der Verbindung" });
    expect(calls.inserted).toHaveLength(0);
  });

  it("Wettkampf (workout_type 1) wird als Test markiert", async () => {
    const { deps, calls } = fakeDeps({ activity: { ...run, workout_type: 1 } });
    await handleStravaEvent(parse(createEvent), deps);
    expect(calls.inserted[0].a.isTest).toBe(true);
  });

  it("update aktualisiert Werte, ohne neu zuzuordnen; doppeltes create ebenso", async () => {
    const { deps, calls } = fakeDeps({ existing: true, activity: { ...run, moving_time: 2600 } });
    expect(await handleStravaEvent(parse(updateEvent), deps)).toEqual({ status: "updated" });
    expect(await handleStravaEvent(parse(createEvent), deps)).toEqual({ status: "updated" });
    expect(calls.updated.map((u) => u.movingTimeSeconds)).toEqual([2600, 2600]);
    expect(calls.inserted).toHaveLength(0);
  });

  it("delete entfernt die Aktivität, wenn Strava sie nicht mehr liefert", async () => {
    const { deps, calls } = fakeDeps({ existing: true, activity: "not_found" });
    expect(await handleStravaEvent(parse(deleteEvent), deps)).toEqual({ status: "deleted" });
    expect(calls.deleted).toEqual([1360128428]);
  });

  it("delete wird ignoriert, wenn die Aktivität noch existiert (gefälschtes Ereignis)", async () => {
    const { deps, calls } = fakeDeps({ existing: true });
    expect((await handleStravaEvent(parse(deleteEvent), deps)).status).toBe("ignored");
    expect(calls.deleted).toHaveLength(0);
  });

  it("Deautorisierung löscht alle Strava-Daten des Kunden", async () => {
    const { deps, calls } = fakeDeps({ authorized: false });
    expect(await handleStravaEvent(parse(deauthEvent), deps)).toEqual({ status: "deauthorized" });
    expect(calls.wiped).toEqual(["kunde-a"]);
  });

  it("Deautorisierung ohne Bestätigung (Zugriff besteht noch) löscht nichts", async () => {
    const { deps, calls } = fakeDeps({ authorized: true });
    expect((await handleStravaEvent(parse(deauthEvent), deps)).status).toBe("ignored");
    expect(calls.wiped).toHaveLength(0);
  });

  it("Ereignisse eines fremden Abos oder unbekannter Athleten werden ignoriert", async () => {
    const { deps, calls } = fakeDeps();
    expect((await handleStravaEvent(parse({ ...createEvent, subscription_id: 999 }), deps)).status).toBe("ignored");
    expect((await handleStravaEvent(parse({ ...createEvent, owner_id: 1 }), deps)).status).toBe("ignored");
    expect(calls.inserted).toHaveLength(0);
    expect(calls.tokens).toHaveLength(0);
  });

  it("ungültige Payloads werden vom Schema abgewiesen", () => {
    expect(WebhookEventSchema.safeParse({ object_type: "club" }).success).toBe(false);
  });
});
