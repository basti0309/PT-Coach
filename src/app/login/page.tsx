import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Anmelden" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { fehler } = await searchParams;
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 p-4">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-xl font-extrabold text-white">
          PT
        </div>
        <h1 className="h1">PT-Coach</h1>
        <p className="muted">Anmeldung ohne Passwort – per Link oder Code aus der E-Mail.</p>
      </div>
      {fehler && (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
          Die Anmeldung hat nicht geklappt (Link abgelaufen oder schon benutzt). Bitte erneut anfordern.
        </p>
      )}
      <div className="card">
        <LoginForm />
      </div>
      <p className="text-center text-sm">
        Neu hier?{" "}
        <Link href="/registrieren" className="text-brand-700 underline">
          Mit Einladungscode registrieren
        </Link>
      </p>
    </main>
  );
}
