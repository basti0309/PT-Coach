"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireClientAccess } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SPORTS } from "@/lib/calc/sport";

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
  kind: z.enum(["strength", "wod", "endurance"]),
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
