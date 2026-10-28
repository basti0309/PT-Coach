// Stationsgewichte nach dem offiziellen HYROX Rulebook 26/27 (Singles und Doubles, Stand 14.09.2026):
// maintain.hyrox.com/rulebooks/HYROX_RulebookSingles_EN.pdf, Kap. 4.1 und 8; …Doubles_EN.pdf, Kap. 4.1 und 8.
// Relay-Gewichte sind hier nicht hinterlegt.
import type { HyroxDivision } from "@/lib/questionnaire/schema";

export interface HyroxStandards {
  sledPushKg: number;
  sledPullKg: number;
  farmersKgEach: number;
  sandbagKg: number;
  wallBallKg: number;
  /** Zielhöhe Wall Ball; bei Mixed Doubles je Person */
  wallBallTargetM: number | "w 2,70 / m 3,00";
}

const WOMEN: HyroxStandards = { sledPushKg: 102, sledPullKg: 78, farmersKgEach: 16, sandbagKg: 10, wallBallKg: 4, wallBallTargetM: 2.7 };
const MID = { sledPushKg: 152, sledPullKg: 103, farmersKgEach: 24, sandbagKg: 20, wallBallKg: 6 };
const MEN_PRO: HyroxStandards = { sledPushKg: 202, sledPullKg: 153, farmersKgEach: 32, sandbagKg: 30, wallBallKg: 9, wallBallTargetM: 3 };

export const HYROX_STANDARDS: Record<HyroxDivision, HyroxStandards> = {
  women: WOMEN,
  women_pro: { ...MID, wallBallTargetM: 2.7 },
  men: { ...MID, wallBallTargetM: 3 },
  men_pro: MEN_PRO,
  doubles_women: WOMEN,
  doubles_women_pro: { ...MID, wallBallTargetM: 2.7 },
  doubles_men: { ...MID, wallBallTargetM: 3 },
  doubles_mixed: { ...MID, wallBallTargetM: "w 2,70 / m 3,00" },
  doubles_men_pro: MEN_PRO,
};

export const HYROX_DIVISION_LABELS: Record<HyroxDivision, string> = {
  women: "Women (Open)",
  women_pro: "Women Pro",
  men: "Men (Open)",
  men_pro: "Men Pro",
  doubles_women: "Doubles Women",
  doubles_women_pro: "Doubles Women Pro",
  doubles_men: "Doubles Men",
  doubles_men_pro: "Doubles Men Pro",
  doubles_mixed: "Doubles Mixed",
};

/** Feste Strecken/Wiederholungen (Rulebook Kap. 4.1): 8 × 1 km Laufen im Wechsel mit den Stationen. */
export const HYROX_FORMAT = {
  runKm: 8,
  skiErgM: 1000,
  sledPushM: 50,
  sledPullM: 50,
  burpeeBroadJumpM: 80,
  rowM: 1000,
  farmersCarryM: 200,
  sandbagLungeM: 100,
  wallBallReps: 100,
} as const;

/** Hyrox-Renn-Pace aus der Laufzeit laut Ergebnisliste: Sekunden je km = Laufzeit / 8. */
export function hyroxRunPace(runSeconds: number): number {
  return runSeconds / HYROX_FORMAT.runKm;
}
