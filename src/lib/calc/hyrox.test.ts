import { describe, expect, it } from "vitest";
import { HYROX_STANDARDS, hyroxRunPace } from "./hyrox";

describe("HYROX Rulebook 26/27", () => {
  it("Women Pro und Men (Open) teilen Gewichte, Zielhöhe unterschiedlich", () => {
    expect(HYROX_STANDARDS.women_pro).toMatchObject({ sledPushKg: 152, sledPullKg: 103, farmersKgEach: 24, sandbagKg: 20, wallBallKg: 6, wallBallTargetM: 2.7 });
    expect(HYROX_STANDARDS.men).toMatchObject({ sledPushKg: 152, wallBallKg: 6, wallBallTargetM: 3 });
  });
  it("Women (Open) und Men Pro", () => {
    expect(HYROX_STANDARDS.women).toMatchObject({ sledPushKg: 102, sledPullKg: 78, farmersKgEach: 16, sandbagKg: 10, wallBallKg: 4 });
    expect(HYROX_STANDARDS.men_pro).toMatchObject({ sledPushKg: 202, sledPullKg: 153, farmersKgEach: 32, sandbagKg: 30, wallBallKg: 9 });
  });
  it("Doubles Mixed = mittlere Gewichte", () => {
    expect(HYROX_STANDARDS.doubles_mixed.sledPushKg).toBe(152);
  });
  it("Renn-Pace: 38:00 Laufzeit / 8 km = 4:45 min/km", () => {
    expect(hyroxRunPace(2280)).toBe(285);
  });
});
