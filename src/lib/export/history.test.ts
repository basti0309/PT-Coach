import { describe, expect, it } from "vitest";
import { buildHistoryExport, type HistoryLog } from "./history";

const base: Omit<HistoryLog, "id" | "performed_on" | "source"> = {
  kind: "endurance",
  title: "Lauf",
  completed: true,
  sport: "laufen",
  duration_seconds: 2700,
  distance_m: 8450,
  avg_hr: 151,
  is_test: false,
  wod_result: null,
  wod_weights: "",
  block_results: null,
  session_rpe: 6,
  notes: "gut",
};

describe("Trainingsverlauf im Export", () => {
  const out = buildHistoryExport(
    [
      { ...base, id: "s", performed_on: "2026-10-20", source: "strava" },
      { ...base, id: "m", performed_on: "2026-10-10", source: "manual" },
      { ...base, id: "k", performed_on: "2026-10-12", source: "manual", kind: "strength", sport: null, distance_m: null, avg_hr: null, duration_seconds: null, session_rpe: null, notes: "" },
    ],
    [
      { workout_log_id: "k", exercise_id: "kniebeuge", exercise_name: "Kniebeuge", set_no: 2, weight_kg: 80, reps: 5, done: true },
      { workout_log_id: "k", exercise_id: "kniebeuge", exercise_name: "Kniebeuge", set_no: 1, weight_kg: 80, reps: 5, done: true },
      { workout_log_id: "k", exercise_id: "kniebeuge", exercise_name: "Kniebeuge", set_no: 3, weight_kg: 80, reps: 3, done: false },
    ],
  );
  it("nach Datum sortiert", () => {
    expect(out.map((e) => e.date)).toEqual(["2026-10-10", "2026-10-12", "2026-10-20"]);
  });
  it("manuelle Ausdauer mit Distanz, Puls, RPE und Last", () => {
    // 2700 s = 45 min; Last = 45 × 6 = 270; 8450 m = 8,45 km
    expect(out[0]).toMatchObject({ source: "manual", durationMinutes: 45, distanceKm: 8.45, avgHr: 151, sessionRpe: 6, load: 270, notes: "gut" });
  });
  it("Kraft: nur abgehakte Sätze, in Reihenfolge", () => {
    expect(out[1].sets).toEqual([
      { exercise: "Kniebeuge", set: 1, weightKg: 80, reps: 5 },
      { exercise: "Kniebeuge", set: 2, weightKg: 80, reps: 5 },
    ]);
  });
  it("Strava: nur Datum, Sportart, Dauer, Erledigt – keine Strava-Werte", () => {
    expect(out[2]).toEqual({ date: "2026-10-20", kind: "endurance", source: "strava", title: "Lauf", completed: true, sport: "laufen", durationMinutes: 45 });
  });
});
