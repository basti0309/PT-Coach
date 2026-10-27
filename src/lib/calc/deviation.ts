// Abweichung Ist zu Plan (Dauer, Distanz): absolut und in Prozent vom Soll.

export interface DeviationValue {
  planned: number;
  actual: number;
  /** Ist − Soll (Sekunden bzw. Meter) */
  abs: number;
  /** (Ist − Soll) / Soll · 100, auf 1 Nachkommastelle gerundet */
  pct: number;
}

export interface Deviation {
  duration?: DeviationValue;
  distance?: DeviationValue;
}

function dev(planned: number | null | undefined, actual: number | null | undefined): DeviationValue | undefined {
  if (planned == null || actual == null || planned <= 0) return undefined;
  const abs = actual - planned;
  return { planned, actual, abs, pct: Math.round((abs / planned) * 1000) / 10 };
}

export function planDeviation(
  planned: { durationSeconds?: number | null; distanceM?: number | null },
  actual: { durationSeconds?: number | null; distanceM?: number | null },
): Deviation {
  const result: Deviation = {};
  const d = dev(planned.durationSeconds, actual.durationSeconds);
  if (d) result.duration = d;
  const m = dev(planned.distanceM, actual.distanceM);
  if (m) result.distance = m;
  return result;
}

/** Sollwerte einer geplanten Ausdauereinheit in Sekunden/Metern. */
export function plannedTargets(s: { durationMinutes?: number; distanceKm?: number }) {
  return {
    durationSeconds: s.durationMinutes != null ? Math.round(s.durationMinutes * 60) : null,
    distanceM: s.distanceKm != null ? Math.round(s.distanceKm * 1000) : null,
  };
}
