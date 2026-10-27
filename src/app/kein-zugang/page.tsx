export default function KeinZugang() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-4 p-4 text-center">
      <h1 className="h1">Kein Zugang</h1>
      <p className="muted">
        Für dieses Konto ist noch kein Zugang eingerichtet. Bitte wende dich an deinen Coach.
      </p>
      <form action="/auth/abmelden" method="post">
        <button className="btn-secondary w-full">Abmelden</button>
      </form>
    </main>
  );
}
