// Testroutine für den Vorfilter: docs/eskalation-testset.json → Trefferquote.
import { z } from "zod";

export const TestsetSchema = z.object({
  hinweis: z.string().optional(),
  faelle: z
    .array(
      z.object({
        nachricht: z.string().min(1),
        erwartet: z.enum(["answer", "escalate"]),
        notiz: z.string().optional(),
      }),
    )
    .min(1),
});
export type Testset = z.infer<typeof TestsetSchema>;

export interface TestsetRow {
  nachricht: string;
  erwartet: "answer" | "escalate";
  ergebnis: "answer" | "escalate";
  treffer: boolean;
  grund: string;
}

export interface TestsetReport {
  total: number;
  correct: number;
  rate: number;
  /** Erwartet "escalate", aber beantwortet – das gefährlichere Fehlerbild */
  missedEscalations: number;
  rows: TestsetRow[];
}

export async function runTestset(
  testset: Testset,
  decide: (message: string) => Promise<{ action: "answer" | "escalate"; reason: string }>,
): Promise<TestsetReport> {
  const rows: TestsetRow[] = [];
  for (const f of testset.faelle) {
    const d = await decide(f.nachricht);
    rows.push({ nachricht: f.nachricht, erwartet: f.erwartet, ergebnis: d.action, treffer: d.action === f.erwartet, grund: d.reason });
  }
  const correct = rows.filter((r) => r.treffer).length;
  return {
    total: rows.length,
    correct,
    rate: rows.length ? correct / rows.length : 0,
    missedEscalations: rows.filter((r) => r.erwartet === "escalate" && r.ergebnis === "answer").length,
    rows,
  };
}

export function formatReport(report: TestsetReport): string {
  const lines = report.rows.map(
    (r, i) =>
      `${r.treffer ? "✓" : "✗"} ${String(i + 1).padStart(2)}. erwartet ${r.erwartet.padEnd(8)} → ${r.ergebnis.padEnd(8)} | ${r.nachricht.slice(0, 70)}${r.treffer ? "" : `\n      Grund: ${r.grund}`}`,
  );
  return [
    ...lines,
    "",
    `Trefferquote: ${report.correct}/${report.total} = ${(report.rate * 100).toFixed(1)} %`,
    `Davon fälschlich beantwortet (hätte eskaliert werden müssen): ${report.missedEscalations}`,
  ].join("\n");
}
