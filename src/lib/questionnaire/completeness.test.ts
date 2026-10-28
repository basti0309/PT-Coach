import { describe, expect, it } from "vitest";
import { missingAnswers, type CompletenessInput } from "./completeness";
import { TESTPROFILES } from "@/lib/plan/testprofile-fixtures";

const fromProfile = (key: string): CompletenessInput => {
  const p = TESTPROFILES.find((x) => x.key === key)!.input;
  return {
    sex: p.sex,
    birthDate: p.birthDate,
    heightCm: p.heightCm,
    gymAccess: p.gymAccess,
    trainingDaysPerWeek: p.trainingDaysPerWeek,
    maxMinutesPerWorkout: p.maxMinutesPerWorkout,
    testKinds: p.tests.map((t) => t.kind),
    answers: p.answers,
    hasConsent: p.hasConsent,
    health: p.health,
    today: p.today,
  };
};

describe("Vollständigkeit des Fragebogens", () => {
  it("die drei Testprofile sind vollständig", () => {
    for (const key of ["einsteigerin", "laeufer", "coach"]) expect(missingAnswers(fromProfile(key))).toEqual([]);
  });
  it("leeres Profil: Stammdaten, Ziel und Einwilligung fehlen", () => {
    const m = missingAnswers({ ...fromProfile("coach"), sex: null, answers: null, hasConsent: false, health: null });
    expect(m).toContain("Geschlecht");
    expect(m).toContain("Ziel");
    expect(m.some((x) => x.startsWith("Einwilligung"))).toBe(true);
  });
  it("Zweig Laufen verlangt Bestzeit; Kraft-Erfahrung nur mit Gym", () => {
    const c = fromProfile("laeufer");
    const m = missingAnswers({ ...c, answers: { ...c.answers, laufen: undefined } });
    expect(m).toContain("Laufen: mindestens eine Bestzeit");
    expect(m).not.toContain("Erfahrung je Übung (Monate)");
    expect(missingAnswers({ ...c, gymAccess: true })).toContain("Erfahrung je Übung (Monate)");
  });
  it("PAR-Q+ älter als 12 Monate", () => {
    const c = fromProfile("coach");
    const m = missingAnswers({ ...c, health: { ...c.health, parq: { date: "2025-10-01", result: "alle_nein" } } });
    expect(m).toContain("PAR-Q+ älter als 12 Monate – neu ausfüllen");
  });
});
