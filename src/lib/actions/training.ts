"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireClientAccess, requireCoach } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SPORTS } from "@/lib/calc/sport";
import { isSessionComplete, valueCount, type BlockResults } from "@/lib/calc/blocks";
import { loadPlanWithVersion } from "@/lib/data/plans";
import { findSession } from "@/lib/plan/dates";

// Alle Schreibzugriffe laufen über den Nutzer-Client → RLS prüft, ob Kunde/Coach schreiben darf.
// created_by/updated_by setzt die Datenbank (Trigger).

const isoDate = z.iso.date();

function revalidate() {
  revalidatePath("/kunde", "layout");
  revalidatePath("/coach/kunden", "layout");
}

const workoutRef = z.object({
  clientId: z.uuid(),
  planId: z.uuid().nullable(),
  planVersion: z.int().nullable(),
  sessionId: z.string().max(64).nullable(),
  kind: z.enum(["strength", "wod", "endurance", "program"]),
  date: isoDate,
  title: z.string().max(200),
  wodId: z.string().max(64).nullable().optional(),
  wodMovementsKey: z.string().max(2000).nullable().optional(),
});
export type WorkoutRef = z.infer<typeof workoutRef>;

/** Legt das Workout für eine Plan-Einheit an (oder liefert das bestehende). */
export async function ensureWorkoutLog(input: WorkoutRef): Promise<string> {
  const ref = workoutRef.parse(input);
  await requireClientAccess(ref.clientId);
  const supabase = await createSupabaseServerClient();
  if (ref.planId && ref.sessionId) {
    const { data: existing } = await supabase
      .from("workout_logs")
      .select("id")
      .eq("client_id", ref.clientId)
      .eq("plan_id", ref.planId)
      .eq("session_id", ref.sessionId)
      .maybeSingle();
    if (existing) return existing.id;
  }
  const { data, error } = await supabase
    .from("workout_logs")
    .insert({
      client_id: ref.clientId,
      kind: ref.kind,
      performed_on: ref.date,
      title: ref.title,
      plan_id: ref.planId,
      plan_version: ref.planVersion,
      session_id: ref.sessionId,
      wod_id: ref.wodId ?? null,
      wod_movements_key: ref.wodMovementsKey ?? null,
      source: "manual",
      completed: false,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(`Training konnte nicht angelegt werden: ${error?.message}`);
  revalidate();
  return data.id;
}

const setInput = z.object({
  clientId: z.uuid(),
  workoutLogId: z.uuid(),
  exerciseId: z.string().min(1).max(64),
  exerciseName: z.string().max(120),
  setNo: z.int().min(1).max(50),
  weightKg: z.number().min(0).max(1000).nullable(),
  reps: z.int().min(0).max(1000).nullable(),
  done: z.boolean(),
});

export async function saveSet(input: z.infer<typeof setInput>): Promise<void> {
  const s = setInput.parse(input);
  await requireClientAccess(s.clientId);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("set_logs").upsert(
    {
      workout_log_id: s.workoutLogId,
      client_id: s.clientId,
      performed_on: "1970-01-01", // wird vom Trigger aus dem Workout übernommen
      exercise_id: s.exerciseId,
      exercise_name: s.exerciseName,
      set_no: s.setNo,
      weight_kg: s.weightKg,
      reps: s.reps,
      done: s.done,
    },
    { onConflict: "workout_log_id,exercise_id,set_no" },
  );
  if (error) throw new Error(`Satz konnte nicht gespeichert werden: ${error.message}`);
}

const sessionRpe = z.int().min(0).max(10).nullable();

const finishInput = z.object({
  clientId: z.uuid(),
  workoutLogId: z.uuid(),
  completed: z.boolean(),
  date: isoDate,
  notes: z.string().max(2000),
  sessionRpe,
  durationMinutes: z.int().min(1).max(600).nullable(),
});

export async function finishWorkout(input: z.infer<typeof finishInput>): Promise<void> {
  const f = finishInput.parse(input);
  await requireClientAccess(f.clientId);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("workout_logs")
    .update({
      completed: f.completed,
      notes: f.notes,
      performed_on: f.date,
      session_rpe: f.sessionRpe,
      duration_seconds: f.durationMinutes != null ? f.durationMinutes * 60 : null,
    })
    .eq("id", f.workoutLogId);
  if (error) throw new Error(error.message);
  revalidate();
}

const wodInput = workoutRef.extend({
  timeSeconds: z.int().min(1).max(86400).nullable(),
  rounds: z.int().min(0).max(1000).nullable(),
  reps: z.int().min(0).max(10000).nullable(),
  weights: z.string().max(500),
  notes: z.string().max(2000),
  sessionRpe,
  durationMinutes: z.int().min(1).max(600).nullable(),
});

export async function saveWodResult(input: z.infer<typeof wodInput>): Promise<void> {
  const w = wodInput.parse(input);
  if (w.timeSeconds == null && w.rounds == null) throw new Error("Bitte Zeit oder Runden eintragen.");
  const id = await ensureWorkoutLog(w);
  const supabase = await createSupabaseServerClient();
  const result = w.timeSeconds != null ? { timeSeconds: w.timeSeconds } : { rounds: w.rounds ?? 0, reps: w.reps ?? 0 };
  const { error } = await supabase
    .from("workout_logs")
    .update({
      wod_result: result,
      wod_weights: w.weights,
      notes: w.notes,
      completed: true,
      performed_on: w.date,
      session_rpe: w.sessionRpe,
      duration_seconds: w.durationMinutes != null ? w.durationMinutes * 60 : null,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidate();
}

const blockResultInput = z.object({
  done: z.boolean(),
  values: z.array(z.number().min(0).max(1_000_000).nullable()).max(50),
  note: z.string().max(1000),
});

const programInput = workoutRef.extend({
  results: z.record(z.string().max(64), blockResultInput),
  notes: z.string().max(2000),
  sessionRpe,
  durationMinutes: z.int().min(1).max(600).nullable(),
});

/** Ergebnisse einer Programm-Einheit speichern; "erledigt" ergibt sich aus den Blöcken. */
export async function saveProgramResults(input: z.infer<typeof programInput>): Promise<{ completed: boolean }> {
  const p = programInput.parse(input);
  if (!p.planId || !p.sessionId) throw new Error("Programm-Einheiten gibt es nur in einem Plan.");
  await requireClientAccess(p.clientId);
  const supabase = await createSupabaseServerClient();
  const plan = await loadPlanWithVersion(supabase, p.planId);
  const item = plan && plan.plan.client_id === p.clientId ? findSession(plan.version.content, p.sessionId) : undefined;
  if (!item || item.session.type !== "program") throw new Error("Einheit nicht gefunden.");
  // Nur Blöcke der Einheit übernehmen, Anzahl der Werte an die Wertung anpassen.
  const results: BlockResults = {};
  for (const b of item.session.blocks) {
    const r = p.results[b.key];
    if (!r) continue;
    const n = valueCount(b.scoring);
    results[b.key] = { done: r.done, values: Array.from({ length: n }, (_, i) => r.values[i] ?? null), note: r.note.trim() };
  }
  const completed = isSessionComplete(item.session, results);
  const id = await ensureWorkoutLog({ ...p, kind: "program" });
  const { error } = await supabase
    .from("workout_logs")
    .update({
      block_results: results,
      notes: p.notes,
      completed,
      performed_on: p.date,
      session_rpe: p.sessionRpe,
      duration_seconds: p.durationMinutes != null ? p.durationMinutes * 60 : null,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidate();
  return { completed };
}

const enduranceInput = z.object({
  clientId: z.uuid(),
  logId: z.uuid().nullable(),
  planId: z.uuid().nullable(),
  planVersion: z.int().nullable(),
  sessionId: z.string().max(64).nullable(),
  date: isoDate,
  sport: z.enum(SPORTS),
  durationSeconds: z.int().min(1).max(86400 * 2),
  distanceM: z.number().min(0).max(2_000_000).nullable(),
  avgHr: z.int().min(20).max(250).nullable(),
  isTest: z.boolean(),
  notes: z.string().max(2000),
  title: z.string().max(200),
  sessionRpe,
});

/** Ausdauer von Hand eintragen (geplant oder ungeplant). */
export async function saveEnduranceLog(input: z.infer<typeof enduranceInput>): Promise<string> {
  const e = enduranceInput.parse(input);
  await requireClientAccess(e.clientId);
  const supabase = await createSupabaseServerClient();
  const values = {
    performed_on: e.date,
    sport: e.sport,
    duration_seconds: e.durationSeconds,
    distance_m: e.distanceM,
    avg_hr: e.avgHr,
    is_test: e.isTest,
    notes: e.notes,
    session_rpe: e.sessionRpe,
    completed: true,
  };
  let id = e.logId;
  if (!id) {
    id = await ensureWorkoutLog({
      clientId: e.clientId,
      planId: e.planId,
      planVersion: e.planVersion,
      sessionId: e.sessionId,
      kind: "endurance",
      date: e.date,
      title: e.title,
    });
  }
  const { error } = await supabase.from("workout_logs").update(values).eq("id", id).eq("source", "manual");
  if (error) throw new Error(error.message);
  revalidate();
  return id;
}

export async function deleteWorkoutLog(clientId: string, logId: string): Promise<void> {
  await requireClientAccess(z.uuid().parse(clientId));
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("workout_logs").delete().eq("id", z.uuid().parse(logId));
  if (error) throw new Error(error.message);
  revalidate();
}

export interface DeleteHistoryState {
  ok?: string;
  error?: string;
}

/** Trainingsverlauf löschen (nur Coach): alles oder Zeitraum, inkl. Strava-Einträge. Die Datenbankfunktion prüft die Rolle selbst. */
export async function deleteTrainingHistory(clientId: string, _prev: DeleteHistoryState, formData: FormData): Promise<DeleteHistoryState> {
  await requireCoach();
  if (formData.get("confirm") !== "ja") return { error: "Bitte das Löschen bestätigen." };
  const all = formData.get("scope") !== "range";
  const from = all ? null : String(formData.get("from") ?? "") || null;
  const to = all ? null : String(formData.get("to") ?? "") || null;
  if (!all && !from && !to) return { error: "Bitte einen Zeitraum angeben." };
  if ((from && !isoDate.safeParse(from).success) || (to && !isoDate.safeParse(to).success)) return { error: "Datum ungültig." };
  if (from && to && from > to) return { error: "„von“ liegt nach „bis“." };
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("delete_training_history", { cid: z.uuid().parse(clientId), p_from: from, p_to: to });
  if (error) return { error: error.message };
  revalidate();
  return { ok: `${data ?? 0} Einheit${data === 1 ? "" : "en"} gelöscht.` };
}
