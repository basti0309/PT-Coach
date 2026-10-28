// Einstufung des Trainingszustands nach McKay et al. (2022), Int J Sports Physiol Perform 17(2):317–331, Tabelle 1.
// Automatisch werden nur Tier 0–2 vergeben; ab Wettkampfniveau „national“ meldet die Funktion
// „Tier 3+ möglich“ – das Kriterium „innerhalb ~20 % der Weltbestleistung“ prüft der Coach.
import { formatNumber } from "@/lib/format";
import type { CompetitionLevel, WeekVolume } from "@/lib/questionnaire/schema";

/** WHO 2020 (Bull et al., BJSM 54:1451): 150 min moderat oder 75 min intensiv → 1 min intensiv zählt wie 2 min moderat. */
export const WHO_AEROBIC_MIN = 150;
export const WHO_STRENGTH_DAYS = 2;
/** McKay Tier 2: „Regularly training ∼3 times per week“ – als Mittel der letzten 4 Wochen ≥ 3 (Festlegung). */
export const TIER2_SESSIONS = 3;

export interface TierInput {
  volume: WeekVolume[];
  mainSport: string;
  competedLast12Months: boolean;
  /** geplanter Wettkampf in der Zukunft */
  plansCompetition: boolean;
  competitionLevel: CompetitionLevel;
}

export interface TierResult {
  tier: 0 | 1 | 2;
  tier3Possible: boolean;
  means: { sessions: number; aerobicEquivalentMin: number; strengthSessions: number; enduranceMinutes: number; runKm: number };
  steps: string[];
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export function weeklyMeans(volume: WeekVolume[]) {
  const sessions = mean(volume.map((w) => w.enduranceSessions + w.strengthSessions));
  const moderate = mean(volume.map((w) => w.enduranceMinutes - w.vigorousMinutes));
  const vigorous = mean(volume.map((w) => w.vigorousMinutes));
  return {
    sessions,
    moderate,
    vigorous,
    aerobicEquivalentMin: moderate + 2 * vigorous,
    strengthSessions: mean(volume.map((w) => w.strengthSessions)),
    enduranceSessions: mean(volume.map((w) => w.enduranceSessions)),
    enduranceMinutes: mean(volume.map((w) => w.enduranceMinutes)),
    runKm: mean(volume.map((w) => w.runKm)),
  };
}

export function classifyTier(input: TierInput): TierResult {
  const m = weeklyMeans(input.volume);
  const f = (n: number) => formatNumber(n, 1);
  const steps: string[] = [
    `Mittel der letzten ${input.volume.length} Wochen: ${f(m.sessions)} Einheiten/Woche (Ausdauer ${f(m.enduranceSessions)} + Kraft ${f(m.strengthSessions)})`,
    `Ausdauer-Äquivalent (WHO): moderat ${f(m.moderate)} min + 2 × intensiv ${f(m.vigorous)} min = ${f(m.aerobicEquivalentMin)} min`,
  ];
  const levelOk = input.competitionLevel !== "keins";
  const competes = input.competedLast12Months || input.plansCompetition;
  const sport = input.mainSport.trim() !== "";
  const tier2 = m.sessions >= TIER2_SESSIONS && sport && competes && levelOk;
  steps.push(
    `Tier 2 (Trained/Developmental): ≥ ${TIER2_SESSIONS} Einheiten/Woche ${m.sessions >= TIER2_SESSIONS ? "✓" : "✗"}, ` +
      `gezielte Sportart ${sport ? "✓" : "✗"}, Training mit Wettkampfziel ${competes ? "✓" : "✗"}, mindestens lokales Wettkampfniveau ${levelOk ? "✓" : "✗"}`,
  );
  const tier3Possible = tier2 && (input.competitionLevel === "national" || input.competitionLevel === "international");
  if (tier2) {
    if (tier3Possible) steps.push("Wettkampfniveau national/international: Tier 3+ möglich – der Coach prüft „innerhalb ~20 % der Weltbestleistung“.");
    steps.push("→ Tier 2");
    return { tier: 2, tier3Possible, means: m, steps };
  }
  const aerobic = m.aerobicEquivalentMin >= WHO_AEROBIC_MIN;
  const strength = m.strengthSessions >= WHO_STRENGTH_DAYS;
  steps.push(
    `Tier 1 (Recreationally Active, WHO-Mindestempfehlung): ≥ ${WHO_AEROBIC_MIN} min Ausdauer-Äquivalent ${aerobic ? "✓" : "✗"}, ` +
      `≥ ${WHO_STRENGTH_DAYS} Krafteinheiten/Woche ${strength ? "✓" : "✗"}`,
  );
  if (aerobic && strength) {
    steps.push("→ Tier 1");
    return { tier: 1, tier3Possible: false, means: m, steps };
  }
  steps.push("→ Tier 0 (Sedentary: WHO-Mindestempfehlung nicht erfüllt)");
  return { tier: 0, tier3Possible: false, means: m, steps };
}
