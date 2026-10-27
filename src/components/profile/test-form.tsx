"use client";

import { useActionState, useState } from "react";
import type { FormState } from "@/lib/actions/profile";
import type { TestKind } from "@/lib/db-types";
import { TEST_KIND_LABELS } from "@/lib/export/profile";

export function TestForm({ action, today }: { action: (prev: FormState, data: FormData) => Promise<FormState>; today: string }) {
  const [state, formAction, pending] = useActionState(action, {});
  const [kind, setKind] = useState<TestKind>("run_5k");
  return (
    <form action={formAction} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="label">Test</span>
          <select name="kind" className="input" value={kind} onChange={(e) => setKind(e.target.value as TestKind)}>
            {(Object.keys(TEST_KIND_LABELS) as TestKind[]).map((k) => (
              <option key={k} value={k}>
                {TEST_KIND_LABELS[k]}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label">Datum</span>
          <input type="date" name="tested_on" className="input" defaultValue={today} required />
        </label>
        {kind === "mobility" ? (
          <label className="block">
            <span className="label">Skala 1–10 (optional)</span>
            <input name="scale" className="input" inputMode="numeric" />
          </label>
        ) : (
          <label className="block">
            <span className="label">{kind === "run_5k" ? "Zeit (mm:ss)" : "Gewicht (kg)"}</span>
            <input name="value" className="input" inputMode={kind === "run_5k" ? "numeric" : "decimal"} required />
          </label>
        )}
      </div>
      <label className="block">
        <span className="label">{kind === "mobility" ? "Beschreibung" : "Notiz (optional)"}</span>
        <input name="note" className="input" />
      </label>
      {state.ok && <p className="text-sm text-green-700">{state.ok}</p>}
      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
      <button className="btn-secondary" disabled={pending}>
        {pending ? "Speichere …" : "Testwert hinzufügen"}
      </button>
    </form>
  );
}
