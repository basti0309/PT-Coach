import { describe, expect, it } from "vitest";
import type { WodSession } from "@/lib/plan/schema";
import { findLastWodResult, formatWodResult, normalizeMovementName, wodMovementsKey, type WodLogLike } from "./wod";

const cindy: WodSession = {
  id: "x",
  type: "wod",
  name: "Cindy",
  wodType: "amrap",
  durationMinutes: 20,
  movements: [
    { name: "Klimmzüge", reps: 5 },
    { name: "Liegestütze", reps: 10 },
    { name: "Air Squats", reps: 15 },
  ],
};

const log = (id: string, date: string, extra: Partial<WodLogLike>): WodLogLike => ({
  id,
  performed_on: date,
  created_at: date,
  completed: true,
  wod_id: null,
  wod_movements_key: null,
  wod_result: { rounds: 10, reps: 3 },
  wod_weights: "",
  ...extra,
});

describe("WOD-Wiedererkennung", () => {
  it("normalisiert Bewegungsnamen", () => {
    expect(normalizeMovementName("  Klimmzüge (Band)! ")).toBe("klimmzuege band");
    expect(normalizeMovementName("Pull-Ups")).toBe("pull ups");
  });

  it("Schlüssel: Schreibweise egal, Gewicht egal, Wdh. nicht egal", () => {
    const variant: WodSession = {
      ...cindy,
      name: "Anderer Name",
      movements: [
        { name: "klimmzüge", reps: 5, weightKg: 10 },
        { name: "LIEGESTÜTZE", reps: 10 },
        { name: "Air-Squats", reps: 15 },
      ],
    };
    expect(wodMovementsKey(variant)).toBe(wodMovementsKey(cindy));
    expect(wodMovementsKey(cindy)).toBe("amrap|klimmzuege:5::|liegestuetze:10::|air squats:15::");
    const moreReps = { ...cindy, movements: [{ name: "Klimmzüge", reps: 6 }, ...cindy.movements.slice(1)] };
    expect(wodMovementsKey(moreReps)).not.toBe(wodMovementsKey(cindy));
  });

  it("findet über wodId oder Bewegungsschlüssel das jüngste Ergebnis", () => {
    const key = wodMovementsKey(cindy);
    const logs = [
      log("1", "2026-09-01", { wod_movements_key: key, wod_result: { rounds: 12, reps: 4 } }),
      log("2", "2026-10-01", { wod_id: "cindy", wod_movements_key: "anders", wod_result: { rounds: 14, reps: 0 }, wod_weights: "Band grün" }),
      log("3", "2026-10-10", { wod_movements_key: "anderes-wod" }),
    ];
    expect(findLastWodResult(cindy, logs)?.id).toBe("1"); // ohne wodId nur über Schlüssel
    expect(findLastWodResult({ ...cindy, wodId: "cindy" }, logs)?.id).toBe("2");
    expect(findLastWodResult({ ...cindy, wodId: "cindy" }, logs, "2")?.id).toBe("1");
  });

  it("formatiert Ergebnisse", () => {
    expect(formatWodResult({ timeSeconds: 754 })).toBe("Zeit 12:34");
    expect(formatWodResult({ rounds: 14, reps: 3 })).toBe("14 Runden + 3 Wdh.");
    expect(formatWodResult({ rounds: 10 })).toBe("10 Runden");
  });
});
