import { describe, expect, it } from "vitest";
import { pickReference, predictions, riegel } from "./riegel";

describe("Riegel", () => {
  it("5 km in 25:00 → 10 km", () => {
    // 2^1,06 = e^(1,06 · ln 2) = e^0,734736 = 2,084932 → 1500 · 2,084932 = 3127,4 s ≈ 52:07
    expect(riegel(1500, 5000, 10000)).toBeCloseTo(3127.4, 1);
  });
  it("5 km in 25:00 → Marathon", () => {
    // 42195/5000 = 8,439; 8,439^1,06 = e^(1,06 · ln 8,439) = e^(1,06 · 2,13286) = e^2,26083 = 9,59110
    // → 1500 · 9,59110 = 14386,65 s ≈ 3:59:47
    expect(riegel(1500, 5000, 42195)).toBeCloseTo(14386.65, 1);
  });
  it("gleiche Distanz → gleiche Zeit", () => {
    expect(riegel(1500, 5000, 5000)).toBe(1500);
  });
  it("Prognosen für 5k/10k/HM/M, lange Distanzen als unsicher markiert", () => {
    const p = predictions({ distanceM: 5000, timeSeconds: 1500 });
    expect(p.map((x) => x.key)).toEqual(["5k", "10k", "hm", "m"]);
    expect(p.map((x) => x.uncertain)).toEqual([false, false, true, true]);
  });
  it("jüngste Referenz zählt", () => {
    const ref = pickReference([
      { date: "2026-09-01", distanceM: 5000, timeSeconds: 1500, source: "test", label: "5-km-Test" },
      { date: "2026-10-01", distanceM: 10000, timeSeconds: 3200, source: "manuell", label: "Lauf" },
      { date: "2026-08-01", distanceM: 21097.5, timeSeconds: 7000, source: "strava", label: "Strava" },
    ]);
    expect(ref?.date).toBe("2026-10-01");
    expect(pickReference([])).toBeNull();
  });
});
