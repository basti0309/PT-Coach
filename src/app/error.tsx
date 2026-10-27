"use client";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-[60dvh] max-w-md flex-col justify-center gap-4 p-4 text-center">
      <h1 className="h1">Da ist etwas schiefgelaufen</h1>
      <p className="muted whitespace-pre-line">{error.message || "Unbekannter Fehler."}</p>
      <button className="btn-primary" onClick={reset}>
        Erneut versuchen
      </button>
    </main>
  );
}
