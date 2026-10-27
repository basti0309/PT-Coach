import { describe, expect, it } from "vitest";
import { lineDiff, summarizePlanChanges } from "./diff";
import { samplePlan } from "./fixtures";

describe("Diff", () => {
  it("Zeilendiff", () => {
    expect(lineDiff("a\nb\nc", "a\nx\nc")).toEqual([
      { type: "same", text: "a" },
      { type: "del", text: "b" },
      { type: "add", text: "x" },
      { type: "same", text: "c" },
    ]);
  });
  it("Zusammenfassung je Einheit", () => {
    const oldPlan = samplePlan();
    const newPlan = samplePlan();
    newPlan.weeks[0].days.splice(3, 1); // w1d5-rad entfernt
    const kraft = newPlan.weeks[0].days[0].sessions[0];
    if (kraft.type === "strength") kraft.exercises[0].sets = 4;
    newPlan.weeks[1].days[0].sessions.push({ id: "neu", type: "endurance", sport: "laufen", durationMinutes: 30, intensity: "locker" });
    const s = summarizePlanChanges(oldPlan, newPlan);
    expect(s.removed).toEqual(["Woche 1, Tag 5: w1d5-rad"]);
    expect(s.changed).toEqual(["Woche 1, Tag 1: w1d1-kraft"]);
    expect(s.added).toEqual(["Woche 2, Tag 3: neu"]);
    expect(s.metaChanged).toBe(false);
  });
});
