import { describe, expect, it } from "vitest";
import { ageOn, calorieNeed, mifflinStJeor } from "./calories";

describe("Mifflin-St Jeor", () => {
  it("Mann: 80 kg, 180 cm, 30 Jahre", () => {
    // 10·80 + 6,25·180 − 5·30 + 5 = 800 + 1125 − 150 + 5 = 1780
    expect(mifflinStJeor("m", 80, 180, 30)).toBe(1780);
  });
  it("Frau: 60 kg, 165 cm, 40 Jahre", () => {
    // 10·60 + 6,25·165 − 5·40 − 161 = 600 + 1031,25 − 200 − 161 = 1270,25
    expect(mifflinStJeor("w", 60, 165, 40)).toBeCloseTo(1270.25, 10);
  });
  it("Gesamtbedarf mit PAL 1,6 und Rechenweg", () => {
    // 1780 · 1,6 = 2848
    const r = calorieNeed({ sex: "m", weightKg: 80, heightCm: 180, age: 30, pal: 1.6 });
    expect(r.total).toBeCloseTo(2848, 10);
    expect(r.steps[2]).toBe("= 800 + 1.125 − 150 + 5 = 1.780 kcal");
    expect(r.steps[3]).toBe("Gesamtbedarf = Grundumsatz × PAL = 1.780 × 1,6 = 2.848 kcal");
  });
});

describe("Alter aus Geburtsdatum", () => {
  it("vor und nach dem Geburtstag", () => {
    expect(ageOn("1992-03-14", "2026-03-13")).toBe(33);
    expect(ageOn("1992-03-14", "2026-03-14")).toBe(34);
    expect(ageOn("1992-03-14", "2026-10-27")).toBe(34);
  });
  it("29. Februar", () => {
    expect(ageOn("2000-02-29", "2026-02-28")).toBe(25);
    expect(ageOn("2000-02-29", "2026-03-01")).toBe(26);
  });
});
