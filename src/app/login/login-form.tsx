"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "./actions";

const EMPTY: LoginState = { step: "email", email: "" };

export function LoginForm({ initial = EMPTY }: { initial?: LoginState }) {
  const [state, action, pending] = useActionState(loginAction, initial);

  if (state.step === "code") {
    return (
      <div className="space-y-4">
        <p className="rounded-xl bg-brand-50 p-3 text-sm text-brand-700">{state.message}</p>
        <form action={action} className="space-y-3">
          <input type="hidden" name="intent" value="code" />
          <label className="label" htmlFor="code">
            Code aus der E-Mail
          </label>
          <input
            id="code"
            name="code"
            className="input text-center text-2xl tracking-widest"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            required
          />
          {state.error && <p className="text-sm text-red-700">{state.error}</p>}
          <button className="btn-primary w-full" disabled={pending}>
            {pending ? "Prüfe …" : "Anmelden"}
          </button>
        </form>
        <form action={action}>
          <input type="hidden" name="intent" value="email" />
          <input type="hidden" name="email" value={state.email} />
          <button className="btn-secondary w-full" disabled={pending}>
            Neuen Code senden
          </button>
        </form>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="intent" value="email" />
      <label className="label" htmlFor="email">
        E-Mail-Adresse
      </label>
      <input id="email" name="email" type="email" className="input" autoComplete="email" defaultValue={state.email} required />
      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
      <button className="btn-primary w-full" disabled={pending}>
        {pending ? "Sende …" : "Anmeldelink senden"}
      </button>
    </form>
  );
}
