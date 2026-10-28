// Trainingsverlauf für den Export (optional, Standard: aus). Strava-Einheiten nur mit Datum, Sportart,
// Dauer und Erledigt-Status – Strava-Werte (Distanz, Puls, Abweichungen) kommen nie in den Export (CLAUDE.md).
import type { BlockResults } from "@/lib/calc/blocks";
import type { SetLogRow, WodResult, WorkoutKind, WorkoutLogRow } from "@/lib/db-types";

export interface HistoryExportEntry {
  date: string;
  kind: WorkoutKind;
  source: "manual" | "strava";
  title: string;
  completed: boolean;
  sport?: string;
  durationMinutes?: number;
  distanceKm?: number;
  avgHr?: number;
  isTest?: boolean;
  /** Kraft: abgehakte Sätze je Übung */
  sets?: { exercise: string; set: number; weightKg: number | null; reps: number | null }[];
  wodResult?: WodResult;
  wodWeights?: string;
  blockResults?: BlockResults;
  /** Session-RPE (CR-10) und Last = RPE × Minuten */
  sessionRpe?: number;
  load?: number;
  notes?: string;
}

export type HistoryLog = Pick<
  WorkoutLogRow,
  | "id"
  | "kind"
  | "performed_on"
  | "title"
  | "source"
  | "completed"
  | "sport"
  | "duration_seconds"
  | "distance_m"
  | "avg_hr"
  | "is_test"
  | "wod_result"
  | "wod_weights"
  | "block_results"
  | "session_rpe"
  | "notes"
>;
export type HistorySet = Pick<SetLogRow, "workout_log_id" | "exercise_id" | "exercise_name" | "set_no" | "weight_kg" | "reps" | "done">;

const round1 = (n: number) => Math.round(n * 10) / 10;

export function buildHistoryExport(logs: HistoryLog[], sets: HistorySet[]): HistoryExportEntry[] {
  const setsBy = new Map<string, HistorySet[]>();
  for (const s of sets) if (s.done) setsBy.set(s.workout_log_id, [...(setsBy.get(s.workout_log_id) ?? []), s]);
  return [...logs]
    .sort((a, b) => a.performed_on.localeCompare(b.performed_on))
    .map((l) => {
      const minutes = l.duration_seconds != null ? round1(l.duration_seconds / 60) : undefined;
      const e: HistoryExportEntry = { date: l.performed_on, kind: l.kind, source: l.source, title: l.title, completed: l.completed };
      if (l.sport) e.sport = l.sport;
      if (minutes != null) e.durationMinutes = minutes;
      if (l.source === "strava") return e; // nur Datum, Sportart, Dauer, Erledigt
      if (l.distance_m != null) e.distanceKm = round1(l.distance_m / 100) / 10;
      if (l.avg_hr != null) e.avgHr = l.avg_hr;
      if (l.is_test) e.isTest = true;
      const s = (setsBy.get(l.id) ?? []).sort((a, b) => a.exercise_id.localeCompare(b.exercise_id) || a.set_no - b.set_no);
      if (s.length) e.sets = s.map((x) => ({ exercise: x.exercise_name || x.exercise_id, set: x.set_no, weightKg: x.weight_kg, reps: x.reps }));
      if (l.wod_result) e.wodResult = l.wod_result;
      if (l.wod_weights) e.wodWeights = l.wod_weights;
      if (l.block_results && Object.keys(l.block_results).length) e.blockResults = l.block_results;
      if (l.session_rpe != null) {
        e.sessionRpe = l.session_rpe;
        if (minutes != null) e.load = Math.round(minutes * l.session_rpe);
      }
      if (l.notes) e.notes = l.notes;
      return e;
    });
}
