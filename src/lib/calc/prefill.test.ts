import { describe, expect, it } from "vitest";
import { prefillFromHistory, type PastSet } from "./prefill";

const set = (log: string, date: string, setNo: number, weightKg: number, reps: number, done = true, createdAt = "t"): PastSet => ({
  workoutLogId: log,
  performedOn: date,
  createdAt,
  setNo,
  weightKg,
  reps,
  done,
});

describe("Vorbefüllung", () => {
  it("ohne Historie: keine Platzhalter", () => {
    expect(prefillFromHistory([], 3)).toEqual([null, null, null]);
  });

  it("nimmt die jüngste Einheit, Satz für Satz", () => {
    const history = [
      set("alt", "2026-10-01", 1, 50, 8),
      set("alt", "2026-10-01", 2, 50, 8),
      set("neu", "2026-10-08", 1, 55, 6),
      set("neu", "2026-10-08", 2, 55, 5),
      set("neu", "2026-10-08", 3, 52.5, 6),
    ];
    expect(prefillFromHistory(history, 3)).toEqual([
      { weightKg: 55, reps: 6 },
      { weightKg: 55, reps: 5 },
      { weightKg: 52.5, reps: 6 },
    ]);
  });

  it("mehr Sätze als letztes Mal: letzter Satz wird fortgeschrieben", () => {
    const history = [set("a", "2026-10-08", 1, 40, 10), set("a", "2026-10-08", 2, 42.5, 8)];
    expect(prefillFromHistory(history, 4)).toEqual([
      { weightKg: 40, reps: 10 },
      { weightKg: 42.5, reps: 8 },
      { weightKg: 42.5, reps: 8 },
      { weightKg: 42.5, reps: 8 },
    ]);
  });

  it("ignoriert nicht abgehakte Sätze und die gerade bearbeitete Einheit", () => {
    const history = [
      set("vorher", "2026-10-01", 1, 60, 5),
      set("offen", "2026-10-05", 1, 99, 1, false),
      set("jetzt", "2026-10-08", 1, 70, 3),
    ];
    expect(prefillFromHistory(history, 1, "jetzt")).toEqual([{ weightKg: 60, reps: 5 }]);
  });

  it("gleicher Tag: die später erfasste Einheit gewinnt", () => {
    const history = [set("früh", "2026-10-08", 1, 50, 5, true, "2026-10-08T08:00"), set("spät", "2026-10-08", 1, 52, 5, true, "2026-10-08T18:00")];
    expect(prefillFromHistory(history, 1)).toEqual([{ weightKg: 52, reps: 5 }]);
  });
});
