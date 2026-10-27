// Kraft-Verlauf je Übung: Volumen (Σ Gewicht × Wdh.) und geschätztes 1RM pro Einheit.
import { bestSet, type OneRmFormula } from "./one-rep-max";

export interface StrengthSetRecord {
  workoutLogId: string;
  performedOn: string;
  exerciseId: string;
  weightKg: number | null;
  reps: number | null;
  done: boolean;
}

export interface StrengthPoint {
  date: string;
  workoutLogId: string;
  volume: number;
  oneRm: number | null;
  bestWeightKg: number | null;
  bestReps: number | null;
  unreliable: boolean;
}

export function sessionVolume(sets: { weightKg: number | null; reps: number | null; done: boolean }[]): number {
  return sets.reduce((sum, s) => (s.done && s.weightKg != null && s.reps != null ? sum + s.weightKg * s.reps : sum), 0);
}

export function strengthSeries(records: StrengthSetRecord[], exerciseId: string, formula: OneRmFormula): StrengthPoint[] {
  const byLog = new Map<string, StrengthSetRecord[]>();
  for (const r of records) {
    if (r.exerciseId !== exerciseId || !r.done) continue;
    byLog.set(r.workoutLogId, [...(byLog.get(r.workoutLogId) ?? []), r]);
  }
  return [...byLog.entries()]
    .map(([logId, sets]) => {
      const best = bestSet(sets, formula);
      return {
        date: sets[0].performedOn,
        workoutLogId: logId,
        volume: sessionVolume(sets),
        oneRm: best ? Math.round(best.oneRm * 10) / 10 : null,
        bestWeightKg: best?.weightKg ?? null,
        bestReps: best?.reps ?? null,
        unreliable: best?.unreliable ?? false,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}
