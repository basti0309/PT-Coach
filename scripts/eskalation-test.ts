// Testroutine: lässt docs/eskalation-testset.json gegen den KI-Vorfilter laufen und gibt die Trefferquote aus.
// Aufruf (z. B. in Claude Code im Web): npm run test:eskalation
// Benötigt ANTHROPIC_API_KEY. Optional NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY:
// dann werden die echten Eskalationsregeln und die Wissensbasis aus der Datenbank verwendet.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { createClaudeClassifier } from "../src/lib/chat/claude";
import { runPrefilter, type PrefilterContext } from "../src/lib/chat/prefilter";
import { formatReport, runTestset, TestsetSchema } from "../src/lib/chat/testset";

async function loadContext(): Promise<PrefilterContext> {
  const ctx: PrefilterContext = { rules: [], knowledge: [], profileJson: "", planJson: "", history: [] };
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.log("Hinweis: ohne Supabase-Zugang – nur Pflichtregeln, leere Wissensbasis.\n");
    return ctx;
  }
  const db = createClient(url, key, { auth: { persistSession: false } });
  const [{ data: rules }, { data: kb }] = await Promise.all([
    db.from("escalation_rules").select("rule").eq("active", true).order("sort"),
    db.from("knowledge_entries").select("kind, title, content"),
  ]);
  ctx.rules = (rules ?? []).map((r) => r.rule);
  ctx.knowledge = kb ?? [];
  console.log(`Kontext aus Supabase: ${ctx.rules.length} Regeln, ${ctx.knowledge.length} Wissenseinträge.\n`);
  return ctx;
}

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY fehlt – Test kann nicht laufen.");
    process.exit(1);
  }
  const testset = TestsetSchema.parse(JSON.parse(readFileSync("docs/eskalation-testset.json", "utf8")));
  const ctx = await loadContext();
  const classify = createClaudeClassifier(apiKey, process.env.ANTHROPIC_MODEL || "claude-opus-5-5");
  const report = await runTestset(testset, (m) => runPrefilter(m, ctx, classify));
  console.log(formatReport(report));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
