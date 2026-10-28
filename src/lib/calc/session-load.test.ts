import { describe, expect, it } from "vitest";
import { mondayOf, sessionLoad, weeklyLoads } from "./session-load";

describe("Session-RPE nach Foster", () => {
  it("Last = RPE × Minuten: 60 min × 6 = 360", () => {
    expect(sessionLoad({ date: "2026-10-26", durationMinutes: 60, rpe: 6 })).toBe(360);
  });
  it("Montag der Woche", () => {
    expect(mondayOf("2026-11-01")).toBe("2026-10-26"); // Sonntag
    expect(mondayOf("2026-10-26")).toBe("2026-10-26");
  });
  it("Woche mit Monotonie und Strain", () => {
    // Tageslasten Mo 360, Mi 300, Fr 420, sonst 0 → Summe 1080, Mittel 154,286
    // Varianz = (205,714² + 154,286² + 145,714² + 154,286² + 265,714² + 154,286² + 154,286²) / 7
    //         = (42318,4 + 23804,1 + 21232,7 + 23804,1 + 70604,1 + 23804,1 + 23804,1) / 7 = 229371,4 / 7 = 32767,3
    // SD = 181,018 → Monotonie = 154,286 / 181,018 = 0,85232; Strain = 1080 · 0,85232 = 920,5
    const [w] = weeklyLoads([
      { date: "2026-10-26", durationMinutes: 60, rpe: 6 },
      { date: "2026-10-28", durationMinutes: 50, rpe: 6 },
      { date: "2026-10-30", durationMinutes: 70, rpe: 6 },
    ]);
    expect(w.weekStart).toBe("2026-10-26");
    expect(w.load).toBe(1080);
    expect(w.sessions).toBe(3);
    expect(w.monotony!).toBeCloseTo(0.8523, 3);
    expect(w.strain!).toBeCloseTo(920.5, 0);
  });
});
