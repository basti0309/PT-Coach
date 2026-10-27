import { describe, expect, it } from "vitest";
import { planDeviation, plannedTargets } from "./deviation";

describe("Plan-Abweichung", () => {
  it("Dauer und Distanz absolut und in %", () => {
    // Soll 40 min = 2400 s, Ist 2520 s → +120 s = +5 %
    // Soll 8 km = 8000 m, Ist 7600 m → −400 m = −5 %
    const d = planDeviation({ durationSeconds: 2400, distanceM: 8000 }, { durationSeconds: 2520, distanceM: 7600 });
    expect(d.duration).toEqual({ planned: 2400, actual: 2520, abs: 120, pct: 5 });
    expect(d.distance).toEqual({ planned: 8000, actual: 7600, abs: -400, pct: -5 });
  });
  it("rundet Prozent auf eine Nachkommastelle", () => {
    // Soll 3600 s, Ist 3000 s → −600/3600 = −16,666… % → −16,7 %
    expect(planDeviation({ durationSeconds: 3600 }, { durationSeconds: 3000 }).duration?.pct).toBe(-16.7);
  });
  it("ohne Sollwert keine Abweichung", () => {
    expect(planDeviation({ durationSeconds: 1800 }, { durationSeconds: 1700, distanceM: 5000 })).toEqual({
      duration: { planned: 1800, actual: 1700, abs: -100, pct: -5.6 },
    });
  });
  it("Sollwerte aus dem Plan", () => {
    expect(plannedTargets({ durationMinutes: 40, distanceKm: 8.5 })).toEqual({ durationSeconds: 2400, distanceM: 8500 });
    expect(plannedTargets({ distanceKm: 10 })).toEqual({ durationSeconds: null, distanceM: 10000 });
  });
});
