// Testarten (Enum test_kind) mit Einheit und Beschriftung. Die Tests der Testwochen stammen aus den
// HYROX-Vorlagen (docs/VORLAGEN-ANALYSE.md); *_reps sind submaximale Kraftsätze (Gewicht × Wdh. × RIR).

export const TEST_KINDS = [
  "run_5k",
  "run_1mile",
  "run_30min",
  "run_30min_submax",
  "squat_3rm",
  "bench_3rm",
  "deadlift_3rm",
  "squat_reps",
  "bench_reps",
  "deadlift_reps",
  "wallballs_100",
  "ski_5k",
  "row_5k",
  "pullups_2min",
  "lunge_100m",
  "burpee_bar_5min",
  "body_weight",
  "mobility",
] as const;
export type TestKind = (typeof TEST_KINDS)[number];

export type TestUnit = "s" | "kg" | "m" | "reps";

export const TEST_KIND_META: Record<TestKind, { label: string; unit: TestUnit | null; hint?: string }> = {
  run_5k: { label: "5-km-Testzeit", unit: "s" },
  run_1mile: { label: "1-Meilen-Zeitlauf", unit: "s" },
  run_30min: { label: "30-min-Lauf, max. Distanz", unit: "m", hint: "gelaufene Meter in 30 Minuten" },
  run_30min_submax: { label: "30 min gleichmäßig (submaximal)", unit: "m", hint: "Meter in 30 Minuten bei CR-10 ≤ 4" },
  squat_3rm: { label: "3RM Kniebeuge", unit: "kg" },
  bench_3rm: { label: "3RM Bankdrücken", unit: "kg" },
  deadlift_3rm: { label: "3RM Kreuzheben", unit: "kg" },
  squat_reps: { label: "Kniebeuge: Gewicht × Wdh.", unit: "kg" },
  bench_reps: { label: "Bankdrücken: Gewicht × Wdh.", unit: "kg" },
  deadlift_reps: { label: "Kreuzheben: Gewicht × Wdh.", unit: "kg" },
  wallballs_100: { label: "100 Wall Balls auf Zeit", unit: "s" },
  ski_5k: { label: "5 km SkiErg", unit: "s" },
  row_5k: { label: "5 km Rudern", unit: "s" },
  pullups_2min: { label: "Strikte Klimmzüge in 2 min", unit: "reps" },
  lunge_100m: { label: "100 m Walking Lunge", unit: "s" },
  burpee_bar_5min: { label: "Bar-facing Burpees in 5 min", unit: "reps" },
  body_weight: { label: "Körpergewicht", unit: "kg" },
  mobility: { label: "Mobility", unit: null },
};

export const REPS_KINDS = ["squat_reps", "bench_reps", "deadlift_reps"] as const;
export const isRepsKind = (k: TestKind): k is (typeof REPS_KINDS)[number] => (REPS_KINDS as readonly string[]).includes(k);
