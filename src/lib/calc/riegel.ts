// Zeitprognosen nach Riegel: T2 = T1 · (D2/D1)^1,06

export const RIEGEL_EXPONENT = 1.06;

export const TARGET_DISTANCES = [
  { key: "5k", label: "5 km", meters: 5000 },
  { key: "10k", label: "10 km", meters: 10000 },
  { key: "hm", label: "Halbmarathon", meters: 21097.5 },
  { key: "m", label: "Marathon", meters: 42195 },
] as const;

export function riegel(t1Seconds: number, d1Meters: number, d2Meters: number): number {
  return t1Seconds * Math.pow(d2Meters / d1Meters, RIEGEL_EXPONENT);
}

export interface ReferenceCandidate {
  date: string;
  distanceM: number;
  timeSeconds: number;
  source: "test" | "manuell" | "strava";
  label: string;
}

/** Jüngste Referenzleistung (bei gleichem Datum: Reihenfolge der Eingabe). */
export function pickReference(candidates: ReferenceCandidate[]): ReferenceCandidate | null {
  const valid = candidates.filter((c) => c.distanceM > 0 && c.timeSeconds > 0);
  if (valid.length === 0) return null;
  return valid.reduce((best, c) => (c.date > best.date ? c : best));
}

export interface Prediction {
  key: string;
  label: string;
  meters: number;
  seconds: number;
  /** Ziel mehr als doppelt so lang wie die Referenz → deutlich unsicherer */
  uncertain: boolean;
}

export function predictions(ref: { distanceM: number; timeSeconds: number }): Prediction[] {
  return TARGET_DISTANCES.map((t) => ({
    key: t.key,
    label: t.label,
    meters: t.meters,
    seconds: riegel(ref.timeSeconds, ref.distanceM, t.meters),
    uncertain: t.meters / ref.distanceM > 2,
  }));
}
