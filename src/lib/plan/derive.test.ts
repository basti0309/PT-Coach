import { describe, expect, it } from "vitest";
import { deriveAll, deriveStrength, type TestInput } from "./derive";
import { TESTPROFILES } from "./testprofile-fixtures";

const profile = (key: string) => TESTPROFILES.find((p) => p.key === key)!.input;

describe("deriveStrength (R5/R6)", () => {
  it("3RM-Test hat Vorrang vor älterem Satz, Lasten auf 2,5 kg gerundet", () => {
    const tests: TestInput[] = [
      { kind: "deadlift_reps", date: "2026-09-01", value: 100, reps: 5, rir: 0 },
      { kind: "deadlift_3rm", date: "2026-10-01", value: 120, reps: null, rir: null },
    ];
    const s = deriveStrength("deadlift", tests);
    // 120 · 36 / 34 = 127,06
    expect(s.e1rmKg).toBe(127.1);
    expect(s.loads.map((l) => l.kg)).toEqual([90, 102.5, 112.5]);
  });
  it("Satz mit RIR > 0 wird nicht für e1RM genutzt", () => {
    const s = deriveStrength("bench", [{ kind: "bench_reps", date: "2026-10-01", value: 60, reps: 6, rir: 2 }]);
    expect(s.e1rmKg).toBeNull();
    expect(s.steps[0]).toContain("nicht verwendet");
  });
  it("Satz mit 10 Wdh. bis RIR 0 wird nicht genutzt (Brzycki: nur unter 10)", () => {
    expect(deriveStrength("squat", [{ kind: "squat_reps", date: "2026-10-01", value: 60, reps: 10, rir: 0 }]).e1rmKg).toBeNull();
  });
});

describe("Testprofil Einsteigerin (Tier 0, Abnehmen)", () => {
  const d = deriveAll(profile("einsteigerin"));
  it("Tier 0, Startumfang = Ist", () => {
    expect(d.tier?.tier).toBe(0);
    expect(d.startVolume).toMatchObject({ sessionsPerWeek: 2, enduranceMinutes: 60, runKm: 0, strengthSessions: 0 });
  });
  it("Tier 0 → Testwoche nur submaximal, ohne Gym keine Krafttests", () => {
    expect(d.testWeek.allowed).toBe(true);
    const byKind = Object.fromEntries(d.testWeek.tests.map((t) => [t.kind, t.variant]));
    expect(byKind).toMatchObject({ run_30min_submax: "submax", squat_3rm: "entfaellt", bench_3rm: "entfaellt", deadlift_3rm: "entfaellt" });
  });
  it("Kalorien: Mifflin (Frauen) × PAL 1,4", () => {
    // 10·92 + 6,25·165 − 5·45 − 161 = 920 + 1031,25 − 225 − 161 = 1565,25; × 1,4 = 2191,35
    expect(d.calories).toMatchObject({ bmrKcal: 1565, totalKcal: 2191, palSuggestion: 1.4 });
  });
  it("Schlaf unter 7 h wird markiert, keine Paces", () => {
    expect(d.flags.some((f) => f.includes("Schlaf"))).toBe(true);
    expect(d.paces).toBeNull();
  });
});

describe("Testprofil Läufer (Tier 1/2)", () => {
  const d = deriveAll(profile("laeufer"));
  it("Tier 2 durch geplanten Wettkampf; ohne Wettkampf Tier 0 (Kraft-Richtwert fehlt)", () => {
    expect(d.tier?.tier).toBe(2);
    const p = profile("laeufer");
    const without = deriveAll({ ...p, answers: { ...p.answers, events: [], competedLast12Months: false } });
    expect(without.tier?.tier).toBe(0);
  });
  it("5-km-Zeitlauf maximal, Paces aus 10 km 48:30", () => {
    expect(d.testWeek.tests.find((t) => t.kind === "run_5k")?.variant).toBe("max");
    // 5 km: 2910 · 0,5^1,07732 = 1379,07 s (22:59); Marathon 13724,6 s = 228,7 min (knapp unter 230)
    expect(d.paces?.races.find((r) => r.key === "5k")?.seconds).toBeCloseTo(1379.07, 1);
    expect(d.paces?.races.find((r) => r.key === "m")?.inRange).toBe(true);
  });
  it("Marathon über der Datenbasis der Tabelle (129 min) wird markiert", () => {
    expect(d.flags.some((f) => f.startsWith("R7: Marathon") && f.includes("Datenbasis"))).toBe(true);
  });
  it("keine Kalorien bei Ziel Laufen", () => {
    expect(d.calories).toBeNull();
  });
});

describe("Testprofil Coach (Hyrox)", () => {
  const d = deriveAll(profile("coach"));
  it("Tier 2, Maximaltests inkl. 3RM", () => {
    expect(d.tier?.tier).toBe(2);
    const byKind = Object.fromEntries(d.testWeek.tests.map((t) => [t.kind, t.variant]));
    expect(byKind).toMatchObject({ run_30min: "max", deadlift_3rm: "max", bench_3rm: "max", ski_5k: "max", wallballs_100: "max" });
  });
  it("e1RM aus Sätzen bis RIR 0", () => {
    // Kreuzheben 120 · 36/34 = 127,06; Bankdrücken 70 · 36/32 = 78,75
    const lift = (l: string) => d.strength.lifts.find((x) => x.lift === l)!;
    expect(lift("deadlift").e1rmKg).toBe(127.1);
    expect(lift("bench").e1rmKg).toBe(78.8);
    // Bankdrücken: 70 % = 55,125 → 55; 80 % = 63 → 62,5; 5RM = 78,75 · 32/36 = 70
    expect(lift("bench").loads.map((l) => l.kg)).toEqual([55, 62.5, 70]);
  });
  it("Hyrox-Pace 4:45 langsamer als 10-km-Pace 4:26 → plausibel, keine Markierung", () => {
    expect(d.paces?.hyroxRacePaceSecPerKm).toBe(285);
    expect(d.flags.some((f) => f.includes("unplausibel"))).toBe(false);
  });
  it("Stationsgewichte Men (Open), keine Kalorien bei Ziel Hyrox", () => {
    expect(d.hyrox?.standards).toMatchObject({ sledPushKg: 152, wallBallKg: 6, sandbagKg: 20 });
    expect(d.calories).toBeNull();
  });
});

describe("Testwoche nur nach Stufe (ohne Gesundheitsprüfung)", () => {
  it("ohne Einwilligung/Gesundheitsangaben trotzdem Maximaltests nach Stufe", () => {
    const p = profile("coach");
    const d = deriveAll({ ...p, health: null });
    expect(d.testWeek.tests.find((t) => t.kind === "deadlift_3rm")?.variant).toBe("max");
    expect(d.testWeek.tests.find((t) => t.kind === "run_30min")?.variant).toBe("max");
  });
  it("Tier 1 → Zeittests maximal, 3RM submaximal", () => {
    const p = profile("coach");
    // ohne Wettkampf kein Tier 2; Äquivalent 160 + 2·40 = 240 ≥ 150 und 2 Krafteinheiten → Tier 1
    const vol = p.answers!.volume!.map((w) => ({ ...w, strengthSessions: 2 }));
    const d = deriveAll({ ...p, answers: { ...p.answers, events: [], competedLast12Months: false, volume: vol } });
    expect(d.tier?.tier).toBe(1);
    expect(d.testWeek.tests.find((t) => t.kind === "run_30min")?.variant).toBe("max");
    expect(d.testWeek.tests.find((t) => t.kind === "deadlift_reps")?.variant).toBe("submax");
  });
  it("ohne Ziel keine Testwoche", () => {
    const p = profile("coach");
    expect(deriveAll({ ...p, answers: { ...p.answers, goal: undefined } }).testWeek).toMatchObject({ allowed: false, tests: [] });
  });
  it("Beschwerden mit Schmerz werden markiert, sperren aber nichts", () => {
    const p = profile("coach");
    const d = deriveAll({
      ...p,
      health: { ...p.health, complaints: [{ region: "knie", since: "2026", painInTraining: true, clarified: false, triggers: "Lunges" }] },
    });
    expect(d.flags.some((f) => f.includes("knie") && f.includes("Lunges"))).toBe(true);
    expect(d.testWeek.tests.find((t) => t.kind === "lunge_100m")?.variant).toBe("max");
  });
});

describe("R4 Ergometertest aus der Equipment-Liste (zu Hause und Gym)", () => {
  const p = profile("coach");
  const ergo = (equipment: NonNullable<typeof p.answers>["equipment"]) =>
    deriveAll({ ...p, answers: { ...p.answers, equipment } }).testWeek.tests.filter((t) => t.kind === "ski_5k" || t.kind === "row_5k");
  it("SkiErg nur zu Hause → 5 km SkiErg", () => {
    expect(ergo({ home: ["skierg"], gym: [], gymNote: "" }).map((t) => [t.kind, t.variant])).toEqual([["ski_5k", "max"]]);
  });
  it("nur Rudergerät im Gym → 5 km Rudern", () => {
    expect(ergo({ home: [], gym: ["rudergeraet"], gymNote: "" }).map((t) => [t.kind, t.variant])).toEqual([["row_5k", "max"]]);
  });
  it("weder SkiErg noch Rudergerät (BikeErg zählt nicht) → Test entfällt", () => {
    expect(ergo({ home: ["bikeerg_rolle"], gym: ["schlitten"], gymNote: "" }).map((t) => [t.kind, t.variant])).toEqual([["ski_5k", "entfaellt"]]);
  });
});
