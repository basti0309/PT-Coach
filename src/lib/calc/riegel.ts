// Zeitprognosen nach Riegel (1981): t = a·x^b, umgestellt T2 = T1 · (D2/D1)^b.
// Quelle: P. S. Riegel, Athletic Records and Human Endurance, American Scientist 69(3):285–290, Tabelle 1.

import type { Sex } from "./calories";

/** Laufen, Tabelle 1 (b = „fatigue factor“). Für Frauen nennt die Tabelle keine Altersklassen. */
export const RIEGEL_RUNNING = {
  men: 1.07732,
  menOver40: 1.05352,
  menOver50: 1.05374,
  menOver60: 1.05603,
  menOver70: 1.0637,
  women: 1.08283,
  /** Text S. 287: „World-class runners, men and women, have an identical fatigue factor of 1.08“ – genutzt, wenn das Geschlecht fehlt */
  unknownSex: 1.08,
} as const;

/** Gültigkeit laut Riegel: Ausdauerbereich ca. 3,5–230 min; Tabelle 1 Laufen: Distanzen 1,5–42,2 km. */
export const RIEGEL_MIN_SECONDS = 3.5 * 60;
export const RIEGEL_MAX_SECONDS = 230 * 60;
export const RIEGEL_MIN_METERS = 1500;
export const RIEGEL_MAX_METERS = 42200;

/** Tabelle 1, Spalte „Time range (min)“: Zeitspanne der Rekorde, aus denen b bestimmt wurde (obere Grenze). */
export function riegelDataMaxMinutes(sex: Sex | null, age: number | null): number | null {
  if (sex === "w") return 147;
  if (sex !== "m") return null;
  if (age == null || age < 40) return 129;
  if (age < 50) return 131;
  if (age < 60) return 145;
  if (age < 70) return 168;
  return 189;
}

export const TARGET_DISTANCES = [
  { key: "5k", label: "5 km", meters: 5000 },
  { key: "10k", label: "10 km", meters: 10000 },
  { key: "hm", label: "Halbmarathon", meters: 21097.5 },
  { key: "m", label: "Marathon", meters: 42195 },
] as const;

/** Exponent b aus Tabelle 1 nach Geschlecht und (nur Männer) Altersklasse. */
export function riegelExponent(sex: Sex | null, age: number | null): number {
  if (sex === "w") return RIEGEL_RUNNING.women;
  if (sex !== "m") return RIEGEL_RUNNING.unknownSex;
  if (age == null || age < 40) return RIEGEL_RUNNING.men;
  if (age < 50) return RIEGEL_RUNNING.menOver40;
  if (age < 60) return RIEGEL_RUNNING.menOver50;
  if (age < 70) return RIEGEL_RUNNING.menOver60;
  return RIEGEL_RUNNING.menOver70;
}

export function riegelExponentLabel(sex: Sex | null, age: number | null): string {
  if (sex === "w") return "Frauen";
  if (sex !== "m") return "Geschlecht unbekannt: Weltklasse-Wert 1,08";
  if (age == null || age < 40) return "Männer";
  return `Männer über ${Math.min(70, Math.floor(age / 10) * 10)}`;
}

export function riegel(t1Seconds: number, d1Meters: number, d2Meters: number, exponent: number): number {
  return t1Seconds * Math.pow(d2Meters / d1Meters, exponent);
}

/** Liegt eine Leistung im Gültigkeitsbereich der Formel? */
export function riegelInRange(meters: number, seconds: number): boolean {
  return (
    meters >= RIEGEL_MIN_METERS &&
    meters <= RIEGEL_MAX_METERS &&
    seconds >= RIEGEL_MIN_SECONDS &&
    seconds <= RIEGEL_MAX_SECONDS
  );
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
  /** Ziel mehr als doppelt so lang wie die Referenz oder außerhalb des Gültigkeitsbereichs → deutlich unsicherer */
  uncertain: boolean;
}

export function predictions(ref: { distanceM: number; timeSeconds: number }, exponent: number): Prediction[] {
  const refOk = riegelInRange(ref.distanceM, ref.timeSeconds);
  return TARGET_DISTANCES.map((t) => {
    const seconds = riegel(ref.timeSeconds, ref.distanceM, t.meters, exponent);
    return {
      key: t.key,
      label: t.label,
      meters: t.meters,
      seconds,
      uncertain: t.meters / ref.distanceM > 2 || !refOk || !riegelInRange(t.meters, seconds),
    };
  });
}
