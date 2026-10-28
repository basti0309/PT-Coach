// Programm-Einheiten: Eingabe, Anzeige und Erledigt-Status der Blockergebnisse.
import type { BlockLoad, BlockScoring, ProgramSession, ScoringType } from "@/lib/plan/schema";
import { formatDuration, formatNumber, parseDecimal, parseDuration } from "@/lib/format";

/** Ergebnis eines Blocks. Werte: Zeit in s, Distanz in m, Gewicht in kg, sonst ganze Zahlen. */
export interface BlockResult {
  done: boolean;
  values: (number | null)[];
  note: string;
}

export type BlockResults = Record<string, BlockResult>;

export const SCORING_LABELS: Record<ScoringType, string> = {
  checkmark: "Abhaken",
  none: "Keine Wertung",
  time: "Zeit",
  distance: "Distanz",
  weight: "Gewicht",
  reps: "Wiederholungen",
  rounds: "Runden",
  calories: "Kalorien",
};

/** Einheit des Eingabefelds (für die Beschriftung). */
export const SCORING_INPUT_UNIT: Partial<Record<ScoringType, string>> = {
  time: "mm:ss",
  distance: "km",
  weight: "kg",
  reps: "Wdh.",
  rounds: "Runden",
  calories: "kcal",
};

/** Hat die Wertung ein Eingabefeld (sonst nur Häkchen bzw. gar nichts)? */
export function scoringHasValue(type: ScoringType): boolean {
  return type !== "checkmark" && type !== "none";
}

/** Anzahl der Eingabefelder: je Runde ein Wert bei "N rounds for …", sonst einer. */
export function valueCount(scoring: BlockScoring): number {
  return scoringHasValue(scoring.type) ? (scoring.rounds ?? 1) : 0;
}

/** "3 Runden · Gewicht" bzw. "Zeit" */
export function describeScoring(scoring: BlockScoring): string {
  const label = SCORING_LABELS[scoring.type];
  return scoring.rounds && scoring.rounds > 1 ? `${scoring.rounds} Runden · ${label}` : label;
}

export type ParsedValue = { ok: true; value: number | null } | { ok: false; error: string };

/** Eingabe eines Feldes → gespeicherter Wert. Leer ist erlaubt (null). */
export function parseBlockValue(type: ScoringType, raw: string): ParsedValue {
  const t = raw.trim();
  if (!t) return { ok: true, value: null };
  switch (type) {
    case "time": {
      const s = parseDuration(t);
      return s === null ? { ok: false, error: "Zeit bitte als mm:ss oder h:mm:ss eingeben (z. B. 2:45)." } : { ok: true, value: s };
    }
    case "distance": {
      const km = parseDecimal(t);
      if (km === null || km < 0 || km > 1000) return { ok: false, error: "Distanz bitte in km eingeben (z. B. 5,2)." };
      return { ok: true, value: Math.round(km * 1000) };
    }
    case "weight": {
      const kg = parseDecimal(t);
      if (kg === null || kg < 0 || kg > 1000) return { ok: false, error: "Gewicht bitte in kg eingeben (z. B. 62,5)." };
      return { ok: true, value: kg };
    }
    case "reps":
    case "rounds":
    case "calories": {
      if (!/^\d+$/.test(t) || Number(t) > 100000) return { ok: false, error: "Bitte eine ganze Zahl eingeben." };
      return { ok: true, value: Number(t) };
    }
    default:
      return { ok: true, value: null };
  }
}

/** Gespeicherter Wert → Text für das Eingabefeld bzw. die Anzeige. */
export function formatBlockValue(type: ScoringType, value: number | null): string {
  if (value === null) return "";
  switch (type) {
    case "time":
      return formatDuration(value);
    case "distance":
      return formatNumber(value / 1000, 2);
    case "weight":
      return formatNumber(value, 2);
    default:
      return String(value);
  }
}

/** Kurzfassung eines Blockergebnisses, z. B. "Zeit 2:45" oder "Gewicht 60 / 62,5 / 65 kg". */
export function blockResultSummary(scoring: BlockScoring, result: BlockResult | undefined): string {
  if (!result) return "–";
  const values = result.values.filter((v): v is number => v !== null);
  if (!scoringHasValue(scoring.type) || values.length === 0) return result.done ? "✓" : "–";
  const shown = values.map((v) => formatBlockValue(scoring.type, v));
  const unit = scoring.type === "distance" ? " km" : scoring.type === "weight" ? " kg" : scoring.type === "calories" ? " kcal" : "";
  return `${SCORING_LABELS[scoring.type]} ${shown.join(" / ")}${unit}`;
}

/** Einheit erledigt, wenn jeder Block mit Wertung (alles außer "none") abgehakt ist. */
export function isSessionComplete(session: ProgramSession, results: BlockResults): boolean {
  const relevant = session.blocks.filter((b) => b.scoring.type !== "none");
  if (relevant.length === 0) return Object.values(results).some((r) => r.done);
  return relevant.every((b) => results[b.key]?.done === true);
}

/** Vorgabe-Gewicht passend zum Geschlecht; ohne Geschlecht beide Angaben. */
export function loadForSex(load: BlockLoad, sex: "m" | "w" | null): string {
  const kg = (v: number) => `${formatNumber(v)} kg`;
  if (load.kg !== undefined && load.maleKg === undefined && load.femaleKg === undefined) return kg(load.kg);
  if (sex === "m" && load.maleKg !== undefined) return kg(load.maleKg);
  if (sex === "w" && load.femaleKg !== undefined) return kg(load.femaleKg);
  const parts: string[] = [];
  if (load.maleKg !== undefined) parts.push(`Männer ${kg(load.maleKg)}`);
  if (load.femaleKg !== undefined) parts.push(`Frauen ${kg(load.femaleKg)}`);
  if (load.kg !== undefined) parts.push(kg(load.kg));
  return parts.join(" · ");
}

/** Pfund → kg, gerundet auf 0,1 kg (1 lb = 0,45359237 kg). */
export function lbToKg(lb: number): number {
  return Math.round(lb * 0.45359237 * 10) / 10;
}
