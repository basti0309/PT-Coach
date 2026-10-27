// Profil-Export (JSON für die KI-Planerstellung). Enthält nur manuell eingetragene
// Werte – niemals Strava-Daten. Im Plan-Export und im Profil-Export identisch.
import { ageOn, calorieNeed } from "@/lib/calc/calories";
import type { ClientProfileRow, ProfileRow, TestKind, TestResultRow } from "@/lib/db-types";
import { formatDuration } from "@/lib/format";
import type { PlanContent } from "@/lib/plan/schema";

export const TEST_KIND_LABELS: Record<TestKind, string> = {
  run_5k: "5-km-Testzeit",
  bench_3rm: "3RM Bankdrücken",
  deadlift_3rm: "3RM Kreuzheben",
  squat_3rm: "3RM Kniebeuge",
  mobility: "Mobility",
  body_weight: "Körpergewicht",
};

export interface TestExport {
  test: TestKind;
  label: string;
  date: string;
  value?: number;
  unit?: "s" | "kg";
  display?: string;
  scale?: number;
  note?: string;
}

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
  calorieNeed: { bmrKcal: number; totalKcal: number; formula: string } | null;
  tests: TestExport[];
}

export interface ExportFile {
  format: "pt-coach-export";
  exportVersion: 1;
  exportedAt: string;
  pseudonymized: boolean;
  client: ProfileExport;
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
): ProfileExport {
  const age = cp?.birth_date ? ageOn(cp.birth_date, today) : null;
  const weight = latestTest(tests, "body_weight")?.value ?? null;
  const pal = cp?.pal_factor ?? 1.5;
  const calories =
    cp?.sex && age && cp.height_cm && weight
      ? calorieNeed({ sex: cp.sex, weightKg: weight, heightCm: cp.height_cm, age, pal })
      : null;
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
        if (t.value != null) {
          e.value = t.value;
          e.unit = t.kind === "run_5k" ? "s" : "kg";
          if (t.kind === "run_5k") e.display = formatDuration(t.value);
        }
        if (t.scale != null) e.scale = t.scale;
        if (t.note) e.note = t.note;
        return e;
      }),
  };
}

export function buildExportFile(client: ProfileExport, plan: PlanContent | null, now: Date = new Date()): ExportFile {
  return {
    format: "pt-coach-export",
    exportVersion: 1,
    exportedAt: now.toISOString(),
    pseudonymized: client.pseudonymized,
    client,
    plan,
  };
}

export function exportFileName(file: ExportFile, kind: "plan" | "profil" | "vorlage"): string {
  const safe = file.client.label.replace(/[^A-Za-z0-9_-]+/g, "-").replace(/^-|-$/g, "") || "kunde";
  return `pt-coach-${kind}-${safe}-${file.exportedAt.slice(0, 10)}.json`;
}
