import { describe, expect, it } from "vitest";
import { sessionVolume, strengthSeries, type StrengthSetRecord } from "./volume";

const r = (log: string, date: string, w: number, reps: number, done = true, ex = "kniebeuge"): StrengthSetRecord => ({
  workoutLogId: log,
  performedOn: date,
  exerciseId: ex,
  weightKg: w,
  reps,
  done,
});

describe("Kraftvolumen", () => {
  it("Σ Gewicht × Wdh. nur abgehakter Sätze", () => {
    // 100·5 + 100·5 + 105·3 = 500 + 500 + 315 = 1315 (der nicht abgehakte Satz zählt nicht)
    expect(
      sessionVolume([
        { weightKg: 100, reps: 5, done: true },
        { weightKg: 100, reps: 5, done: true },
        { weightKg: 105, reps: 3, done: true },
        { weightKg: 110, reps: 1, done: false },
      ]),
    ).toBe(1315);
  });

  it("Verlauf je Einheit mit Volumen und 1RM, chronologisch", () => {
    const records = [
      r("b", "2026-10-08", 80, 5),
      r("b", "2026-10-08", 80, 5),
      r("a", "2026-10-01", 60, 12),
      r("a", "2026-10-01", 50, 8, true, "bankdruecken"),
    ];
    const series = strengthSeries(records, "kniebeuge", "epley");
    // a: 60·12 = 720; e1RM 60·(1+12/30) = 84 (unsicher) · b: 2·400 = 800; e1RM 80·(1+5/30) = 93,33 → 93,3
    expect(series).toEqual([
      { date: "2026-10-01", workoutLogId: "a", volume: 720, oneRm: 84, bestWeightKg: 60, bestReps: 12, unreliable: true },
      { date: "2026-10-08", workoutLogId: "b", volume: 800, oneRm: 93.3, bestWeightKg: 80, bestReps: 5, unreliable: false },
    ]);
  });
});
