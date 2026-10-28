"use client";

import { useActionState, useState } from "react";
import type { DeleteHistoryState } from "@/lib/actions/training";

/** Coach: Trainingsverlauf löschen – alles oder ein Zeitraum, mit Bestätigung. */
export function HistoryDelete({ action }: { action: (prev: DeleteHistoryState, data: FormData) => Promise<DeleteHistoryState> }) {
  const [state, formAction, pending] = useActionState(action, {});
  const [scope, setScope] = useState<"all" | "range">("all");
  return (
    <details className="card">
      <summary className="cursor-pointer py-1 font-semibold">Trainingsverlauf löschen …</summary>
      <form action={formAction} className="mt-3 space-y-3">
        <fieldset className="space-y-2">
          <label className="flex min-h-11 items-center gap-2">
            <input type="radio" name="scope" value="all" className="h-5 w-5" checked={scope === "all"} onChange={() => setScope("all")} />
            gesamten Verlauf
          </label>
          <label className="flex min-h-11 items-center gap-2">
            <input type="radio" name="scope" value="range" className="h-5 w-5" checked={scope === "range"} onChange={() => setScope("range")} />
            Zeitraum
          </label>
        </fieldset>
        {scope === "range" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="label">von (leer = ab Beginn)</span>
              <input type="date" name="from" className="input" />
            </label>
            <label className="block">
              <span className="label">bis (leer = bis heute)</span>
              <input type="date" name="to" className="input" />
            </label>
          </div>
        )}
        <label className="flex min-h-11 items-start gap-2">
          <input type="checkbox" name="confirm" value="ja" className="mt-1 h-5 w-5" required />
          <span>
            Ich will diese Einheiten endgültig löschen – auch Strava-Einträge und ihre Strava-Werte sowie erfasste Sätze und Ergebnisse.
          </span>
        </label>
        {state.ok && <p className="text-sm text-green-700">{state.ok}</p>}
        {state.error && <p className="text-sm text-red-700">{state.error}</p>}
        <button className="btn-danger" disabled={pending}>
          {pending ? "Lösche …" : "Endgültig löschen"}
        </button>
      </form>
    </details>
  );
}
