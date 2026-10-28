import { describe, expect, it } from "vitest";
import { applyClientGoal, clientGoalText } from "./goal";
import type { PlanContent } from "./schema";

const plan: PlanContent = { schemaVersion: 1, title: "Test", startDate: "2026-11-02", goal: "von der KI gesetzt", weeks: [{ week: 1, days: [] }] };

describe("Plan-Ziel aus dem Fragebogen", () => {
  it("Ziel + Freitext", () => {
    expect(clientGoalText("hyrox", " Sub 65 min im März ")).toBe("Hyrox – Sub 65 min im März");
  });
  it("nur Ziel", () => {
    expect(clientGoalText("laufen", "")).toBe("Laufen");
  });
  it("nur Freitext", () => {
    expect(clientGoalText(null, "fit bleiben")).toBe("fit bleiben");
  });
  it("überschreibt das Ziel der KI", () => {
    expect(applyClientGoal(plan, "abnehmen", "10 kg bis Juni").goal).toBe("Abnehmen – 10 kg bis Juni");
  });
  it("ohne Ziel im Fragebogen wird das Ziel der KI entfernt", () => {
    expect(applyClientGoal(plan, null, null)).not.toHaveProperty("goal");
  });
  it("auf 500 Zeichen gekürzt (Plan-Schema)", () => {
    // „Hyrox – “ (8 Zeichen) + 1000 × „x“ → 499 Zeichen + „…“ = 500
    const g = clientGoalText("hyrox", "x".repeat(1000))!;
    expect(g.length).toBe(500);
    expect(g.endsWith("…")).toBe(true);
  });
});
