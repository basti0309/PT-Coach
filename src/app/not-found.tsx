import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60dvh] max-w-md flex-col justify-center gap-4 p-4 text-center">
      <h1 className="h1">Nicht gefunden</h1>
      <p className="muted">Diese Seite gibt es nicht oder du hast keinen Zugriff darauf.</p>
      <Link href="/" className="btn-primary">
        Zur Startseite
      </Link>
    </main>
  );
}
