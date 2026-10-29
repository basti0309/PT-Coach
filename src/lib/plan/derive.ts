// Abgeleitete Werte für den KI-Export (client.derived). Jede Angabe trägt die Regel-ID aus
// docs/REGELWERK.md und ihren Rechenweg (steps). Reine Funktion – keine Datenbank, kein Datum außer `today`.
import { ageOn, calorieNeed, type Sex } from "@/lib/calc/calories";
import { HYROX_DIVISION_LABELS, HYROX_STANDARDS, type HyroxStandards } from "@/lib/calc/hyrox";
import { brzycki, brzyckiLoadForReps, roundToStep, UNRELIABLE_FROM_REPS } from "@/lib/calc/one-rep-max";
import { derivePaces, MILE_M, type PaceReference, type PaceResult } from "@/lib/calc/paces";
import { riegelDataMaxMinutes } from "@/lib/calc/riegel";
import { suggestPal } from "@/lib/calc/pal";
import { classifyTier, weeklyMeans, type TierResult } from "@/lib/calc/tier";
import { formatDuration, formatNumber } from "@/lib/format";
import { TEST_KIND_META, type TestKind } from "@/lib/plan/test-kinds";
import type { Answers, Goal, Health, Lift } from "@/lib/questionnaire/schema";

export const RULESET_VERSION = 1;

/** Coach-Regeln (Festlegungen, siehe docs/ANNAHMEN.md) */
export const MIN_TIER_TIME_TRIAL = 1;
export const MIN_TIER_3RM = 2;
export const MIN_LIFT_EXPERIENCE_MONTHS = 6;
/** AASM/SRS-Konsens (Watson et al. 2015, Sleep 38(6):843): „Adults should sleep 7 or more hours per night“ */
export const MIN_SLEEP_HOURS = 7;
/** Prozentangaben zur maximalen Herzfrequenz, die in den Vorlagen vorkommen */
export const TEMPLATE_HR_PERCENTS = [60, 70, 80, 85, 87, 90] as const;
/** „add 5-10 lb“ (Tempo Runner) mit 1 lb = 0,45359237 kg */
export const LB_KG = 0.45359237;

export interface TestInput {
  kind: TestKind;
  date: string;
  value: number | null;
  reps: number | null;
  rir: number | null;
}

export interface DeriveInput {
  sex: Sex | null;
  birthDate: string | null;
  heightCm: number | null;
  weightKg: number | null;
  gymAccess: boolean | null;
  trainingDaysPerWeek: number | null;
  maxMinutesPerWorkout: number | null;
  palFactor: number;
  answers: Answers | null;
  /** null, wenn keine Einwilligung oder nichts erfasst */
  health: Health | null;
  tests: TestInput[];
  today: string;
}

export type TestVariant = "max" | "submax" | "entfaellt";

export interface PlannedTest {
  kind: TestKind;
  label: string;
  variant: TestVariant;
  protocol: string;
  reason: string;
}

export interface StrengthDerived {
  lift: Lift;
  source: string | null;
  e1rmKg: number | null;
  loads: { label: string; kg: number; source: string }[];
  steps: string[];
}

export interface Derived {
  rulesetVersion: number;
  goal: Goal | null;
  tier: ({ rule: "R1" } & TierResult) | null;
  startVolume: { rule: "R2"; sessionsPerWeek: number; enduranceMinutes: number; runKm: number; strengthSessions: number; steps: string[] } | null;
  testWeek: { rule: "R4"; allowed: boolean; tests: PlannedTest[]; steps: string[] };
  strength: { rule: "R5/R6"; lifts: StrengthDerived[] };
  paces: ({ rule: "R7" } & PaceResult) | null;
  hyrox: { rule: "R8"; division: string; standards: HyroxStandards } | null;
  heartRate: { rule: "R9"; hrMax: number; zones: { percent: number; bpm: number }[]; steps: string[] } | null;
  calories: { rule: "R10"; palSuggestion: number | null; bmrKcal: number; totalKcal: number; steps: string[] } | null;
  flags: string[];
}

const f1 = (n: number) => formatNumber(n, 1);
const LIFT_TESTS: Record<Lift, { max: TestKind; reps: TestKind }> = {
  squat: { max: "squat_3rm", reps: "squat_reps" },
  bench: { max: "bench_3rm", reps: "bench_reps" },
  deadlift: { max: "deadlift_3rm", reps: "deadlift_reps" },
};
const LIFT_LABEL: Record<Lift, string> = { squat: "Kniebeuge", bench: "Bankdrücken", deadlift: "Kreuzheben" };

const newest = <T extends { date: string }>(xs: T[]): T | undefined => [...xs].sort((a, b) => b.date.localeCompare(a.date))[0];

/** R5: e1RM nach Brzycki aus dem jüngsten 3RM oder Satz bis RIR 0 mit weniger als 10 Wdh. */
export function deriveStrength(lift: Lift, tests: TestInput[]): StrengthDerived {
  const kinds = LIFT_TESTS[lift];
  const candidates = tests.filter(
    (t) =>
      t.value != null &&
      (t.kind === kinds.max || (t.kind === kinds.reps && t.rir === 0 && t.reps != null && t.reps < UNRELIABLE_FROM_REPS)),
  );
  const ignored = tests.filter((t) => t.kind === kinds.reps && t.value != null && !candidates.includes(t));
  const steps: string[] = [];
  if (ignored.length) {
    const t = newest(ignored)!;
    steps.push(
      `${LIFT_LABEL[lift]} ${f1(t.value!)} kg × ${t.reps} @ RIR ${t.rir} (${t.date}) nicht verwendet: e1RM nur aus Sätzen bis RIR 0 mit weniger als 10 Wdh. → Gewichte über Ziel-RIR steuern.`,
    );
  }
  const ref = newest(candidates);
  if (!ref) return { lift, source: null, e1rmKg: null, loads: [], steps: [...steps, `${LIFT_LABEL[lift]}: kein verwertbarer Kraftwert.`] };
  const reps = ref.kind === kinds.max ? 3 : ref.reps!;
  const w = ref.value!;
  const e1rm = brzycki(w, reps);
  steps.push(
    `${LIFT_LABEL[lift]} ${f1(w)} kg × ${reps} (${ref.kind === kinds.max ? "3RM" : "bis RIR 0"}, ${ref.date})`,
    `e1RM (Brzycki) = ${f1(w)} / (1,0278 − 0,0278 × ${reps}) = ${f1(w)} · 36 / ${37 - reps} = ${formatNumber(e1rm, 2)} kg`,
  );
  const loads: StrengthDerived["loads"] = [];
  const add = (label: string, kg: number, source: string, calc: string) => {
    loads.push({ label, kg: roundToStep(kg), source });
    steps.push(`${label}: ${calc} = ${formatNumber(kg, 2)} → ${formatNumber(roundToStep(kg), 1)} kg (gerundet auf 2,5 kg)`);
  };
  add("70 % e1RM", 0.7 * e1rm, "Tempo Runner: „around 70% of your deadlift max“ / „about 70% of your max bench press“", `0,70 × ${formatNumber(e1rm, 2)}`);
  add("80 % e1RM", 0.8 * e1rm, "Tempo Runner: „70-80% of max“ (Obergrenze)", `0,80 × ${formatNumber(e1rm, 2)}`);
  const five = brzyckiLoadForReps(e1rm, 5)!;
  add("5RM-Last („as if it were a 5 rep max“)", five, "Base Builder 3×3 „Lift these as if it were a 5 rep max effort“", `${formatNumber(e1rm, 2)} · 32 / 36`);
  steps.push(
    `Wochensteigerung laut Tempo Runner „add 5-10 lb“: 5 × 0,45359 = ${formatNumber(5 * LB_KG, 2)} kg bis 10 × 0,45359 = ${formatNumber(10 * LB_KG, 2)} kg`,
  );
  return { lift, source: `${ref.kind} ${ref.date}`, e1rmKg: Math.round(e1rm * 10) / 10, loads, steps };
}

/** Jüngste Laufleistung als Referenz für R7 (nur maximale Zeitläufe, keine submaximalen Tests). */
export function paceReference(tests: TestInput[], answers: Answers | null): PaceReference | null {
  const candidates: PaceReference[] = [];
  for (const t of tests) {
    if (t.value == null) continue;
    if (t.kind === "run_5k") candidates.push({ label: "5-km-Test", date: t.date, distanceM: 5000, seconds: t.value });
    if (t.kind === "run_1mile") candidates.push({ label: "1-Meilen-Zeitlauf", date: t.date, distanceM: MILE_M, seconds: t.value });
    if (t.kind === "run_30min") candidates.push({ label: "30-min-Test", date: t.date, distanceM: t.value, seconds: 1800 });
  }
  for (const b of answers?.laufen?.bests ?? []) {
    candidates.push({ label: `Bestzeit ${formatNumber(b.distanceM / 1000, 3)} km (${b.race ? "Wettkampf" : "Training"})`, date: b.date, distanceM: b.distanceM, seconds: b.seconds });
  }
  return newest(candidates) ?? null;
}

function hasFutureEvent(answers: Answers | null, today: string): boolean {
  return (answers?.events ?? []).some((e) => e.date >= today);
}

/** R4: Testwoche je Ziel mit Max-/Submax-Variante je Test. */
export function planTestWeek(
  goal: Goal | null,
  tier: number | null,
  gymAccess: boolean | null,
  answers: Answers | null,
): Derived["testWeek"] {
  const steps: string[] = [];
  if (!goal) return { rule: "R4", allowed: false, tests: [], steps: ["Kein Ziel angegeben → keine Testwoche ableitbar."] };
  const t = tier ?? 0;
  const conditioningMax = t >= MIN_TIER_TIME_TRIAL;
  steps.push(
    `Zeit-/Ausdauertests maximal ab Tier ${MIN_TIER_TIME_TRIAL}: Tier ${tier ?? "unbekannt"} → ${conditioningMax ? "maximal" : "submaximal"}`,
  );
  const tests: PlannedTest[] = [];
  const push = (kind: TestKind, variant: TestVariant, protocol: string, reason: string) =>
    tests.push({ kind, label: TEST_KIND_META[kind].label, variant, protocol, reason });
  const SUBMAX_COND = "ohne Zeitdruck, Anstrengung CR-10 ≤ 4 („etwas schwer“); nur Gewöhnung, kein Testwert";

  const runTest = (kind: "run_5k" | "run_30min", protocol: string) => {
    if (conditioningMax) push(kind, "max", protocol, "Zeitlauf erlaubt");
    else push("run_30min_submax", "submax", "30 min gleichmäßig, CR-10 ≤ 4, Gehpausen erlaubt; Meter notieren – nur Ausgangsumfang, keine Pace-Ableitung", "Zeitlauf nicht freigegeben");
  };
  const conditioning = (kind: TestKind, protocol: string) =>
    conditioningMax ? push(kind, "max", protocol, "maximaler Test erlaubt") : push(kind, "submax", SUBMAX_COND, "maximaler Test nicht freigegeben");
  const lift = (l: Lift) => {
    if (gymAccess !== true) {
      push(LIFT_TESTS[l].max, "entfaellt", "", "kein Gym-Zugang");
      return;
    }
    const exp = answers?.liftExperienceMonths?.[l];
    const ok = t >= MIN_TIER_3RM && exp != null && exp >= MIN_LIFT_EXPERIENCE_MONTHS;
    steps.push(
      `${LIFT_LABEL[l]} 3RM: Tier ≥ ${MIN_TIER_3RM} ${t >= MIN_TIER_3RM ? "✓" : "✗"}, Erfahrung ≥ ${MIN_LIFT_EXPERIENCE_MONTHS} Monate (${exp ?? "?"}) ${exp != null && exp >= MIN_LIFT_EXPERIENCE_MONTHS ? "✓" : "✗"}`,
    );
    if (ok) push(LIFT_TESTS[l].max, "max", "15 Minuten zum Herantasten an das 3RM („Be smart and safe … you aren't a powerlifter“)", "3RM erlaubt");
    else
      push(
        LIFT_TESTS[l].reps,
        "submax",
        "Satz mit 5–8 Wdh. bei Ziel-RIR 2–3 (RPE 7–8 nach Zourdos 2016); Gewicht × Wdh. × RIR eintragen – kein e1RM, Startlast = Testlast",
        "3RM nicht freigegeben",
      );
  };

  if (goal === "hyrox") {
    steps.push("Vorlage: Woche 1 aus Base Builder / Threshold Trainer (Tag 1 Lauf, Tag 3 Kreuzheben + Wall Balls + Ski/Rudern, Tag 5 Bankdrücken + Klimmzüge + Lunges + Burpees, übrige Tage locker < 70 %).");
    runTest("run_30min", "10 min Einlaufen, 30 min maximale Distanz (negativ gesplittet), 10 min Auslaufen; Laufband nur, wenn auch der Retest dort stattfindet");
    lift("deadlift");
    conditioning("wallballs_100", "100 Wall Balls auf Zeit mit dem Ball der Division, danach 5–8 min Pause");
    const eq = [...(answers?.equipment?.home ?? []), ...(answers?.equipment?.gym ?? [])];
    if (eq.includes("skierg")) conditioning("ski_5k", "5 km SkiErg nach 5–10 min lockerem Aufwärmen");
    else if (eq.includes("rudergeraet")) conditioning("row_5k", "5 km Rudern nach 5–10 min lockerem Aufwärmen");
    else push("ski_5k", "entfaellt", "", "weder SkiErg noch Rudergerät verfügbar");
    lift("bench");
    conditioning("pullups_2min", "2 min max. strikte Klimmzüge (Kinn über Stange, volle Streckung), danach 5 min Pause");
    conditioning("lunge_100m", "100 m Walking Lunges mit dem Sandsack-Gewicht der Division, Knie berührt den Boden");
    conditioning("burpee_bar_5min", "5 min max. Bar-facing Burpees über die Hantelstange");
  } else if (goal === "laufen") {
    steps.push("Vorlage: Tempo Runner (5-km-Test/-Zeitlauf Wo. 8/11); Kraftwerte für „70 % of your deadlift max“.");
    runTest("run_5k", "15 min Einlaufen mit Steigerung bis Renntempo, 5–10 min Pause, 5 km gleichmäßig oder negativ gesplittet, 20–30 min Auslaufen/Gehen");
    lift("deadlift");
    lift("bench");
  } else if (goal === "kraft_muskelaufbau") {
    steps.push("Kraftwerte aus den Testwochen der Vorlagen (3RM) plus Kniebeuge (Testart der App).");
    lift("squat");
    lift("bench");
    lift("deadlift");
    conditioning("pullups_2min", "2 min max. strikte Klimmzüge");
  } else {
    steps.push("Abnehmen/Fitness: Ausgangswerte ohne Maximaltest (Festlegung).");
    push("run_30min_submax", "submax", "30 min gleichmäßig (Gehen oder Laufen), CR-10 ≤ 4; Meter notieren", "Ziel braucht keinen Maximaltest");
    lift("squat");
    lift("bench");
    lift("deadlift");
  }
  push("body_weight", "max", "morgens nüchtern wiegen", "Ausgangsgewicht");
  return { rule: "R4", allowed: true, tests, steps };
}

export function deriveAll(input: DeriveInput): Derived {
  const { answers, health, today } = input;
  const goal = answers?.goal ?? null;
  const age = input.birthDate ? ageOn(input.birthDate, today) : null;
  const flags: string[] = [];

  // R1 Tier
  let tier: Derived["tier"] = null;
  if (answers?.volume && answers.competitionLevel) {
    tier = {
      rule: "R1",
      ...classifyTier({
        volume: answers.volume,
        mainSport: answers.mainSport ?? "",
        competedLast12Months: answers.competedLast12Months ?? false,
        plansCompetition: hasFutureEvent(answers, today),
        competitionLevel: answers.competitionLevel,
      }),
    };
  }

  // R2 Startumfang = Ist-Mittel der letzten 4 Wochen
  let startVolume: Derived["startVolume"] = null;
  if (answers?.volume) {
    const m = weeklyMeans(answers.volume);
    const steps = [
      `Startumfang = Mittel der letzten 4 Wochen: ${f1(m.sessions)} Einheiten, ${f1(m.enduranceMinutes)} min Ausdauer, ${f1(m.runKm)} km Laufen, ${f1(m.strengthSessions)} Krafteinheiten pro Woche`,
    ];
    if (input.trainingDaysPerWeek && input.maxMinutesPerWorkout) {
      const cap = input.trainingDaysPerWeek * input.maxMinutesPerWorkout;
      steps.push(`Obergrenze aus Trainingstagen × max. Minuten: ${input.trainingDaysPerWeek} × ${input.maxMinutesPerWorkout} = ${cap} min/Woche`);
      if (m.enduranceMinutes > cap) flags.push(`R2: Ist-Ausdauerumfang ${f1(m.enduranceMinutes)} min liegt über der Obergrenze ${cap} min – Angaben prüfen.`);
    }
    startVolume = {
      rule: "R2",
      sessionsPerWeek: Math.round(m.sessions * 10) / 10,
      enduranceMinutes: Math.round(m.enduranceMinutes),
      runKm: Math.round(m.runKm * 10) / 10,
      strengthSessions: Math.round(m.strengthSessions * 10) / 10,
      steps,
    };
  }

  // Hinweise aus den Gesundheitsangaben (nur mit Einwilligung vorhanden)
  if (health?.sleepHours != null && health.sleepHours < MIN_SLEEP_HOURS) {
    flags.push(`Schlaf Ø ${f1(health.sleepHours)} h < ${MIN_SLEEP_HOURS} h (AASM/SRS 2015) – Progression vorsichtig wählen (Coach-Entscheidung).`);
  }
  for (const c of health?.complaints ?? []) {
    if (c.painInTraining) flags.push(`Beschwerden ${c.region} mit Schmerz im Training (${c.clarified ? "abgeklärt" : "nicht abgeklärt"}): auslösende Übungen meiden – ${c.triggers || "keine genannt"}.`);
  }

  // R4 Testwoche
  const testWeek = planTestWeek(goal, tier?.tier ?? null, input.gymAccess, answers);

  // R5/R6 Kraft
  const lifts = (["squat", "bench", "deadlift"] as Lift[]).map((l) => deriveStrength(l, input.tests));

  // R7 Paces
  const ref = paceReference(input.tests, answers);
  const hyroxResult = newest((answers?.hyrox?.results ?? []).filter((r) => r.runSeconds != null));
  const paces = ref ? { rule: "R7" as const, ...derivePaces(ref, input.sex, age, hyroxResult?.runSeconds ?? null) } : null;
  if (paces) {
    const dataMax = riegelDataMaxMinutes(input.sex, age);
    for (const r of paces.races) {
      if (!r.inRange) flags.push(`R7: ${r.label} ${formatDuration(r.seconds)} außerhalb des Riegel-Gültigkeitsbereichs (1,5–42,2 km, 3,5–230 min).`);
      else if (dataMax != null && r.seconds > dataMax * 60)
        flags.push(`R7: ${r.label} ${formatDuration(r.seconds)} liegt über der Datenbasis von Riegels Tabelle 1 (bis ${dataMax} min) – Extrapolation, unsicher.`);
    }
    const tenK = paces.races.find((r) => r.key === "10k")!;
    if (paces.hyroxRacePaceSecPerKm != null && paces.hyroxRacePaceSecPerKm < tenK.paceSecPerKm) {
      flags.push(
        `R7 unplausibel: Hyrox-Laufpace ${formatDuration(paces.hyroxRacePaceSecPerKm)} min/km ist schneller als die 10-km-Pace ${formatDuration(tenK.paceSecPerKm)} min/km – Laufzeit oder Referenz prüfen.`,
      );
    }
  }

  // R8 Hyrox
  const division = answers?.hyrox?.division;
  const hyrox = goal === "hyrox" && division ? { rule: "R8" as const, division: HYROX_DIVISION_LABELS[division], standards: HYROX_STANDARDS[division] } : null;

  // R9 Herzfrequenz
  const hrMax = health?.hrMax ?? null;
  const heartRate = hrMax
    ? {
        rule: "R9" as const,
        hrMax,
        zones: TEMPLATE_HR_PERCENTS.map((p) => ({ percent: p, bpm: Math.round((p / 100) * hrMax) })),
        steps: TEMPLATE_HR_PERCENTS.map((p) => `${p} % × ${hrMax} = ${formatNumber((p / 100) * hrMax, 1)} → ${Math.round((p / 100) * hrMax)} S/min`),
      }
    : null;

  // R10 Kalorien nur bei Abnehmen/Muskelaufbau
  let calories: Derived["calories"] = null;
  if ((goal === "abnehmen" || goal === "kraft_muskelaufbau") && input.sex && age && input.heightCm && input.weightKg) {
    const c = calorieNeed({ sex: input.sex, weightKg: input.weightKg, heightCm: input.heightCm, age, pal: input.palFactor });
    const sug = answers?.workActivity ? suggestPal(answers.workActivity, answers.sportOften ?? false) : null;
    const steps = [...c.steps];
    if (sug) {
      steps.push(...sug.steps.map((s) => `PAL-Vorschlag: ${s}`));
      if (Math.abs(sug.pal - input.palFactor) >= 0.05) {
        flags.push(`R10: eingestellter PAL ${formatNumber(input.palFactor, 2)} weicht vom DGE-Vorschlag ${formatNumber(sug.pal, 2)} ab – Coach prüft.`);
      }
    }
    calories = { rule: "R10", palSuggestion: sug?.pal ?? null, bmrKcal: Math.round(c.bmr), totalKcal: Math.round(c.total), steps };
  }

  return {
    rulesetVersion: RULESET_VERSION,
    goal,
    tier,
    startVolume,
    testWeek,
    strength: { rule: "R5/R6", lifts },
    paces,
    hyrox,
    heartRate,
    calories,
    flags,
  };
}
