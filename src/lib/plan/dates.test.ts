import { describe, expect, it } from "vitest";
import { findDay, listScheduledSessions, planWeekOf, sessionDate } from "./dates";
import { samplePlan, sampleProgramPlan } from "./fixtures";

describe("Plan-Daten", () => {
  it("Datum = Start + (Woche−1)·7 + (Tag−1)", () => {
    // 26.10.2026 + 7 + 2 = 04.11.2026
    expect(sessionDate("2026-10-26", 2, 3)).toBe("2026-11-04");
  });
  it("listet Einheiten chronologisch", () => {
    const list = listScheduledSessions(samplePlan());
    expect(list.map((s) => s.date)).toEqual(["2026-10-26", "2026-10-27", "2026-10-29", "2026-10-30", "2026-10-31", "2026-11-04"]);
  });
  it("Planwoche eines Datums", () => {
    const p = samplePlan();
    expect(planWeekOf(p, "2026-10-25")).toBeNull();
    expect(planWeekOf(p, "2026-11-01")).toBe(1);
    expect(planWeekOf(p, "2026-11-02")).toBe(2);
  });
  it("Tag an einem Datum, auch Ruhetag", () => {
    const p = sampleProgramPlan(); // Start Montag 26.10.2026
    // 01.11.2026 = Start + 6 Tage → Woche 1, Tag 7 (Ruhetag)
    expect(findDay(p, "2026-11-01")).toEqual({ day: 7, title: "Rest Day!", sessions: [] });
    expect(findDay(p, "2026-10-27")).toBeUndefined(); // Tag 2 ist nicht im Plan
    expect(findDay(p, "2026-10-25")).toBeUndefined(); // vor Planbeginn
  });
});
