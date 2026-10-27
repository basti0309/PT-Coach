import { describe, expect, it } from "vitest";
import { samplePlan } from "@/lib/plan/fixtures";
import { matchActivity } from "./matching";

// Beispielplan (Start Mo 26.10.2026), Woche 1:
//   Di 27.10. w1d2-lauf (40 min) · Do 29.10. w1d4-lauf (8 km) · Fr 30.10. w1d5-rad (60 min) · Sa 31.10. w1d6-lauf (60 min, 10 km)
// Woche 2: nur WOD

describe("Strava-Matching", () => {
  const plan = samplePlan();

  it("1. gleiche Sportart am gleichen Tag", () => {
    const m = matchActivity({ sport: "laufen", date: "2026-10-29" }, plan, new Set());
    expect(m?.sessionId).toBe("w1d4-lauf");
    expect(m?.rule).toBe("gleicher-tag");
    expect(m?.planned).toEqual({ durationSeconds: null, distanceM: 8000 });
  });

  it("2. sonst früheste offene Einheit gleicher Sportart in derselben Planwoche", () => {
    // Montag ist kein Lauf geplant → früheste offene Laufeinheit der Woche = Di
    expect(matchActivity({ sport: "laufen", date: "2026-10-26" }, plan, new Set())?.sessionId).toBe("w1d2-lauf");
    // Di schon erledigt → Do
    const m = matchActivity({ sport: "laufen", date: "2026-10-26" }, plan, new Set(["w1d2-lauf"]));
    expect(m?.sessionId).toBe("w1d4-lauf");
    expect(m?.rule).toBe("gleiche-woche");
  });

  it("gleicher Tag schon erledigt → nächste offene in der Woche", () => {
    expect(matchActivity({ sport: "laufen", date: "2026-10-27" }, plan, new Set(["w1d2-lauf"]))?.sessionId).toBe("w1d4-lauf");
  });

  it("Sonntag derselben Woche zählt noch zu Woche 1", () => {
    expect(matchActivity({ sport: "radfahren", date: "2026-11-01" }, plan, new Set())?.sessionId).toBe("w1d5-rad");
  });

  it("3. ohne Treffer → ungeplant (null)", () => {
    expect(matchActivity({ sport: "laufen", date: "2026-10-27" }, plan, new Set(["w1d2-lauf", "w1d4-lauf", "w1d6-lauf"]))).toBeNull();
    expect(matchActivity({ sport: "schwimmen", date: "2026-10-27" }, plan, new Set())).toBeNull();
    expect(matchActivity({ sport: "laufen", date: "2026-11-03" }, plan, new Set())).toBeNull(); // Woche 2: kein Lauf
    expect(matchActivity({ sport: "laufen", date: "2026-10-20" }, plan, new Set())).toBeNull(); // vor Planbeginn
    expect(matchActivity({ sport: "sonstiges", date: "2026-10-27" }, plan, new Set())).toBeNull();
    expect(matchActivity({ sport: "laufen", date: "2026-10-27" }, null, new Set())).toBeNull();
  });
});
