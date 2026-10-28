import { describe, expect, it } from "vitest";
import { derivePaces, PER_MILE_TO_PER_KM } from "./paces";

describe("Paces nach Riegel 1981 + Vorlagen-Abstände", () => {
  const r = derivePaces({ label: "5-km-Test", date: "2026-10-04", distanceM: 5000, seconds: 1260 }, "m", 35, 2280);
  const race = (k: string) => r.races.find((x) => x.key === k)!;
  const train = (k: string) => r.training.find((x) => x.key === k)!;

  it("Umrechnung pro Meile → pro km: 1000 / 1609,344 = 0,621371", () => {
    expect(PER_MILE_TO_PER_KM).toBeCloseTo(0.621371, 6);
  });
  it("Männer < 40: 5 km 21:00 → 10 km", () => {
    // 1260 · 2^1,07732 = 1260 · 2,110113 = 2658,74 s = 44:19 → 265,87 s/km = 4:26 min/km
    expect(race("10k").seconds).toBeCloseTo(2658.74, 1);
    expect(race("10k").paceSecPerKm).toBeCloseTo(265.87, 1);
  });
  it("Meile und Halbmarathon", () => {
    // Meile: 1260 · (1609,344/5000)^1,07732 = 371,52 s = 6:12
    expect(race("mile").seconds).toBeCloseTo(371.52, 1);
    // HM: 1260 · (21097,5/5000)^1,07732 = 5942,60 s = 1:39:03
    expect(race("hm").seconds).toBeCloseTo(5942.6, 0);
    expect(race("hm").inRange).toBe(true);
  });
  it("Marathon 12539,6 s ≈ 3:29:00 (209 min) liegt noch unter 230 min", () => {
    expect(race("m").seconds).toBeCloseTo(12539.56, 0);
    expect(race("m").inRange).toBe(true);
  });
  it("Tempolauf: 10-km-Pace + 60–90 s/Meile", () => {
    // 265,874 + 60 · 0,621371 = 303,16 s/km (5:03); 265,874 + 90 · 0,621371 = 321,80 s/km (5:22)
    expect(train("tempo").fastSecPerKm).toBeCloseTo(303.16, 1);
    expect(train("tempo").slowSecPerKm).toBeCloseTo(321.8, 1);
    expect(train("tempo").unitAssumed).toBe(true);
  });
  it("locker nach Base Builder: Zeitlauf-Pace + 2–3 min/Meile", () => {
    // 252 + 120 · 0,621371 = 326,56 s/km (5:27); 252 + 180 · 0,621371 = 363,85 s/km (6:04)
    expect(train("locker_zeitlauf").fastSecPerKm).toBeCloseTo(326.56, 1);
    expect(train("locker_zeitlauf").slowSecPerKm).toBeCloseTo(363.85, 1);
  });
  it("Hyrox-Renn-Pace = Laufzeit / 8", () => {
    // 2280 / 8 = 285 s/km = 4:45 min/km
    expect(r.hyroxRacePaceSecPerKm).toBe(285);
  });
  it("Referenz außerhalb des Gültigkeitsbereichs → alle Werte markiert", () => {
    const short = derivePaces({ label: "1 km", date: "2026-10-01", distanceM: 1000, seconds: 210 }, "w", 30);
    expect(short.races.every((x) => !x.inRange)).toBe(true);
  });
});
