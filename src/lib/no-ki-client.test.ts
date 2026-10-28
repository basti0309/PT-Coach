// Im Kundenkonto taucht das Wort „KI“ nicht auf (Vorgabe der Betreiberin). Ausnahme: die Kennzeichnung
// automatischer Chat-Antworten (Transparenz, AI Act Art. 50). Geprüft werden alle Oberflächen-Dateien (.tsx),
// die von den Kundenseiten aus importiert werden, und die Texte für Kunden in lib (Einwilligung), ohne Kommentare.
// Server-interne Texte (z. B. Vorfilter-Begründungen, die nur der Coach sieht) sind nicht betroffen.
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "..");
/** Ausnahmen: Chat-Kennzeichnung (gewollt) und Bausteine, die nur für den Coach gerendert werden. */
const ALLOWED = new Set(["components/chat-thread.tsx", "components/questionnaire/derived-view.tsx", "components/export-panel.tsx"]);
/** Nicht-Oberflächen-Dateien mit Texten, die der Kunde sieht */
const CLIENT_TEXT_LIB = new Set(["lib/questionnaire/schema.ts"]);

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : /\.(tsx?|ts)$/.test(f) ? [p] : [];
  });
}

function resolve(from: string, spec: string): string | null {
  const base = spec.startsWith("@/") ? path.join(ROOT, spec.slice(2)) : spec.startsWith(".") ? path.resolve(path.dirname(from), spec) : null;
  if (!base) return null;
  for (const c of [base, `${base}.tsx`, `${base}.ts`, path.join(base, "index.ts")]) if (existsSync(c) && statSync(c).isFile()) return c;
  return null;
}

function clientFiles(): string[] {
  const seen = new Set<string>();
  const queue = walk(path.join(ROOT, "app", "kunde"));
  while (queue.length) {
    const f = queue.pop()!;
    if (seen.has(f)) continue;
    seen.add(f);
    const src = readFileSync(f, "utf8");
    for (const m of src.matchAll(/from\s+"([^"]+)"/g)) {
      const r = resolve(f, m[1]);
      if (r && !r.endsWith(".test.ts")) queue.push(r);
    }
  }
  return [...seen];
}

const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");

describe("Kein „KI“ im Kundenkonto", () => {
  it("die Kundenseiten und ihre Bausteine enthalten das Wort nicht (außer Chat-Kennzeichnung)", () => {
    const files = clientFiles();
    expect(files.length).toBeGreaterThan(20); // Import-Auflösung funktioniert
    const hits = files
      .map((f) => path.relative(ROOT, f))
      .filter((rel) => !ALLOWED.has(rel) && (rel.endsWith(".tsx") || CLIENT_TEXT_LIB.has(rel)))
      .flatMap((rel) =>
        stripComments(readFileSync(path.join(ROOT, rel), "utf8"))
          .split("\n")
          .filter((line) => /\bKI\b/.test(line))
          .map((line) => `${rel}: ${line.trim()}`),
      );
    expect(hits).toEqual([]);
  });
});
