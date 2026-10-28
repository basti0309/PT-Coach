import { describe, expect, it } from "vitest";
import type { WeekVolume } from "@/lib/questionnaire/schema";
import { classifyTier } from "./tier";

const weeks = (w: WeekVolume): WeekVolume[] => [w, w, w, w];
const base = { mainSport: "", competedLast12Months: false, plansCompetition: false, competitionLevel: "keins" as const };

describe("Tier nach McKay 2022", () => {
  it("Tier 0: 2 × 30 min Gehen, kein Krafttraining", () => {
    // Äquivalent 60 + 2·0 = 60 min < 150 → WHO nicht erfüllt
    const r = classifyTier({ ...base, volume: weeks({ enduranceSessions: 2, enduranceMinutes: 60, vigorousMinutes: 0, runKm: 0, strengthSessions: 0 }) });
    expect(r.tier).toBe(0);
    expect(r.means.aerobicEquivalentMin).toBe(60);
  });
  it("Tier 1: 100 min moderat + 30 min intensiv, 2 Krafteinheiten", () => {
    // Äquivalent 100 + 2·30 = 160 ≥ 150, Kraft 2 ≥ 2, aber keine Sportart/kein Wettkampf → Tier 1
    const r = classifyTier({ ...base, volume: weeks({ enduranceSessions: 3, enduranceMinutes: 130, vigorousMinutes: 30, runKm: 10, strengthSessions: 2 }) });
    expect(r.tier).toBe(1);
    expect(r.means.aerobicEquivalentMin).toBe(160);
  });
  it("Tier 2: Läufer, 3 Einheiten, Wettkampf geplant, lokales Niveau", () => {
    const r = classifyTier({
      volume: weeks({ enduranceSessions: 3, enduranceMinutes: 180, vigorousMinutes: 30, runKm: 25, strengthSessions: 0 }),
      mainSport: "Laufen",
      competedLast12Months: false,
      plansCompetition: true,
      competitionLevel: "lokal",
    });
    expect(r.tier).toBe(2);
    expect(r.tier3Possible).toBe(false);
  });
  it("gleicher Läufer ohne Wettkampfziel: WHO-Ausdauer erfüllt, Kraft nicht → Tier 0 (strenge Lesart)", () => {
    // Äquivalent 150 + 2·30 = 210 ≥ 150 ✓, Kraft 0 < 2 ✗
    const r = classifyTier({ ...base, mainSport: "Laufen", volume: weeks({ enduranceSessions: 3, enduranceMinutes: 180, vigorousMinutes: 30, runKm: 25, strengthSessions: 0 }) });
    expect(r.tier).toBe(0);
  });
  it("nationales Niveau → Tier 3+ möglich (Coach bestätigt)", () => {
    const r = classifyTier({
      volume: weeks({ enduranceSessions: 6, enduranceMinutes: 400, vigorousMinutes: 80, runKm: 60, strengthSessions: 2 }),
      mainSport: "Hyrox",
      competedLast12Months: true,
      plansCompetition: true,
      competitionLevel: "national",
    });
    expect(r).toMatchObject({ tier: 2, tier3Possible: true });
  });
  it("Mittelwert über 4 unterschiedliche Wochen", () => {
    // Einheiten (2+0)+(3+1)+(4+1)+(3+2) = 16 / 4 = 4
    const r = classifyTier({
      ...base,
      volume: [
        { enduranceSessions: 2, enduranceMinutes: 60, vigorousMinutes: 0, runKm: 0, strengthSessions: 0 },
        { enduranceSessions: 3, enduranceMinutes: 90, vigorousMinutes: 10, runKm: 5, strengthSessions: 1 },
        { enduranceSessions: 4, enduranceMinutes: 120, vigorousMinutes: 20, runKm: 10, strengthSessions: 1 },
        { enduranceSessions: 3, enduranceMinutes: 90, vigorousMinutes: 10, runKm: 5, strengthSessions: 2 },
      ],
    });
    expect(r.means.sessions).toBe(4);
  });
});
