// Geschätztes 1RM aus Gewicht und Wiederholungen.

export type OneRmFormula = "epley" | "brzycki";

/** Sätze mit mehr als 10 Wdh. gelten als weniger verlässlich. */
export const RELIABLE_MAX_REPS = 10;

/** Epley: w · (1 + r/30); bei 1 Wdh. = Gewicht */
export function epley(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  return reps === 1 ? weight : weight * (1 + reps / 30);
}

/** Brzycki: w · 36 / (37 − r); bei 1 Wdh. = Gewicht; ab 37 Wdh. nicht definiert */
export function brzycki(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0 || reps >= 37) return 0;
  return reps === 1 ? weight : (weight * 36) / (37 - reps);
}

export function estimateOneRm(weight: number, reps: number, formula: OneRmFormula): number {
  return formula === "epley" ? epley(weight, reps) : brzycki(weight, reps);
}

export interface SetLike {
  weightKg: number | null;
  reps: number | null;
}

export interface BestSet {
  weightKg: number;
  reps: number;
  oneRm: number;
  /** mehr als 10 Wdh. → weniger verlässlich */
  unreliable: boolean;
}

/** Bester Satz einer Einheit = höchstes geschätztes 1RM. */
export function bestSet(sets: SetLike[], formula: OneRmFormula): BestSet | null {
  let best: BestSet | null = null;
  for (const s of sets) {
    if (!s.weightKg || !s.reps) continue;
    const oneRm = estimateOneRm(s.weightKg, s.reps, formula);
    if (!best || oneRm > best.oneRm) {
      best = { weightKg: s.weightKg, reps: s.reps, oneRm, unreliable: s.reps > RELIABLE_MAX_REPS };
    }
  }
  return best;
}
