import { describe, expect, it } from "vitest";
import type { ClientHealthRow, ClientProfileRow, QuestionnaireRow, TestResultRow } from "@/lib/db-types";
import { samplePlan } from "@/lib/plan/fixtures";
import { buildExportFile, buildProfileExport, type ProfileExtras } from "./profile";
import { readFileSync } from "node:fs";
import path from "node:path";
import { NEW_PLAN_PLACEHOLDERS, PROMPT_PLACEHOLDERS, buildNewPlanPrompt, buildPrompt, extractTemplate } from "./prompt";

const cp: ClientProfileRow = {
  client_id: "c1",
  sex: "w",
  birth_date: "1986-05-01", // am 27.10.2026 genau 40 Jahre
  height_cm: 165,
  equipment_home: "Kurzhanteln",
  gym_access: true,
  training_days_per_week: 3,
  max_minutes_per_workout: 60,
  notes: "Knie links empfindlich",
  pal_factor: 1.6,
  protein_g: 110,
  fat_g: 60,
  carbs_g: 200,
  updated_at: "",
  updated_by: null,
};

const TODAY = "2026-10-27";

const tests: TestResultRow[] = [
  { id: "1", client_id: "c1", kind: "body_weight", tested_on: "2026-09-01", value: 62, scale: null, reps: null, rir: null, note: "", created_at: "a", created_by: null },
  { id: "2", client_id: "c1", kind: "body_weight", tested_on: "2026-10-01", value: 60, scale: null, reps: null, rir: null, note: "", created_at: "b", created_by: null },
  { id: "3", client_id: "c1", kind: "run_5k", tested_on: "2026-10-02", value: 1590, scale: null, reps: null, rir: null, note: "", created_at: "c", created_by: null },
  { id: "4", client_id: "c1", kind: "mobility", tested_on: "2026-10-03", value: null, scale: 6, reps: null, rir: null, note: "Hüfte", created_at: "d", created_by: null },
];

const questionnaire: QuestionnaireRow = { client_id: "c1", goal: "abnehmen", answers: { goal: "abnehmen", workActivity: "sitzend_gehend", sportOften: false }, updated_at: "", updated_by: null };
const health: ClientHealthRow = { client_id: "c1", data: { sleepHours: 6, hrMax: 188 }, updated_at: "", updated_by: null };
const extras: ProfileExtras = { questionnaire, health, hasConsent: true, rpeSessions: [] };

describe("Profil-Export", () => {
  it("pseudonymisiert: Kürzel statt Name, kein Name/E-Mail im JSON", () => {
    const e = buildProfileExport({ full_name: "Anna Muster", short_code: "K01" }, cp, tests, true, TODAY);
    expect(e.label).toBe("K01");
    expect(e.age).toBe(40);
    expect(JSON.stringify(e)).not.toContain("1986");
    expect(JSON.stringify(e)).not.toContain("Anna");
  });
  it("Klarname auf Wunsch", () => {
    expect(buildProfileExport({ full_name: "Anna Muster", short_code: "K01" }, cp, tests, false, TODAY).label).toBe("Anna Muster");
  });
  it("aktuelles Gewicht = jüngster Wert, Kalorien nach Mifflin × PAL bei Ziel Abnehmen", () => {
    const e = buildProfileExport({ full_name: "A", short_code: "K01" }, cp, tests, true, TODAY, extras);
    expect(e.currentWeightKg).toBe(60);
    // 10·60 + 6,25·165 − 5·40 − 161 = 1270,25 → gerundet 1270; × 1,6 = 2032,4 → 2032
    expect(e.calorieNeed).toEqual({ bmrKcal: 1270, totalKcal: 2032, formula: "Mifflin-St Jeor × PAL" });
  });
  it("keine Kalorien ohne Ziel Abnehmen/Muskelaufbau (Regel R10)", () => {
    expect(buildProfileExport({ full_name: "A", short_code: "K01" }, cp, tests, true, TODAY).calorieNeed).toBeNull();
    const hyrox = { ...extras, questionnaire: { ...questionnaire, goal: "hyrox" as const, answers: { goal: "hyrox" as const } } };
    expect(buildProfileExport({ full_name: "A", short_code: "K01" }, cp, tests, true, TODAY, hyrox).calorieNeed).toBeNull();
  });
  it("Gesundheitsdaten nur mit Einwilligung und nie im Chat-Kontext", () => {
    const withConsent = buildProfileExport({ full_name: "A", short_code: "K01" }, cp, tests, true, TODAY, extras);
    expect(withConsent).toMatchObject({ healthStatus: "einwilligung", health: { sleepHours: 6 } });
    expect(withConsent.derived?.flags.some((f) => f.includes("Schlaf"))).toBe(true);
    const noConsent = buildProfileExport({ full_name: "A", short_code: "K01" }, cp, tests, true, TODAY, { ...extras, hasConsent: false });
    expect(noConsent).toMatchObject({ healthStatus: "keine_einwilligung", health: null });
    expect(noConsent.derived?.flags.some((f) => f.includes("Schlaf"))).toBe(false);
    const chat = buildProfileExport({ full_name: "A", short_code: "K01" }, cp, tests, true, TODAY, { ...extras, forChat: true });
    expect(chat).toMatchObject({ healthStatus: "ausgeblendet", health: null, derived: null });
    expect(JSON.stringify(chat)).not.toContain("hrMax");
  });
  it("neue Testarten mit Einheit, Wdh. und RIR", () => {
    const more: TestResultRow[] = [
      ...tests,
      { id: "5", client_id: "c1", kind: "bench_reps", tested_on: "2026-10-04", value: 50, scale: null, reps: 6, rir: 2, note: "", created_at: "e", created_by: null },
      { id: "6", client_id: "c1", kind: "run_30min", tested_on: "2026-10-05", value: 6000, scale: null, reps: null, rir: null, note: "", created_at: "f", created_by: null },
      { id: "7", client_id: "c1", kind: "pullups_2min", tested_on: "2026-10-05", value: 12, scale: null, reps: null, rir: null, note: "", created_at: "g", created_by: null },
    ];
    const e = buildProfileExport({ full_name: "A", short_code: "K01" }, cp, more, true, TODAY);
    expect(e.tests.find((t) => t.test === "bench_reps")).toMatchObject({ value: 50, unit: "kg", reps: 6, rir: 2 });
    expect(e.tests.find((t) => t.test === "run_30min")).toMatchObject({ value: 6000, unit: "m" });
    expect(e.tests.find((t) => t.test === "run_30min")).not.toHaveProperty("display");
    expect(e.tests.find((t) => t.test === "pullups_2min")).toMatchObject({ value: 12, unit: "reps" });
  });
  it("Felder der bisherigen client-Struktur bleiben erhalten", () => {
    const e = buildProfileExport({ full_name: "A", short_code: "K01" }, cp, tests, true, TODAY, extras);
    for (const k of ["label", "pseudonymized", "sex", "age", "heightCm", "currentWeightKg", "equipmentHome", "gymAccess", "trainingDaysPerWeek", "maxMinutesPerWorkout", "notes", "palFactor", "nutritionTargets", "calorieNeed", "tests"]) {
      expect(e).toHaveProperty(k);
    }
    expect(Object.keys(e.tests[0]).every((k) => ["test", "label", "date", "value", "unit", "display", "reps", "rir", "scale", "note"].includes(k))).toBe(true);
  });
  it("Testwert-Historie vollständig mit Anzeige der 5-km-Zeit", () => {
    const e = buildProfileExport({ full_name: "A", short_code: "K01" }, cp, tests, true, TODAY);
    expect(e.tests).toHaveLength(4);
    expect(e.tests.find((t) => t.test === "run_5k")).toMatchObject({ value: 1590, unit: "s", display: "26:30" });
    expect(e.tests.find((t) => t.test === "mobility")).toMatchObject({ scale: 6, note: "Hüfte" });
  });
  it("Export-Datei: Plan + Profil, Profil-Teil identisch zum Profil-Export", () => {
    const client = buildProfileExport({ full_name: "A", short_code: "K01" }, cp, tests, true, TODAY);
    const withPlan = buildExportFile(client, samplePlan(), new Date("2026-10-27T10:00:00Z"));
    const profileOnly = buildExportFile(client, null, new Date("2026-10-27T10:00:00Z"));
    expect(withPlan.client).toEqual(profileOnly.client);
    expect(withPlan.format).toBe("pt-coach-export");
    expect(withPlan.exportVersion).toBe(2);
    expect(withPlan.plan?.title).toBe("Testplan");
  });
});

describe("KI-Prompt", () => {
  it("setzt Platzhalter ein, auch mit $-Zeichen im Inhalt", () => {
    const tpl = "Text\n<!-- PROMPT-START -->\nA: {{AUFGABE}}\nS: {{SCHEMA}}\nE: {{EXPORT}}\n<!-- PROMPT-ENDE -->\nRest";
    const p = buildPrompt(extractTemplate(tpl), { aufgabe: "Woche 3 ergänzen", schema: '{"$id":"x"}', exportJson: "{}" });
    expect(p).toBe('A: Woche 3 ergänzen\nS: {"$id":"x"}\nE: {}');
  });
  it("Prompt für neuen Plan: Platzhalter und leere Beschreibung", () => {
    const tpl = "B: {{BESCHREIBUNG}}\nS: {{SCHEMA}}\nV: {{VORLAGE}}";
    expect(buildNewPlanPrompt(tpl, { beschreibung: " 8 Wochen HYROX ", schema: "$&", vorlage: "{}" })).toBe("B: 8 Wochen HYROX\nS: $&\nV: {}");
    expect(buildNewPlanPrompt(tpl, { beschreibung: "", schema: "", vorlage: "" })).toContain("plane nach den Kundendaten");
  });
  it("beide Prompt-Vorlagen in docs/ enthalten alle Platzhalter", () => {
    const edit = extractTemplate(readFileSync(path.join(process.cwd(), "docs", "ki-prompt-vorlage.md"), "utf8"));
    for (const p of PROMPT_PLACEHOLDERS) expect(edit).toContain(p);
    const neu = extractTemplate(readFileSync(path.join(process.cwd(), "docs", "ki-prompt-neuer-plan.md"), "utf8"));
    for (const p of NEW_PLAN_PLACEHOLDERS) expect(neu).toContain(p);
  });
});
