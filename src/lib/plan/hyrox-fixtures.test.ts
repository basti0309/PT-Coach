import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { mergePlanParts } from "./merge";
import type { PlanContent } from "./schema";
import { parsePlanImport, validatePlan } from "./validate";

// Abschriften der drei HYROX-Pläne (Excel der Betreiberin), umgewandelt in Plan-JSON.
// Erwartete Zahlen aus den Excel-Dateien, Blatt "Trainingsplan":
//   Base Builder:      265 Zeilen = 247 Blöcke + 14 "Rest Day!" + 4 "(Session-Hinweis)", 13 Wochen, 91 Tage
//   Tempo Runner:      216 Zeilen = 199 Blöcke + 14 "Rest Day!" + 3 "(Tageshinweis)",    12 Wochen, 84 Tage
//   Threshold Trainer: 173 Zeilen = 163 Blöcke +  9 "Rest Day!" + 1 "(Tageshinweis)",     8 Wochen, 56 Tage
const CASES = [
  { file: "hyrox-base-builder.json", weeks: 13, days: 91, blocks: 247, restDays: 14 },
  { file: "hyrox-tempo-runner.json", weeks: 12, days: 84, blocks: 199, restDays: 14 },
  { file: "hyrox-threshold-trainer.json", weeks: 8, days: 56, blocks: 163, restDays: 9 },
];

function load(file: string): string {
  return readFileSync(path.join(__dirname, "fixtures", file), "utf8");
}

describe("HYROX-Pläne lassen sich abbilden", () => {
  for (const c of CASES) {
    it(c.file, () => {
      const result = validatePlan(JSON.parse(load(c.file)));
      if (!result.ok) throw new Error(result.errors.slice(0, 10).join("\n"));
      const plan = result.plan;
      const days = plan.weeks.flatMap((w) => w.days);
      const blocks = days.flatMap((d) => d.sessions).flatMap((s) => (s.type === "program" ? s.blocks : []));
      expect(plan.weeks).toHaveLength(c.weeks);
      expect(days).toHaveLength(c.days);
      expect(blocks).toHaveLength(c.blocks);
      expect(days.filter((d) => d.sessions.length === 0)).toHaveLength(c.restDays);
    });
  }

  // "No Measure" steht in den Vorlagen nur an Ruhetagen – dort wird daraus ein Tag ohne Einheiten.
  it("alle übrigen Wertungen der Vorlagen kommen vor", () => {
    const types = new Set<string>();
    for (const c of CASES) {
      const plan = JSON.parse(load(c.file)) as PlanContent;
      for (const s of plan.weeks.flatMap((w) => w.days).flatMap((d) => d.sessions)) {
        if (s.type === "program") for (const b of s.blocks) types.add(b.scoring.rounds ? `${b.scoring.type}×n` : b.scoring.type);
      }
    }
    expect([...types].sort()).toEqual(
      ["calories×n", "checkmark", "distance", "distance×n", "reps", "reps×n", "rounds", "time", "time×n", "weight", "weight×n"].sort(),
    );
  });

  it("Upload in zwei Teilen (Wochen 1–6 und 7–13) ergibt denselben Plan", () => {
    const full = JSON.parse(load("hyrox-base-builder.json")) as PlanContent;
    const envelope = (weeks: PlanContent["weeks"]) =>
      JSON.stringify({ format: "pt-coach-export", exportVersion: 1, plan: { ...full, weeks } });
    const a = parsePlanImport(envelope(full.weeks.slice(0, 6)));
    const b = parsePlanImport(envelope(full.weeks.slice(6)));
    if (!a.ok || !b.ok) throw new Error("Teile ungültig");
    const merged = mergePlanParts([a.plan, b.plan]);
    expect(merged.ok).toBe(true);
    if (merged.ok) expect(merged.plan).toEqual(full);
  });
});
