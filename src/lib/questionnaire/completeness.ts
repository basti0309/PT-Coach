// Pflichtangaben je Ziel. Ergebnis: Liste fehlender Angaben (leer = vollständig).
// Kein Sperren der App – der Kunde sieht einen Hinweis, der Coach den Status (siehe docs/FRAGEBOGEN.md).
import type { TestKind } from "@/lib/plan/test-kinds";
import type { Answers, Health } from "./schema";

export interface CompletenessInput {
  sex: string | null;
  birthDate: string | null;
  heightCm: number | null;
  gymAccess: boolean | null;
  trainingDaysPerWeek: number | null;
  maxMinutesPerWorkout: number | null;
  testKinds: TestKind[];
  answers: Answers | null;
  hasConsent: boolean;
  health: Health | null;
}

export function missingAnswers(i: CompletenessInput): string[] {
  const a = i.answers ?? {};
  const miss: string[] = [];
  const need = (ok: unknown, label: string) => {
    if (ok === undefined || ok === null || ok === "" || (Array.isArray(ok) && ok.length === 0)) miss.push(label);
  };
  // Stammdaten
  need(i.sex, "Geschlecht");
  need(i.birthDate, "Geburtsdatum");
  need(i.heightCm, "Größe");
  need(i.testKinds.includes("body_weight") || null, "Körpergewicht (Testwert)");
  need(i.gymAccess, "Gym-Zugang");
  need(i.trainingDaysPerWeek, "Trainingstage pro Woche");
  need(i.maxMinutesPerWorkout, "maximale Zeit pro Einheit");
  // alle Ziele
  need(a.goal, "Ziel");
  need(a.weekdays, "mögliche Wochentage");
  need(a.workActivity, "Beruf/Alltagsaktivität");
  need(a.sportOften, "Sport 4–5× pro Woche (ja/nein)");
  need(a.volume, "Trainingsumfang der letzten 4 Wochen");
  need(a.competedLast12Months, "Wettkampf in den letzten 12 Monaten (ja/nein)");
  need(a.competitionLevel, "Wettkampfniveau");
  // Zweige
  const g = a.goal;
  if (g === "hyrox") need(a.hyrox, "Hyrox: Division");
  if (g === "laufen") {
    need(a.laufen?.bests, "Laufen: mindestens eine Bestzeit");
    need(a.laufen?.longestRunMinutes, "Laufen: längster Lauf der letzten 4 Wochen");
  }
  if (g === "kraft_muskelaufbau" || ((g === "hyrox" || g === "laufen") && i.gymAccess)) {
    need(a.liftExperienceMonths, "Erfahrung je Übung (Monate)");
  }
  if (g === "abnehmen" || g === "kraft_muskelaufbau") need(a.diet, "Ernährungsweise");
  if (g === "abnehmen" || g === "fitness_gesundheit") need(a.enduranceSports, "bevorzugte Ausdauersportarten");
  // Gesundheit: Die Einwilligung ist freiwillig (Art. 7 Abs. 4 DSGVO) und fehlt deshalb nie; nur mit ihr wird nach Schlaf gefragt.
  if (i.hasConsent) need(i.health?.sleepHours, "Schlaf (Stunden pro Nacht)");
  return miss;
}
