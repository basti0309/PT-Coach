"use client";

import { useActionState, useState } from "react";
import type { FormState } from "@/lib/actions/profile";
import { isRepsKind, TEST_KIND_META, TEST_KINDS, type TestKind } from "@/lib/plan/test-kinds";

const VALUE_LABEL = { s: "Zeit (mm:ss)", kg: "Gewicht (kg)", m: "Strecke (m)", reps: "Wiederholungen" } as const;

export function TestForm({
  action,
  today,
  kinds = TEST_KINDS,
}: {
  action: (prev: FormState, data: FormData) => Promise<FormState>;
  today: string;
  kinds?: readonly TestKind[];
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [kind, setKind] = useState<TestKind>(kinds[0]);
  const meta = TEST_KIND_META[kind];
  return (
    <form action={formAction} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="label">Test</span>
          <select name="kind" className="input" value={kind} onChange={(e) => setKind(e.target.value as TestKind)}>
            {kinds.map((k) => (
              <option key={k} value={k}>
                {TEST_KIND_META[k].label}
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
            <span className="label">{meta.unit ? VALUE_LABEL[meta.unit] : "Wert"}</span>
            <input
              name="value"
              className="input"
              inputMode={meta.unit === "kg" ? "decimal" : "numeric"}
              placeholder={meta.hint}
              required
            />
          </label>
        )}
        {isRepsKind(kind) && (
          <>
            <label className="block">
              <span className="label">Wiederholungen</span>
              <input name="reps" className="input" inputMode="numeric" required />
            </label>
            <label className="block">
              <span className="label">Wdh. in Reserve (RIR)</span>
              <select name="rir" className="input" defaultValue="" required>
                <option value="" disabled>
                  – bitte wählen –
                </option>
                <option value="0">0 – keine weitere Wdh. möglich</option>
                <option value="1">1 – noch 1 Wdh. möglich</option>
                <option value="2">2 – noch 2 Wdh. möglich</option>
                <option value="3">3 – noch 3 Wdh. möglich</option>
                <option value="4">4 oder mehr</option>
              </select>
            </label>
          </>
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
