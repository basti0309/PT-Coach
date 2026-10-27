import { describe, expect, it } from "vitest";
import type { ClientProfileRow, TestResultRow } from "@/lib/db-types";
import { samplePlan } from "@/lib/plan/fixtures";
import { buildExportFile, buildProfileExport } from "./profile";
import { buildPrompt, extractTemplate } from "./prompt";

const cp: ClientProfileRow = {
  client_id: "c1",
  sex: "w",
  age: 40,
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

const tests: TestResultRow[] = [
  { id: "1", client_id: "c1", kind: "body_weight", tested_on: "2026-09-01", value: 62, scale: null, note: "", created_at: "a", created_by: null },
  { id: "2", client_id: "c1", kind: "body_weight", tested_on: "2026-10-01", value: 60, scale: null, note: "", created_at: "b", created_by: null },
  { id: "3", client_id: "c1", kind: "run_5k", tested_on: "2026-10-02", value: 1590, scale: null, note: "", created_at: "c", created_by: null },
  { id: "4", client_id: "c1", kind: "mobility", tested_on: "2026-10-03", value: null, scale: 6, note: "Hüfte", created_at: "d", created_by: null },
];

describe("Profil-Export", () => {
  it("pseudonymisiert: Kürzel statt Name, kein Name/E-Mail im JSON", () => {
    const e = buildProfileExport({ full_name: "Anna Muster", short_code: "K01" }, cp, tests, true);
    expect(e.label).toBe("K01");
    expect(JSON.stringify(e)).not.toContain("Anna");
  });
  it("Klarname auf Wunsch", () => {
    expect(buildProfileExport({ full_name: "Anna Muster", short_code: "K01" }, cp, tests, false).label).toBe("Anna Muster");
  });
  it("aktuelles Gewicht = jüngster Wert, Kalorien nach Mifflin × PAL", () => {
    const e = buildProfileExport({ full_name: "A", short_code: "K01" }, cp, tests, true);
    expect(e.currentWeightKg).toBe(60);
    // 10·60 + 6,25·165 − 5·40 − 161 = 1270,25 → gerundet 1270; × 1,6 = 2032,4 → 2032
    expect(e.calorieNeed).toEqual({ bmrKcal: 1270, totalKcal: 2032, formula: "Mifflin-St Jeor × PAL" });
  });
  it("Testwert-Historie vollständig mit Anzeige der 5-km-Zeit", () => {
    const e = buildProfileExport({ full_name: "A", short_code: "K01" }, cp, tests, true);
    expect(e.tests).toHaveLength(4);
    expect(e.tests.find((t) => t.test === "run_5k")).toMatchObject({ value: 1590, unit: "s", display: "26:30" });
    expect(e.tests.find((t) => t.test === "mobility")).toMatchObject({ scale: 6, note: "Hüfte" });
  });
  it("Export-Datei: Plan + Profil, Profil-Teil identisch zum Profil-Export", () => {
    const client = buildProfileExport({ full_name: "A", short_code: "K01" }, cp, tests, true);
    const withPlan = buildExportFile(client, samplePlan(), new Date("2026-10-27T10:00:00Z"));
    const profileOnly = buildExportFile(client, null, new Date("2026-10-27T10:00:00Z"));
    expect(withPlan.client).toEqual(profileOnly.client);
    expect(withPlan.format).toBe("pt-coach-export");
    expect(withPlan.plan?.title).toBe("Testplan");
  });
});

describe("KI-Prompt", () => {
  it("setzt Platzhalter ein, auch mit $-Zeichen im Inhalt", () => {
    const tpl = "Text\n<!-- PROMPT-START -->\nA: {{AUFGABE}}\nS: {{SCHEMA}}\nE: {{EXPORT}}\n<!-- PROMPT-ENDE -->\nRest";
    const p = buildPrompt(extractTemplate(tpl), { aufgabe: "Woche 3 ergänzen", schema: '{"$id":"x"}', exportJson: "{}" });
    expect(p).toBe('A: Woche 3 ergänzen\nS: {"$id":"x"}\nE: {}');
  });
});
