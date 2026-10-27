"use client";

import { keepFormOnSubmit } from "@/components/use-keep-form";
import { useActionState } from "react";
import { saveInviteCode, type InviteState } from "./invite-actions";

export function InviteForm({ current, registerUrl }: { current: string | null; registerUrl: string }) {
  const [state, action, pending] = useActionState<InviteState, FormData>(saveInviteCode, {});
  return (
    <div className="space-y-3">
      <p className="text-sm">
        Status:{" "}
        {current ? (
          <>
            <span className="font-semibold text-green-700">offen</span> – aktueller Code:{" "}
            <code className="rounded bg-slate-100 px-2 py-0.5 text-base font-bold tracking-wider">{current}</code>
          </>
        ) : (
          <span className="font-semibold text-slate-700">geschlossen (kein Code gesetzt)</span>
        )}
      </p>
      <p className="muted">
        Link für Interessenten: <code className="break-all rounded bg-slate-100 px-1">{registerUrl}</code>. Wer den Code kennt, wird sofort
        Kunde. Code ändern macht den alten ungültig.
      </p>
      <form action={action} onSubmit={keepFormOnSubmit(action)} className="flex flex-wrap items-end gap-2">
        <label className="block min-w-48 flex-1">
          <span className="label">Eigenen Code festlegen</span>
          <input name="code" className="input uppercase" placeholder="z. B. FIT-WINTER-26" />
        </label>
        <button name="intent" value="set" className="btn-secondary" disabled={pending}>
          Speichern
        </button>
        <button name="intent" value="generate" className="btn-secondary" disabled={pending}>
          Zufallscode erzeugen
        </button>
        {current && (
          <button name="intent" value="close" className="btn-danger" disabled={pending}>
            Registrierung schließen
          </button>
        )}
      </form>
      {state.ok && <p className="text-sm text-green-700">{state.ok}</p>}
      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
    </div>
  );
}
