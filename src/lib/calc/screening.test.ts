import { describe, expect, it } from "vitest";
import { addMonths, evaluateScreening } from "./screening";

const TODAY = "2026-10-28";
const ok = { parq: { date: "2026-10-01", result: "alle_nein" as const }, acsm: { regularlyActive: true, knownDisease: false, symptoms: false } };

describe("Screening (PAR-Q+ und ACSM nach Riebe 2015)", () => {
  it("12 Monate Gültigkeit", () => {
    expect(addMonths("2025-10-28", 12)).toBe("2026-10-28");
  });
  it("ohne Einwilligung: Testwoche nur submaximal", () => {
    expect(evaluateScreening(null, false, TODAY)).toMatchObject({ status: "keine_einwilligung", testWeekAllowed: true, maxTestsAllowed: false });
  });
  it("fehlende Angaben: nur submaximal", () => {
    expect(evaluateScreening({ parq: ok.parq }, true, TODAY)).toMatchObject({ status: "fehlt", maxTestsAllowed: false });
  });
  it("aktiv, gesund, PAR-Q+ alle Nein → Maximaltests erlaubt", () => {
    expect(evaluateScreening(ok, true, TODAY)).toMatchObject({ status: "ok", testWeekAllowed: true, maxTestsAllowed: true });
  });
  it("PAR-Q+ älter als 12 Monate → abgelaufen", () => {
    expect(evaluateScreening({ ...ok, parq: { date: "2025-10-28", result: "alle_nein" } }, true, TODAY).status).toBe("abgelaufen");
  });
  it("mind. ein Ja ohne Abklärung → keine Testwoche", () => {
    const r = evaluateScreening({ ...ok, parq: { date: "2026-10-01", result: "mind_ein_ja" } }, true, TODAY);
    expect(r).toMatchObject({ status: "abklaerung_noetig", testWeekAllowed: false, maxTestsAllowed: false });
  });
  it("mind. ein Ja mit ärztlicher Abklärung, aktiv und gesund → Maximaltests erlaubt", () => {
    const r = evaluateScreening({ ...ok, parq: { date: "2026-10-01", result: "mind_ein_ja" }, medicalClearance: { date: "2026-10-10" } }, true, TODAY);
    expect(r).toMatchObject({ status: "ok", maxTestsAllowed: true });
  });
  it("aktiv mit Symptomen → keine Testwoche", () => {
    const r = evaluateScreening({ ...ok, acsm: { regularlyActive: true, knownDisease: false, symptoms: true } }, true, TODAY);
    expect(r.testWeekAllowed).toBe(false);
  });
  it("inaktiv mit bekannter Erkrankung → keine Testwoche", () => {
    const r = evaluateScreening({ ...ok, acsm: { regularlyActive: false, knownDisease: true, symptoms: false } }, true, TODAY);
    expect(r.testWeekAllowed).toBe(false);
  });
  it("aktiv mit bekannter Erkrankung ohne Symptome → Testwoche nur submaximal", () => {
    const r = evaluateScreening({ ...ok, acsm: { regularlyActive: true, knownDisease: true, symptoms: false } }, true, TODAY);
    expect(r).toMatchObject({ testWeekAllowed: true, maxTestsAllowed: false });
  });
  it("inaktiv und gesund → nur submaximal, auch mit ärztlicher Freigabe keine Maximaltests", () => {
    const inactive = { ...ok, acsm: { regularlyActive: false, knownDisease: false, symptoms: false } };
    expect(evaluateScreening(inactive, true, TODAY)).toMatchObject({ status: "ok", maxTestsAllowed: false });
    expect(evaluateScreening({ ...inactive, medicalClearance: { date: "2026-10-01" } }, true, TODAY).maxTestsAllowed).toBe(false);
  });
});
