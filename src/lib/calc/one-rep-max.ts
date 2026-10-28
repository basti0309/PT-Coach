// Geschätztes 1RM aus Gewicht und Wiederholungen.
// Brzycki (1993), JOPERD 64(1):88–90: „only valid … when the number of reps-to-fatigue is less than 10“.

export type OneRmFormula = "epley" | "brzycki";

/** Ab dieser Wiederholungszahl ist die Schätzung laut Brzycki nicht mehr gültig (gültig nur bei weniger als 10). */
export const UNRELIABLE_FROM_REPS = 10;

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
  /** 10 oder mehr Wdh. → weniger verlässlich */
  unreliable: boolean;
}

/** Bester Satz einer Einheit = höchstes geschätztes 1RM. */
export function bestSet(sets: SetLike[], formula: OneRmFormula): BestSet | null {
  let best: BestSet | null = null;
  for (const s of sets) {
    if (!s.weightKg || !s.reps) continue;
    const oneRm = estimateOneRm(s.weightKg, s.reps, formula);
    if (!best || oneRm > best.oneRm) {
      best = { weightKg: s.weightKg, reps: s.reps, oneRm, unreliable: s.reps >= UNRELIABLE_FROM_REPS };
    }
  }
  return best;
}

/**
 * Brzycki umgestellt: Last für n Wiederholungen bis zur Erschöpfung = 1RM · (37 − n) / 36.
 * Nur für n < 10 (Gültigkeitsbereich der Formel), sonst null.
 */
export function brzyckiLoadForReps(oneRm: number, reps: number): number | null {
  if (oneRm <= 0 || reps < 1 || reps >= UNRELIABLE_FROM_REPS) return null;
  return (oneRm * (37 - reps)) / 36;
}

/** Auf ein Vielfaches von step runden (Standard 2,5 kg, kleinste übliche Scheibenpaar-Stufe). */
export function roundToStep(kg: number, step = 2.5): number {
  return Math.round(kg / step) * step;
}
