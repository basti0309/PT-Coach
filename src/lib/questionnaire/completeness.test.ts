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
    hasConsent: p.health != null,
    health: p.health,
  };
};

describe("Vollständigkeit des Fragebogens", () => {
  it("die drei Testprofile sind vollständig", () => {
    for (const key of ["einsteigerin", "laeufer", "coach"]) expect(missingAnswers(fromProfile(key))).toEqual([]);
  });
  it("leeres Profil: Stammdaten und Ziel fehlen; die Einwilligung ist freiwillig und fehlt nie", () => {
    const m = missingAnswers({ ...fromProfile("coach"), sex: null, answers: null, hasConsent: false, health: null });
    expect(m).toContain("Geschlecht");
    expect(m).toContain("Ziel");
    expect(m.some((x) => x.includes("Einwilligung") || x.startsWith("Schlaf"))).toBe(false);
  });
  it("Zweig Laufen verlangt Bestzeit; Kraft-Erfahrung nur mit Gym", () => {
    const c = fromProfile("laeufer");
    const m = missingAnswers({ ...c, answers: { ...c.answers, laufen: undefined } });
    expect(m).toContain("Laufen: mindestens eine Bestzeit");
    expect(m).not.toContain("Erfahrung je Übung (Monate)");
    expect(missingAnswers({ ...c, gymAccess: true })).toContain("Erfahrung je Übung (Monate)");
  });
  it("mit Einwilligung wird nach Schlaf gefragt", () => {
    const c = fromProfile("coach");
    expect(missingAnswers({ ...c, health: { complaints: [] } })).toContain("Schlaf (Stunden pro Nacht)");
  });
});
