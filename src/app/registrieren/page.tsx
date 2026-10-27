import Link from "next/link";
import type { Metadata } from "next";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Registrieren" };

export default function RegisterPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 p-4">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-xl font-extrabold text-white">PT</div>
        <h1 className="h1">Registrieren</h1>
        <p className="muted">Mit dem Einladungscode deines Coaches. Ein Passwort brauchst du nicht.</p>
      </div>
      <div className="card">
        <RegisterForm />
      </div>
      <p className="text-center text-sm">
        Schon registriert?{" "}
        <Link href="/login" className="text-brand-700 underline">
          Anmelden
        </Link>
      </p>
    </main>
  );
}
