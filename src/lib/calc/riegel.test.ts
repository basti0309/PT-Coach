import { describe, expect, it } from "vitest";
import { pickReference, predictions, riegel, riegelDataMaxMinutes, riegelExponent, riegelInRange, RIEGEL_RUNNING } from "./riegel";

describe("Riegel (1981, Tabelle 1)", () => {
  it("Exponent nach Geschlecht und Altersklasse", () => {
    expect(riegelExponent("m", 35)).toBe(1.07732);
    expect(riegelExponent("m", 40)).toBe(1.05352);
    expect(riegelExponent("m", 55)).toBe(1.05374);
    expect(riegelExponent("m", 64)).toBe(1.05603);
    expect(riegelExponent("m", 81)).toBe(1.0637);
    expect(riegelExponent("w", 50)).toBe(1.08283);
    expect(riegelExponent(null, 30)).toBe(1.08);
  });
  it("Datenbasis der Tabelle (obere Zeitgrenze)", () => {
    expect(riegelDataMaxMinutes("m", 35)).toBe(129);
    expect(riegelDataMaxMinutes("m", 45)).toBe(131);
    expect(riegelDataMaxMinutes("w", 30)).toBe(147);
    expect(riegelDataMaxMinutes(null, 30)).toBeNull();
  });
  it("Männer: 5 km in 25:00 → 10 km", () => {
    // 2^1,07732 = e^(1,07732 · 0,693147) = e^0,746741 = 2,110113 → 1500 · 2,110113 = 3165,17 s ≈ 52:45
    expect(riegel(1500, 5000, 10000, RIEGEL_RUNNING.men)).toBeCloseTo(3165.17, 1);
  });
  it("Frauen: 5 km in 25:00 → 10 km", () => {
    // 2^1,08283 = e^(1,08283 · 0,693147) = e^0,750561 = 2,118187 → 1500 · 2,118187 = 3177,28 s ≈ 52:57
    expect(riegel(1500, 5000, 10000, RIEGEL_RUNNING.women)).toBeCloseTo(3177.28, 1);
  });
  it("Männer: 5 km in 25:00 → Marathon", () => {
    // 42195/5000 = 8,439; ln 8,439 = 2,132864; · 1,07732 = 2,297777; e^2,297777 = 9,952033
    // → 1500 · 9,952033 = 14928,05 s ≈ 4:08:48 (über 230 min → unsicher)
    expect(riegel(1500, 5000, 42195, RIEGEL_RUNNING.men)).toBeCloseTo(14928.05, 1);
  });
  it("gleiche Distanz → gleiche Zeit", () => {
    expect(riegel(1500, 5000, 5000, RIEGEL_RUNNING.men)).toBe(1500);
  });
  it("Gültigkeitsbereich 1,5–42,2 km und 3,5–230 min", () => {
    expect(riegelInRange(5000, 1500)).toBe(true);
    expect(riegelInRange(1000, 200)).toBe(false); // unter 1,5 km
    expect(riegelInRange(5000, 200)).toBe(false); // unter 3,5 min
    expect(riegelInRange(42195, 14400)).toBe(false); // 240 min > 230 min
  });
  it("Prognosen für 5k/10k/HM/M, lange Distanzen und Zeiten über 230 min als unsicher markiert", () => {
    const p = predictions({ distanceM: 5000, timeSeconds: 1500 }, RIEGEL_RUNNING.men);
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
