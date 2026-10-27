import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { SPORT_LABELS } from "@/lib/calc/sport";
import { sessionTitle } from "@/lib/plan/describe";
import type { PlanContent } from "@/lib/plan/schema";
import { canAccessAthlete, getActivity, needsRefresh, refreshAccessToken, StravaAuthError } from "./api";
import { STRAVA_SUBSCRIPTION_KEY, stravaConfig } from "./config";
import type { WebhookDeps } from "./webhook";

/** Gültiges Access Token für einen Kunden; erneuert es per Refresh Token, wenn nötig. */
export async function getValidAccessToken(admin: SupabaseClient, clientId: string): Promise<string> {
  const { data: conn } = await admin.from("strava_connections").select("*").eq("client_id", clientId).maybeSingle();
  if (!conn) throw new StravaAuthError("Keine Strava-Verbindung");
  if (!needsRefresh(new Date(conn.expires_at))) return conn.access_token;
  const t = await refreshAccessToken(stravaConfig(), conn.refresh_token);
  await admin
    .from("strava_connections")
    .update({ access_token: t.access_token, refresh_token: t.refresh_token, expires_at: new Date(t.expires_at * 1000).toISOString() })
    .eq("client_id", clientId);
  return t.access_token;
}

/** Produktive Umsetzung der Webhook-Abhängigkeiten (Service-Role, umgeht RLS bewusst). */
export function createWebhookDeps(): WebhookDeps {
  const admin = createSupabaseAdminClient();
  const cfg = stravaConfig();

  return {
    async subscriptionId() {
      const { data } = await admin.from("app_settings").select("value").eq("key", STRAVA_SUBSCRIPTION_KEY).maybeSingle();
      return typeof data?.value === "number" ? data.value : null;
    },
    async findConnection(athleteId) {
      const { data } = await admin.from("strava_connections").select("client_id, connected_at").eq("athlete_id", athleteId).maybeSingle();
      return data ? { clientId: data.client_id, connectedAt: data.connected_at } : null;
    },
    accessToken: (clientId) => getValidAccessToken(admin, clientId),
    fetchActivity: (token, id) => getActivity(cfg, token, id),
    async stillAuthorized(clientId) {
      try {
        return await canAccessAthlete(cfg, await getValidAccessToken(admin, clientId));
      } catch (e) {
        if (e instanceof StravaAuthError) return false;
        return true; // im Zweifel nichts löschen
      }
    },
    async activityExists(stravaId) {
      const { data } = await admin.from("strava_activities").select("id").eq("strava_activity_id", stravaId).maybeSingle();
      return Boolean(data);
    },
    async loadMatchContext(clientId) {
      const { data: plan } = await admin
        .from("plans")
        .select("id, current_version")
        .eq("client_id", clientId)
        .eq("is_active", true)
        .maybeSingle();
      if (!plan) return null;
      const [{ data: version }, { data: logs }] = await Promise.all([
        admin.from("plan_versions").select("content").eq("plan_id", plan.id).eq("version", plan.current_version).single(),
        admin.from("workout_logs").select("session_id").eq("client_id", clientId).eq("plan_id", plan.id).not("session_id", "is", null),
      ]);
      if (!version) return null;
      return {
        planId: plan.id,
        planVersion: plan.current_version,
        plan: version.content as PlanContent,
        takenSessionIds: new Set((logs ?? []).map((l) => l.session_id as string)),
      };
    },
    async insertActivity(a, match) {
      const base = {
        client_id: a.clientId,
        kind: "endurance",
        performed_on: a.startDateLocal,
        source: "strava",
        completed: true,
        sport: a.sport,
        duration_seconds: a.movingTimeSeconds,
      };
      let { data: log, error } = await admin
        .from("workout_logs")
        .insert({
          ...base,
          title: match ? sessionTitle(match.session) : `${SPORT_LABELS[a.sport]} (ungeplant)`,
          plan_id: match?.planId ?? null,
          plan_version: match?.planVersion ?? null,
          session_id: match?.sessionId ?? null,
        })
        .select("id")
        .single();
      let matched = Boolean(match);
      if (error && match) {
        // Einheit wurde inzwischen anders belegt → als ungeplant speichern.
        ({ data: log, error } = await admin
          .from("workout_logs")
          .insert({ ...base, title: `${SPORT_LABELS[a.sport]} (ungeplant)` })
          .select("id")
          .single());
        matched = false;
      }
      if (error || !log) throw new Error(`Strava-Eintrag fehlgeschlagen: ${error?.message}`);
      const { error: actErr } = await admin.from("strava_activities").insert({
        client_id: a.clientId,
        strava_activity_id: a.stravaActivityId,
        workout_log_id: log.id,
        strava_sport_type: a.sportType,
        sport: a.sport,
        start_time: a.startTime,
        start_date_local: a.startDateLocal,
        moving_time_seconds: a.movingTimeSeconds,
        distance_m: a.distanceM,
        avg_hr: a.avgHr,
        is_test: a.isTest,
        matched,
        planned_duration_seconds: matched ? match!.planned.durationSeconds : null,
        planned_distance_m: matched ? match!.planned.distanceM : null,
      });
      if (actErr) {
        await admin.from("workout_logs").delete().eq("id", log.id);
        throw new Error(`Strava-Aktivität nicht gespeichert: ${actErr.message}`);
      }
    },
    async updateActivity(a) {
      const { data: act } = await admin
        .from("strava_activities")
        .update({
          strava_sport_type: a.sportType,
          sport: a.sport,
          start_time: a.startTime,
          start_date_local: a.startDateLocal,
          moving_time_seconds: a.movingTimeSeconds,
          distance_m: a.distanceM,
          avg_hr: a.avgHr,
        })
        .eq("strava_activity_id", a.stravaActivityId)
        .select("workout_log_id")
        .single();
      if (act?.workout_log_id) {
        await admin
          .from("workout_logs")
          .update({ duration_seconds: a.movingTimeSeconds, performed_on: a.startDateLocal })
          .eq("id", act.workout_log_id);
      }
    },
    async deleteActivity(stravaId) {
      const { data: act } = await admin.from("strava_activities").select("workout_log_id").eq("strava_activity_id", stravaId).maybeSingle();
      await admin.from("strava_activities").delete().eq("strava_activity_id", stravaId);
      if (act?.workout_log_id) await admin.from("workout_logs").delete().eq("id", act.workout_log_id).eq("source", "strava");
    },
    async deleteAllStravaData(clientId) {
      await admin.from("strava_activities").delete().eq("client_id", clientId);
      await admin.from("workout_logs").delete().eq("client_id", clientId).eq("source", "strava");
      await admin.from("strava_connections").delete().eq("client_id", clientId);
    },
  };
}
