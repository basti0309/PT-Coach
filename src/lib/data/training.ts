import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { SetLogRow, StravaActivityRow, WorkoutLogRow } from "@/lib/db-types";
import { buildHistoryExport, type HistoryExportEntry, type HistoryLog, type HistorySet } from "@/lib/export/history";
import { prefillFromHistory, type Placeholder } from "@/lib/calc/prefill";
import { findLastWodResult, wodMovementsKey } from "@/lib/calc/wod";
import type { StrengthSession, WodSession } from "@/lib/plan/schema";

export async function loadLogBySession(
  supabase: SupabaseClient,
  clientId: string,
  planId: string,
  sessionId: string,
): Promise<WorkoutLogRow | null> {
  const { data } = await supabase
    .from("workout_logs")
    .select("*")
    .eq("client_id", clientId)
    .eq("plan_id", planId)
    .eq("session_id", sessionId)
    .maybeSingle();
  return (data as WorkoutLogRow) ?? null;
}

export async function loadSets(supabase: SupabaseClient, logId: string): Promise<SetLogRow[]> {
  const { data } = await supabase.from("set_logs").select("*").eq("workout_log_id", logId).order("set_no");
  return (data ?? []) as SetLogRow[];
}

/** Platzhalter je Übung aus der Historie (gleiche Übungs-ID). */
export async function loadPrefill(
  supabase: SupabaseClient,
  clientId: string,
  session: StrengthSession,
  currentLogId: string | null,
): Promise<Record<string, (Placeholder | null)[]>> {
  const ids = [...new Set(session.exercises.map((e) => e.exerciseId))];
  const { data } = await supabase
    .from("set_logs")
    .select("workout_log_id, performed_on, created_at, set_no, weight_kg, reps, done, exercise_id")
    .eq("client_id", clientId)
    .in("exercise_id", ids)
    .eq("done", true)
    .order("performed_on", { ascending: false })
    .limit(500);
  const rows = data ?? [];
  const out: Record<string, (Placeholder | null)[]> = {};
  for (const ex of session.exercises) {
    const history = rows
      .filter((r) => r.exercise_id === ex.exerciseId)
      .map((r) => ({
        workoutLogId: r.workout_log_id,
        performedOn: r.performed_on,
        createdAt: r.created_at,
        setNo: r.set_no,
        weightKg: r.weight_kg,
        reps: r.reps,
        done: r.done,
      }));
    out[ex.exerciseId] = prefillFromHistory(history, ex.sets, currentLogId ?? undefined);
  }
  return out;
}

export async function loadLastWod(
  supabase: SupabaseClient,
  clientId: string,
  wod: WodSession,
  currentLogId: string | null,
): Promise<WorkoutLogRow | null> {
  const key = wodMovementsKey(wod);
  const queries = [
    supabase.from("workout_logs").select("*").eq("client_id", clientId).eq("kind", "wod").eq("wod_movements_key", key).limit(50),
  ];
  if (wod.wodId) {
    queries.push(supabase.from("workout_logs").select("*").eq("client_id", clientId).eq("kind", "wod").eq("wod_id", wod.wodId).limit(50));
  }
  const results = await Promise.all(queries);
  const logs = results.flatMap((r) => (r.data ?? []) as WorkoutLogRow[]);
  return findLastWodResult(wod, logs, currentLogId ?? undefined);
}

export interface HistoryEntry {
  log: WorkoutLogRow;
  sets: SetLogRow[];
  strava: StravaActivityRow | null;
}

/** Trainingsverlauf. Strava-Details liefert RLS nur dem Kunden selbst. */
export async function loadHistory(supabase: SupabaseClient, clientId: string, limit = 60): Promise<HistoryEntry[]> {
  const { data: logs } = await supabase
    .from("workout_logs")
    .select("*")
    .eq("client_id", clientId)
    .order("performed_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  const list = (logs ?? []) as WorkoutLogRow[];
  const ids = list.map((l) => l.id);
  if (ids.length === 0) return [];
  const [{ data: sets }, { data: strava }] = await Promise.all([
    supabase.from("set_logs").select("*").in("workout_log_id", ids).order("set_no"),
    supabase.from("strava_activities").select("*").in("workout_log_id", ids),
  ]);
  const setsBy = new Map<string, SetLogRow[]>();
  for (const s of (sets ?? []) as SetLogRow[]) setsBy.set(s.workout_log_id, [...(setsBy.get(s.workout_log_id) ?? []), s]);
  const stravaBy = new Map(((strava ?? []) as StravaActivityRow[]).map((a) => [a.workout_log_id, a]));
  return list.map((log) => ({ log, sets: setsBy.get(log.id) ?? [], strava: stravaBy.get(log.id) ?? null }));
}

/** Gesamter Trainingsverlauf für den Export – liest bewusst nie strava_activities (keine Strava-Werte im Export). */
export async function loadHistoryForExport(supabase: SupabaseClient, clientId: string): Promise<HistoryExportEntry[]> {
  const { data: logs } = await supabase
    .from("workout_logs")
    .select("id, kind, performed_on, title, source, completed, sport, duration_seconds, distance_m, avg_hr, is_test, wod_result, wod_weights, block_results, session_rpe, notes")
    .eq("client_id", clientId)
    .order("performed_on")
    .limit(5000);
  const list = (logs ?? []) as HistoryLog[];
  const ids = list.filter((l) => l.kind === "strength").map((l) => l.id);
  const { data: sets } = ids.length
    ? await supabase
        .from("set_logs")
        .select("workout_log_id, exercise_id, exercise_name, set_no, weight_kg, reps, done")
        .in("workout_log_id", ids)
        .limit(20000)
    : { data: [] };
  return buildHistoryExport(list, (sets ?? []) as HistorySet[]);
}
