import { describe, expect, it } from "vitest";
import { bestSet, brzycki, epley } from "./one-rep-max";

describe("1RM", () => {
  it("Epley: 100 kg × 5 = 100 · (1 + 5/30) = 116,67 kg", () => {
    expect(epley(100, 5)).toBeCloseTo(116.6667, 3);
  });
  it("Brzycki: 100 kg × 5 = 100 · 36 / 32 = 112,5 kg", () => {
    expect(brzycki(100, 5)).toBe(112.5);
  });
  it("1 Wiederholung = Gewicht", () => {
    expect(epley(140, 1)).toBe(140);
    expect(brzycki(140, 1)).toBe(140);
  });
  it("Brzycki ab 37 Wdh. nicht definiert", () => {
    expect(brzycki(20, 37)).toBe(0);
  });
  it("bester Satz der Einheit, > 10 Wdh. als unsicher markiert", () => {
    // Epley: 80×8 = 101,33 · 90×3 = 99 · 60×15 = 90
    const b = bestSet(
      [
        { weightKg: 80, reps: 8 },
        { weightKg: 90, reps: 3 },
        { weightKg: 60, reps: 15 },
      ],
      "epley",
    );
    expect(b).toMatchObject({ weightKg: 80, reps: 8, unreliable: false });
    expect(b!.oneRm).toBeCloseTo(101.333, 2);
    // Nur ein Satz mit 12 Wdh.: 50 · (1 + 12/30) = 70, unsicher
    expect(bestSet([{ weightKg: 50, reps: 12 }], "epley")).toEqual({ weightKg: 50, reps: 12, oneRm: 70, unreliable: true });
  });
});
