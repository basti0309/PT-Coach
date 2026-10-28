// Gesundheits-Screening: Ergebnis des offiziellen PAR-Q+ (eparmedx.com, nur verlinkt) und
// ACSM-Modell nach Riebe et al. (2015), Med Sci Sports Exerc 47(11):2473–2479.
// Ergebnis: ob eine Testwoche stattfinden darf und ob Maximaltests (hohe Intensität) erlaubt sind.
import type { Health } from "@/lib/questionnaire/schema";

/** PAR-Q+: „valid for a maximum of 12 months from the date it is completed“. Gleiche Frist für die ärztliche Freigabe (Riebe: „within the last 12 months“). */
export const SCREENING_VALID_MONTHS = 12;

export type ScreeningStatus = "ok" | "abklaerung_noetig" | "fehlt" | "abgelaufen" | "keine_einwilligung";

export interface ScreeningResult {
  status: ScreeningStatus;
  /** Testwoche überhaupt erlaubt (auch submaximal) */
  testWeekAllowed: boolean;
  /** hohe Intensität / Maximaltests erlaubt */
  maxTestsAllowed: boolean;
  steps: string[];
}

export function addMonths(date: string, months: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1 + months, d));
  return t.toISOString().slice(0, 10);
}

function validOn(date: string | undefined | null, today: string): boolean {
  return !!date && date <= today && addMonths(date, SCREENING_VALID_MONTHS) > today;
}

export function evaluateScreening(health: Health | null, hasConsent: boolean, today: string): ScreeningResult {
  if (!hasConsent) {
    return {
      status: "keine_einwilligung",
      testWeekAllowed: true,
      maxTestsAllowed: false,
      steps: ["Keine Einwilligung zur Verarbeitung von Gesundheitsdaten → kein Screening, nur submaximale Tests."],
    };
  }
  const steps: string[] = [];
  const parq = health?.parq ?? null;
  const acsm = health?.acsm ?? null;
  if (!parq || !acsm) {
    steps.push(`Fehlt: ${[!parq && "PAR-Q+-Ergebnis", !acsm && "ACSM-Fragen"].filter(Boolean).join(", ")} → nur submaximale Tests.`);
    return { status: "fehlt", testWeekAllowed: true, maxTestsAllowed: false, steps };
  }
  if (!validOn(parq.date, today)) {
    steps.push(`PAR-Q+ vom ${parq.date} ist älter als ${SCREENING_VALID_MONTHS} Monate (oder in der Zukunft) → neu ausfüllen; bis dahin nur submaximale Tests.`);
    return { status: "abgelaufen", testWeekAllowed: true, maxTestsAllowed: false, steps };
  }
  const cleared = validOn(health?.medicalClearance?.date, today);
  steps.push(
    `PAR-Q+ vom ${parq.date}: ${parq.result === "alle_nein" ? "alle Fragen mit Nein beantwortet" : "mindestens ein Ja"}; ` +
      `ärztliche Abklärung in den letzten ${SCREENING_VALID_MONTHS} Monaten: ${cleared ? `ja (${health!.medicalClearance!.date})` : "nein"}`,
  );
  if (parq.result === "mind_ein_ja" && !cleared) {
    steps.push("Mindestens ein Ja ohne ärztliche Abklärung → keine Testwoche, erst ärztlich abklären lassen.");
    return { status: "abklaerung_noetig", testWeekAllowed: false, maxTestsAllowed: false, steps };
  }

  const { regularlyActive, knownDisease, symptoms } = acsm;
  steps.push(
    `ACSM (Riebe 2015): regelmäßig aktiv ${regularlyActive ? "ja" : "nein"}, bekannte Herz-Kreislauf-/Stoffwechsel-/Nierenerkrankung ${knownDisease ? "ja" : "nein"}, Anzeichen/Symptome ${symptoms ? "ja" : "nein"}`,
  );
  if (symptoms && !cleared) {
    steps.push(
      regularlyActive
        ? "Aktiv mit Symptomen: „discontinue exercise and seek medical clearance before resuming exercise of any intensity“ → keine Testwoche."
        : "Inaktiv mit Symptomen: „should seek medical clearance before starting an exercise program, regardless of the intensity“ → keine Testwoche.",
    );
    return { status: "abklaerung_noetig", testWeekAllowed: false, maxTestsAllowed: false, steps };
  }
  if (knownDisease && !regularlyActive && !cleared) {
    steps.push("Inaktiv mit bekannter Erkrankung: ärztliche Freigabe vor jedem Trainingsbeginn → keine Testwoche.");
    return { status: "abklaerung_noetig", testWeekAllowed: false, maxTestsAllowed: false, steps };
  }
  if (knownDisease && regularlyActive && !cleared) {
    steps.push("Aktiv mit bekannter Erkrankung, ohne Symptome: leicht bis moderat ohne Freigabe, für hohe Intensität ärztliche Freigabe → nur submaximale Tests.");
    return { status: "abklaerung_noetig", testWeekAllowed: true, maxTestsAllowed: false, steps };
  }
  if (!regularlyActive) {
    steps.push(
      knownDisease || symptoms
        ? "Inaktiv, ärztlich freigegeben: Beginn leicht bis moderat, hohe Intensität erst nach schrittweiser Steigerung → nur submaximale Tests."
        : "Inaktiv, gesund: „may begin light- to moderate-intensity exercise without medical clearance“, hohe Intensität erst nach schrittweiser Steigerung → nur submaximale Tests.",
    );
    return { status: "ok", testWeekAllowed: true, maxTestsAllowed: false, steps };
  }
  steps.push(
    cleared && (knownDisease || symptoms)
      ? "Ärztliche Freigabe liegt vor → Maximaltests erlaubt (sofern die Freigabe hohe Intensität umfasst – Coach prüft)."
      : "Aktiv, gesund: „may continue their usual exercise and progress gradually“ → Maximaltests erlaubt.",
  );
  return { status: "ok", testWeekAllowed: true, maxTestsAllowed: true, steps };
}
