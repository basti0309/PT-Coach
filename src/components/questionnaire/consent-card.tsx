"use client";

import { useActionState } from "react";
import type { FormState } from "@/lib/actions/profile";
import { CONSENT_TEXT } from "@/lib/questionnaire/schema";

/** Ausdrückliche Einwilligung nach Art. 9 Abs. 2 lit. a DSGVO: eigener Schritt, nicht vorausgewählt. */
export function ConsentCard({ action }: { action: (prev: FormState, data: FormData) => Promise<FormState> }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="card space-y-3">
      <h2 className="h2">Einwilligung Gesundheitsdaten</h2>
      <ul className="list-disc space-y-1 pl-5 text-sm">
        {CONSENT_TEXT.map((t, i) => (
          <li key={i}>{t}</li>
        ))}
      </ul>
      <label className="flex min-h-11 items-start gap-2">
        <input type="checkbox" name="confirm" value="ja" className="mt-1 h-5 w-5" required />
        <span>Ich willige ein.</span>
      </label>
      {state.ok && <p className="text-sm text-green-700">{state.ok}</p>}
      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
      <button className="btn-primary" disabled={pending}>
        {pending ? "Speichere …" : "Einwilligung erteilen"}
      </button>
    </form>
  );
}
