"use client";

import { keepFormOnSubmit } from "@/components/use-keep-form";
import { useActionState, useState } from "react";
import { suggestShortCode } from "@/lib/format";
import { createClientAccount, type CreateClientState } from "../actions";

export function NewClientForm() {
  const [state, action, pending] = useActionState<CreateClientState, FormData>(createClientAccount, {});
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [codeTouched, setCodeTouched] = useState(false);
  return (
    <form action={action} onSubmit={keepFormOnSubmit(action)} className="card space-y-4">
      <div>
        <label className="label" htmlFor="fullName">
          Name
        </label>
        <input
          id="fullName"
          name="fullName"
          className="input"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (!codeTouched) setCode(suggestShortCode(e.target.value));
          }}
          required
        />
      </div>
      <div>
        <label className="label" htmlFor="email">
          E-Mail (für die Anmeldung)
        </label>
        <input id="email" name="email" type="email" className="input" required />
      </div>
      <div>
        <label className="label" htmlFor="shortCode">
          Kürzel (erscheint statt des Namens im pseudonymisierten Export)
        </label>
        <input
          id="shortCode"
          name="shortCode"
          className="input"
          value={code}
          onChange={(e) => {
            setCodeTouched(true);
            setCode(e.target.value);
          }}
          required
        />
      </div>
      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
      <button className="btn-primary w-full sm:w-auto" disabled={pending}>
        {pending ? "Lege an …" : "Kunden anlegen"}
      </button>
      <p className="muted">
        Danach kann sich der Kunde mit dieser Adresse in der App anmelden (Link oder Code per E-Mail).
      </p>
    </form>
  );
}
