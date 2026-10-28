import { describe, expect, it } from "vitest";
import { samplePlan } from "./fixtures";
import { mergePlanParts } from "./merge";

function parts() {
  const all = samplePlan();
  const a = { ...structuredClone(all), weeks: [structuredClone(all.weeks[0])] };
  const b = { ...structuredClone(all), goal: undefined, weeks: [structuredClone(all.weeks[1])] };
  delete b.goal;
  return { all, a, b };
}

describe("Teil-Pläne zusammenführen", () => {
  it("Wochen aus zwei Teilen ergeben den ganzen Plan (Reihenfolge egal)", () => {
    const { all, a, b } = parts();
    const result = mergePlanParts([b, a]);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.plan.weeks.map((w) => w.week)).toEqual([1, 2]);
    if (result.ok) expect(result.plan.weeks).toEqual(all.weeks);
  });
  it("abweichender Titel oder Startdatum wird gemeldet", () => {
    const { a, b } = parts();
    b.title = "Anderer Titel";
    b.startDate = "2026-11-02";
    const result = mergePlanParts([a, b]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toHaveLength(2);
  });
  it("dieselbe Woche in zwei Teilen wird gemeldet", () => {
    const { a } = parts();
    const result = mergePlanParts([a, structuredClone(a)]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join("\n")).toContain("Wochennummer kommt mehrfach vor");
  });
  it("ohne Teile: Fehlermeldung", () => {
    expect(mergePlanParts([])).toEqual({ ok: false, errors: ["Es wurde noch kein Teil hinzugefügt."] });
  });
});
