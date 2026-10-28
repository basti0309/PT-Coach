// Paces aus einer Referenzleistung: Wettkampf-Äquivalente nach Riegel (1981) und Trainings-Paces
// als Abstand zu diesen Paces, so wie ihn die drei HYROX-Vorlagen angeben (docs/VORLAGEN-ANALYSE.md).
import type { Sex } from "./calories";
import { riegel, riegelExponent, riegelExponentLabel, riegelInRange } from "./riegel";
import { formatDuration, formatNumber } from "@/lib/format";

export const MILE_M = 1609.344;
/** Sekunden pro Meile → Sekunden pro km */
export const PER_MILE_TO_PER_KM = 1000 / MILE_M;

export const RACE_DISTANCES = [
  { key: "mile", label: "1 Meile", meters: MILE_M },
  { key: "5k", label: "5 km", meters: 5000 },
  { key: "10k", label: "10 km", meters: 10000 },
  { key: "hm", label: "Halbmarathon", meters: 21097.5 },
  { key: "m", label: "Marathon", meters: 42195 },
] as const;
export type RaceKey = (typeof RACE_DISTANCES)[number]["key"];

/**
 * Abstände aus den Vorlagen in Sekunden pro Meile. Wo die Vorlage keine Einheit nennt (unitStated = false),
 * ist „pro Meile“ eine Annahme (die Vorlagen geben alle anderen Paces in Meilen an).
 */
export const TEMPLATE_OFFSETS = [
  {
    key: "locker_zeitlauf",
    label: "locker (2–3 min langsamer als die Pace der Referenzleistung)",
    base: "reference",
    minSec: 120,
    maxSec: 180,
    unitStated: false,
    source: "Base Builder Wo. 2–7: „Keep the pace 2-3 minutes above your time trial pace“",
  },
  {
    key: "locker_10k",
    label: "locker (3 min langsamer als 10-km-Pace)",
    base: "10k",
    minSec: 180,
    maxSec: 180,
    unitStated: false,
    source: "Tempo Runner Wo. 9–10: „3 minutes slower than 10k pace“",
  },
  {
    key: "tempo",
    label: "Tempolauf (60–90 s langsamer als 10-km-Pace)",
    base: "10k",
    minSec: 60,
    maxSec: 90,
    unitStated: false,
    source: "Tempo Runner Wo. 9–10: „60-90 seconds slower than 10k pace“",
  },
  {
    key: "in_out_langsam",
    label: "In and outs, langsame Meile (90–120 s langsamer als 10-km-Pace)",
    base: "10k",
    minSec: 90,
    maxSec: 120,
    unitStated: false,
    source: "Tempo Runner Wo. 5–7: „1 mile run at 90-120s slower than 10k pace“",
  },
  {
    key: "in_out_schnell",
    label: "In and outs, schnelle Meile (10-km-Pace)",
    base: "10k",
    minSec: 0,
    maxSec: 0,
    unitStated: true,
    source: "Tempo Runner Wo. 5–7: „1 mile run at 10k pace“",
  },
  {
    key: "speed_800",
    label: "800-m-Intervalle (5-km-Pace oder schneller)",
    base: "5k",
    minSec: 0,
    maxSec: 0,
    unitStated: true,
    source: "Tempo Runner Wo. 9–10: „800m run - hold 5k pace plus“",
  },
] as const;

export interface PaceReference {
  label: string;
  date: string;
  distanceM: number;
  seconds: number;
}

export interface RaceEquivalent {
  key: RaceKey;
  label: string;
  seconds: number;
  paceSecPerKm: number;
  inRange: boolean;
}

export interface TrainingPace {
  key: string;
  label: string;
  /** schnellere Grenze (s/km) */
  fastSecPerKm: number;
  /** langsamere Grenze (s/km) */
  slowSecPerKm: number;
  unitAssumed: boolean;
  source: string;
}

export interface PaceResult {
  exponent: number;
  races: RaceEquivalent[];
  training: TrainingPace[];
  hyroxRacePaceSecPerKm: number | null;
  steps: string[];
}

export const pacePerKm = (seconds: number, meters: number) => seconds / (meters / 1000);
export const formatPace = (secPerKm: number) => `${formatDuration(secPerKm)} min/km`;

export function derivePaces(ref: PaceReference, sex: Sex | null, age: number | null, hyroxRunSeconds: number | null = null): PaceResult {
  const b = riegelExponent(sex, age);
  const f5 = (n: number) => formatNumber(n, 5);
  const refPace = pacePerKm(ref.seconds, ref.distanceM);
  const steps: string[] = [
    `Referenz: ${ref.label} vom ${ref.date} – ${formatNumber(ref.distanceM / 1000, 3)} km in ${formatDuration(ref.seconds)} (${formatPace(refPace)})`,
    `Riegel 1981, Tabelle 1 (${riegelExponentLabel(sex, age)}): T2 = T1 · (D2/D1)^${f5(b)}`,
  ];
  if (!riegelInRange(ref.distanceM, ref.seconds)) steps.push("⚠ Referenz liegt außerhalb 1,5–42,2 km bzw. 3,5–230 min – alle Werte unsicher.");
  const races: RaceEquivalent[] = RACE_DISTANCES.map((d) => {
    const seconds = riegel(ref.seconds, ref.distanceM, d.meters, b);
    const inRange = riegelInRange(d.meters, seconds) && riegelInRange(ref.distanceM, ref.seconds);
    steps.push(
      `${d.label}: ${formatDuration(ref.seconds)} · (${formatNumber(d.meters, 1)} / ${formatNumber(ref.distanceM, 1)})^${f5(b)} = ${formatDuration(seconds)} ` +
        `→ ${formatPace(pacePerKm(seconds, d.meters))}${inRange ? "" : " ⚠ außerhalb des Gültigkeitsbereichs"}`,
    );
    return { key: d.key, label: d.label, seconds, paceSecPerKm: pacePerKm(seconds, d.meters), inRange };
  });
  const paceOf = (key: RaceKey) => races.find((r) => r.key === key)!.paceSecPerKm;
  const training: TrainingPace[] = TEMPLATE_OFFSETS.map((o) => {
    const basePace = o.base === "reference" ? refPace : paceOf(o.base);
    const fast = basePace + o.minSec * PER_MILE_TO_PER_KM;
    const slow = basePace + o.maxSec * PER_MILE_TO_PER_KM;
    steps.push(
      `${o.label}: ${formatPace(basePace)} + ${o.minSec === o.maxSec ? o.minSec : `${o.minSec}–${o.maxSec}`} s/Meile × 0,62137 ` +
        `= ${o.minSec === o.maxSec ? formatPace(fast) : `${formatPace(fast)} bis ${formatPace(slow)}`}${o.unitStated ? "" : " (Einheit „pro Meile“ angenommen)"}`,
    );
    return { key: o.key, label: o.label, fastSecPerKm: fast, slowSecPerKm: slow, unitAssumed: !o.unitStated, source: o.source };
  });
  let hyroxRacePaceSecPerKm: number | null = null;
  if (hyroxRunSeconds) {
    hyroxRacePaceSecPerKm = hyroxRunSeconds / 8;
    steps.push(`Hyrox-Renn-Pace: Laufzeit ${formatDuration(hyroxRunSeconds)} / 8 km = ${formatPace(hyroxRacePaceSecPerKm)}`);
  }
  return { exponent: b, races, training, hyroxRacePaceSecPerKm, steps };
}
