// Profil-Export (JSON für die KI-Planerstellung). Enthält nur manuell eingetragene
// Werte – niemals Strava-Daten. Im Plan-Export und im Profil-Export identisch.
import { ageOn, calorieNeed } from "@/lib/calc/calories";
import { weeklyLoads, type RpeSession, type WeekLoad } from "@/lib/calc/session-load";
import type { ClientHealthRow, ClientProfileRow, ProfileRow, QuestionnaireRow, TestKind, TestResultRow } from "@/lib/db-types";
import { addDays, formatDuration } from "@/lib/format";
import { deriveAll, type Derived } from "@/lib/plan/derive";
import type { PlanContent } from "@/lib/plan/schema";
import { TEST_KIND_META, type TestUnit } from "@/lib/plan/test-kinds";
import { missingAnswers } from "@/lib/questionnaire/completeness";
import type { Answers, Goal, Health } from "@/lib/questionnaire/schema";
import type { HistoryExportEntry } from "./history";

export const TEST_KIND_LABELS: Record<TestKind, string> = Object.fromEntries(
  Object.entries(TEST_KIND_META).map(([k, v]) => [k, v.label]),
) as Record<TestKind, string>;

export interface TestExport {
  test: TestKind;
  label: string;
  date: string;
  value?: number;
  unit?: TestUnit;
  display?: string;
  reps?: number;
  rir?: number;
  scale?: number;
  note?: string;
}

/** Zusatzdaten aus Fragebogen, Gesundheit und Session-RPE */
export interface ProfileExtras {
  questionnaire: QuestionnaireRow | null;
  /** nur bei aktiver Einwilligung geladen (RLS) */
  health: ClientHealthRow | null;
  hasConsent: boolean;
  /** manuelle Einheiten mit Session-RPE */
  rpeSessions: RpeSession[];
  /** Chat-Kontext: keine Gesundheitsdaten und keine abgeleiteten Werte */
  forChat?: boolean;
}

export const NO_EXTRAS: ProfileExtras = { questionnaire: null, health: null, hasConsent: false, rpeSessions: [] };

export const CALORIE_GOALS: Goal[] = ["abnehmen", "kraft_muskelaufbau"];

export interface ProfileExport {
  label: string;
  pseudonymized: boolean;
  sex: "m" | "w" | null;
  /** aus dem Geburtsdatum berechnet; das Geburtsdatum selbst wird nicht exportiert */
  age: number | null;
  heightCm: number | null;
  currentWeightKg: number | null;
  equipmentHome: string;
  gymAccess: boolean | null;
  trainingDaysPerWeek: number | null;
  maxMinutesPerWorkout: number | null;
  notes: string;
  palFactor: number;
  nutritionTargets: { proteinG: number | null; fatG: number | null; carbsG: number | null };
  /** nur bei Ziel Abnehmen oder Kraft/Muskelaufbau (Regel R10) */
  calorieNeed: { bmrKcal: number; totalKcal: number; formula: string } | null;
  tests: TestExport[];
  goal: Goal | null;
  /** Ziel in eigenen Worten (Freitext aus dem Fragebogen) */
  goalNote: string;
  /** Antworten aus dem Fragebogen (ohne Gesundheitsangaben) */
  questionnaire: Answers | null;
  /** fehlende Pflichtangaben */
  missing: string[];
  /** Gesundheitsangaben nur mit Einwilligung (Art. 9 DSGVO) */
  healthStatus: "einwilligung" | "keine_einwilligung" | "ausgeblendet";
  health: Health | null;
  /** von der App berechnete Werte mit Regel-ID und Rechenweg (docs/REGELWERK.md) */
  derived: Derived | null;
  /** Session-RPE der letzten 4 Wochen (Regel R12), nur manuell erfasste Einheiten */
  trainingLoad: { rule: "R12"; weeks: WeekLoad[] };
}

export interface ExportFile {
  format: "pt-coach-export";
  exportVersion: 2;
  exportedAt: string;
  pseudonymized: boolean;
  client: ProfileExport;
  /** Trainingsverlauf, nur wenn beim Export gewählt */
  history?: HistoryExportEntry[];
  plan: PlanContent | null;
}

export function latestTest(tests: TestResultRow[], kind: TestKind): TestResultRow | undefined {
  return tests
    .filter((t) => t.kind === kind)
    .sort((a, b) => b.tested_on.localeCompare(a.tested_on) || b.created_at.localeCompare(a.created_at))[0];
}

export function buildProfileExport(
  profile: Pick<ProfileRow, "full_name" | "short_code">,
  cp: ClientProfileRow | null,
  tests: TestResultRow[],
  pseudonymized: boolean,
  today: string,
  extras: ProfileExtras = NO_EXTRAS,
): ProfileExport {
  const age = cp?.birth_date ? ageOn(cp.birth_date, today) : null;
  const weight = latestTest(tests, "body_weight")?.value ?? null;
  const pal = cp?.pal_factor ?? 1.5;
  const answers = extras.questionnaire?.answers ?? null;
  const goal = answers?.goal ?? null;
  const healthData = extras.hasConsent ? (extras.health?.data ?? null) : null;
  const calories =
    goal && CALORIE_GOALS.includes(goal) && cp?.sex && age && cp.height_cm && weight
      ? calorieNeed({ sex: cp.sex, weightKg: weight, heightCm: cp.height_cm, age, pal })
      : null;
  const missing = missingAnswers({
    sex: cp?.sex ?? null,
    birthDate: cp?.birth_date ?? null,
    heightCm: cp?.height_cm ?? null,
    gymAccess: cp?.gym_access ?? null,
    trainingDaysPerWeek: cp?.training_days_per_week ?? null,
    maxMinutesPerWorkout: cp?.max_minutes_per_workout ?? null,
    testKinds: tests.map((t) => t.kind),
    answers,
    hasConsent: extras.hasConsent,
    health: healthData,
  });
  const derived = extras.forChat
    ? null
    : deriveAll({
        sex: cp?.sex ?? null,
        birthDate: cp?.birth_date ?? null,
        heightCm: cp?.height_cm ?? null,
        weightKg: weight,
        gymAccess: cp?.gym_access ?? null,
        trainingDaysPerWeek: cp?.training_days_per_week ?? null,
        maxMinutesPerWorkout: cp?.max_minutes_per_workout ?? null,
        palFactor: pal,
        answers,
        health: healthData,
        tests: tests.map((t) => ({ kind: t.kind, date: t.tested_on, value: t.value, reps: t.reps ?? null, rir: t.rir ?? null })),
        today,
      });
  const since = addDays(today, -27);
  return {
    label: pseudonymized ? (profile.short_code ?? "Kunde") : profile.full_name,
    pseudonymized,
    sex: cp?.sex ?? null,
    age,
    heightCm: cp?.height_cm ?? null,
    currentWeightKg: weight,
    equipmentHome: cp?.equipment_home ?? "",
    gymAccess: cp?.gym_access ?? null,
    trainingDaysPerWeek: cp?.training_days_per_week ?? null,
    maxMinutesPerWorkout: cp?.max_minutes_per_workout ?? null,
    notes: cp?.notes ?? "",
    palFactor: pal,
    nutritionTargets: { proteinG: cp?.protein_g ?? null, fatG: cp?.fat_g ?? null, carbsG: cp?.carbs_g ?? null },
    calorieNeed: calories
      ? {
          bmrKcal: Math.round(calories.bmr),
          totalKcal: Math.round(calories.total),
          formula: "Mifflin-St Jeor × PAL",
        }
      : null,
    tests: [...tests]
      .sort((a, b) => a.kind.localeCompare(b.kind) || a.tested_on.localeCompare(b.tested_on))
      .map((t) => {
        const e: TestExport = { test: t.kind, label: TEST_KIND_LABELS[t.kind], date: t.tested_on };
        const unit = TEST_KIND_META[t.kind].unit;
        if (t.value != null && unit) {
          e.value = t.value;
          e.unit = unit;
          if (unit === "s") e.display = formatDuration(t.value);
        }
        if (t.reps != null) e.reps = t.reps;
        if (t.rir != null) e.rir = t.rir;
        if (t.scale != null) e.scale = t.scale;
        if (t.note) e.note = t.note;
        return e;
      }),
    goal,
    goalNote: answers?.goalNote ?? "",
    questionnaire: answers,
    // Chat: Einwilligung ist dort bewusst ausgeblendet – Fehlliste wäre irreführend
    missing: extras.forChat ? [] : missing,
    healthStatus: extras.forChat ? "ausgeblendet" : extras.hasConsent ? "einwilligung" : "keine_einwilligung",
    health: extras.forChat ? null : healthData,
    derived,
    trainingLoad: { rule: "R12", weeks: weeklyLoads(extras.rpeSessions.filter((r) => r.date >= since && r.date <= today)) },
  };
}

export function buildExportFile(
  client: ProfileExport,
  plan: PlanContent | null,
  now: Date = new Date(),
  history?: HistoryExportEntry[],
): ExportFile {
  return {
    format: "pt-coach-export",
    exportVersion: 2,
    exportedAt: now.toISOString(),
    pseudonymized: client.pseudonymized,
    client,
    ...(history ? { history } : {}),
    plan,
  };
}

export function exportFileName(file: ExportFile, kind: "plan" | "profil" | "vorlage" | "export"): string {
  const safe = file.client.label.replace(/[^A-Za-z0-9_-]+/g, "-").replace(/^-|-$/g, "") || "kunde";
  return `pt-coach-${kind}-${safe}-${file.exportedAt.slice(0, 10)}.json`;
}
