import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { EscalationRuleRow } from "@/lib/db-types";
import { addRule, deleteRule, updateRule } from "./actions";

export const metadata = { title: "Eskalationsregeln" };

export default async function RulesPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("escalation_rules").select("*").order("sort").order("created_at");
  const rules = (data ?? []) as EscalationRuleRow[];
  const locked = rules.filter((r) => r.locked);
  const editable = rules.filter((r) => !r.locked);
  return (
    <div className="space-y-4">
      <h1 className="h1">Eskalationsregeln</h1>
      <p className="muted">Wann der KI-Vorfilter eine Nachricht an dich weiterleiten soll, statt selbst zu antworten.</p>

      <section className="card space-y-2">
        <h2 className="h2">🔒 Fest eingestellt (nicht abschaltbar)</h2>
        <p className="muted">
          Zusätzlich zur KI prüft die App diese Themen per Stichwortliste – ein Treffer wird immer an dich weitergeleitet, auch wenn die
          KI anders entscheiden würde.
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {locked.map((r) => (
            <li key={r.id}>{r.rule}</li>
          ))}
        </ul>
      </section>

      <section className="card space-y-3">
        <h2 className="h2">Eigene Regeln</h2>
        {editable.map((r) => (
          <div key={r.id} className="space-y-2 rounded-xl border border-slate-200 p-3">
            <form action={updateRule.bind(null, r.id)} className="space-y-2">
              <textarea name="rule" className="input min-h-16" defaultValue={r.rule} required />
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="active" className="h-5 w-5" defaultChecked={r.active} /> aktiv
                </label>
                <button className="btn-secondary btn-small">Speichern</button>
              </div>
            </form>
            <form action={deleteRule.bind(null, r.id)}>
              <button className="text-sm text-red-700 underline">Regel löschen</button>
            </form>
          </div>
        ))}
        <form action={addRule} className="space-y-2">
          <textarea name="rule" className="input min-h-16" placeholder="z. B. Fragen zu Ernährungsplänen → an den Coach" required />
          <button className="btn-primary btn-small">Regel hinzufügen</button>
        </form>
      </section>
    </div>
  );
}
