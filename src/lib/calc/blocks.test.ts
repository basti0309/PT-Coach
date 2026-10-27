import { describe, expect, it } from "vitest";
import type { ProgramSession } from "@/lib/plan/schema";
import {
  blockResultSummary,
  describeScoring,
  isSessionComplete,
  lbToKg,
  loadForSex,
  parseBlockValue,
  valueCount,
} from "./blocks";

const session: ProgramSession = {
  id: "w2d1-gym",
  type: "program",
  title: "PM SESSION – Gym session",
  blocks: [
    { key: "p1", label: "P1", name: "2k row warm up", scoring: { type: "checkmark" } },
    { key: "p2", label: "P2", name: "3x3 deadlift", scoring: { type: "weight", rounds: 3 } },
    { key: "rest", name: "Rest Day Protocol", scoring: { type: "none" } },
  ],
};

describe("Block-Eingaben", () => {
  it("Zeit mm:ss und h:mm:ss", () => {
    // 2:45 = 2 × 60 + 45 = 165 s
    expect(parseBlockValue("time", "2:45")).toEqual({ ok: true, value: 165 });
    // 1:02:03 = 3600 + 2 × 60 + 3 = 3723 s
    expect(parseBlockValue("time", "1:02:03")).toEqual({ ok: true, value: 3723 });
    expect(parseBlockValue("time", "2:75").ok).toBe(false);
  });
  it("Distanz in km wird zu Metern", () => {
    // 5,2 km = 5200 m
    expect(parseBlockValue("distance", "5,2")).toEqual({ ok: true, value: 5200 });
  });
  it("Gewicht mit Komma, Wiederholungen ganzzahlig, leer erlaubt", () => {
    expect(parseBlockValue("weight", "62,5")).toEqual({ ok: true, value: 62.5 });
    expect(parseBlockValue("reps", "42")).toEqual({ ok: true, value: 42 });
    expect(parseBlockValue("reps", "4,5").ok).toBe(false);
    expect(parseBlockValue("calories", "")).toEqual({ ok: true, value: null });
  });
});

describe("Wertung", () => {
  it("Anzahl Felder und Beschreibung", () => {
    expect(valueCount({ type: "weight", rounds: 3 })).toBe(3);
    expect(valueCount({ type: "time" })).toBe(1);
    expect(valueCount({ type: "checkmark" })).toBe(0);
    expect(describeScoring({ type: "weight", rounds: 3 })).toBe("3 Runden · Gewicht");
    expect(describeScoring({ type: "time" })).toBe("Zeit");
  });
  it("Kurzfassung", () => {
    expect(blockResultSummary({ type: "weight", rounds: 3 }, { done: true, values: [60, 62.5, 65], note: "" })).toBe(
      "Gewicht 60 / 62,5 / 65 kg",
    );
    // 5200 m = 5,2 km
    expect(blockResultSummary({ type: "distance" }, { done: true, values: [5200], note: "" })).toBe("Distanz 5,2 km");
    expect(blockResultSummary({ type: "checkmark" }, { done: true, values: [], note: "" })).toBe("✓");
    expect(blockResultSummary({ type: "time" }, undefined)).toBe("–");
  });
  it("Einheit erledigt, wenn alle Blöcke mit Wertung abgehakt sind (\"none\" zählt nicht)", () => {
    const p1 = { done: true, values: [], note: "" };
    const p2 = { done: true, values: [60, 60, 62.5], note: "" };
    expect(isSessionComplete(session, { p1 })).toBe(false);
    expect(isSessionComplete(session, { p1, p2 })).toBe(true);
  });
});

describe("Gewichte", () => {
  it("lb → kg auf 0,1 kg", () => {
    // 20 lb × 0,45359237 = 9,0718 → 9,1 kg; 14 lb × 0,45359237 = 6,3503 → 6,4 kg
    expect(lbToKg(20)).toBe(9.1);
    expect(lbToKg(14)).toBe(6.4);
    // 135 lb × 0,45359237 = 61,235 → 61,2 kg
    expect(lbToKg(135)).toBe(61.2);
  });
  it("Gewicht passend zum Geschlecht", () => {
    const wallBall = { label: "Wall Ball", maleKg: 9.1, femaleKg: 6.4 };
    expect(loadForSex(wallBall, "m")).toBe("9,1 kg");
    expect(loadForSex(wallBall, "w")).toBe("6,4 kg");
    expect(loadForSex(wallBall, null)).toBe("Männer 9,1 kg · Frauen 6,4 kg");
    expect(loadForSex({ label: "Sandbag", kg: 20 }, "w")).toBe("20 kg");
  });
});
