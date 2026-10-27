"use client";

import { keepFormOnSubmit } from "@/components/use-keep-form";
import { useActionState } from "react";
import { LoginForm } from "../login/login-form";
import { registerWithInvite, type RegisterState } from "./actions";

export function RegisterForm() {
  const [state, action, pending] = useActionState<RegisterState, FormData>(registerWithInvite, {});
  if (state.done && state.email) {
    return (
      <LoginForm
        initial={{
          step: "code",
          email: state.email,
          message: "Dein Konto ist angelegt. Wir haben dir eine E-Mail geschickt – tippe auf den Link oder gib den Code hier ein.",
        }}
      />
    );
  }
  return (
    <form action={action} onSubmit={keepFormOnSubmit(action)} className="space-y-3">
      <label className="block">
        <span className="label">Name</span>
        <input name="fullName" className="input" autoComplete="name" required />
      </label>
      <label className="block">
        <span className="label">E-Mail-Adresse</span>
        <input name="email" type="email" className="input" autoComplete="email" required />
      </label>
      <label className="block">
        <span className="label">Einladungscode (von deinem Coach)</span>
        <input name="code" className="input" autoCapitalize="characters" autoComplete="off" required />
      </label>
      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
      <button className="btn-primary w-full" disabled={pending}>
        {pending ? "Registriere …" : "Registrieren"}
      </button>
    </form>
  );
}
