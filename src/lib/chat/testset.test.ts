import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createClaudeClassifier } from "./claude";
import { runPrefilter } from "./prefilter";
import { formatReport, runTestset, TestsetSchema } from "./testset";

const testset = TestsetSchema.parse(JSON.parse(readFileSync("docs/eskalation-testset.json", "utf8")));

describe("Eskalations-Testset", () => {
  it("docs/eskalation-testset.json hat das richtige Format", () => {
    expect(testset.faelle.length).toBeGreaterThanOrEqual(5);
  });

  it("Trefferquote wird korrekt berechnet", async () => {
    // Fake-Entscheider: eskaliert alles → trifft nur die 'escalate'-Fälle
    const report = await runTestset(testset, async () => ({ action: "escalate", reason: "immer" }));
    const expected = testset.faelle.filter((f) => f.erwartet === "escalate").length;
    expect(report.correct).toBe(expected);
    expect(report.rate).toBeCloseTo(expected / testset.faelle.length, 10);
    expect(report.missedEscalations).toBe(0);
    expect(formatReport(report)).toContain(`Trefferquote: ${expected}/${testset.faelle.length}`);
  });

  // Echter Lauf gegen die Claude API – nur wenn ANTHROPIC_API_KEY gesetzt ist (kostet API-Guthaben).
  it.skipIf(!process.env.ANTHROPIC_API_KEY)(
    "Live: Vorfilter gegen das Testset (Trefferquote wird ausgegeben)",
    async () => {
      const classify = createClaudeClassifier(process.env.ANTHROPIC_API_KEY!, process.env.ANTHROPIC_MODEL || "claude-opus-5-5");
      const ctx = { rules: [], knowledge: [], profileJson: "", planJson: "", history: [] };
      const report = await runTestset(testset, (m) => runPrefilter(m, ctx, classify));
      console.log(formatReport(report));
      expect(report.total).toBe(testset.faelle.length);
    },
    300_000,
  );
});
