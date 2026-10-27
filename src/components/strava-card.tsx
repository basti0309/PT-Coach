import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import { env } from "@/lib/env";

const MESSAGES: Record<string, { text: string; ok: boolean }> = {
  verbunden: { text: "Strava ist verbunden. Neue Aktivitäten erscheinen ab jetzt automatisch.", ok: true },
  abgelehnt: { text: "Die Verbindung wurde bei Strava abgelehnt.", ok: false },
  berechtigung: {
    text: "Bitte bei Strava die Berechtigung „Alle Aktivitäten lesen (auch private)“ aktiviert lassen und erneut verbinden.",
    ok: false,
  },
  vergeben: { text: "Dieses Strava-Konto ist bereits mit einem anderen Kunden verbunden.", ok: false },
  fehler: { text: "Die Verbindung mit Strava hat nicht geklappt. Bitte erneut versuchen.", ok: false },
};

/** Strava-Verbindung für den Kunden (Status ohne Tokens, über my_strava_status()). */
export async function StravaCard({ status }: { status?: string }) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("my_strava_status");
  const row = Array.isArray(data) ? data[0] : data;
  const connected = Boolean(row?.connected);
  const msg = status ? MESSAGES[status] : undefined;
  return (
    <section className="card space-y-2">
      <h2 className="h2">Strava</h2>
      {msg && <p className={`rounded-lg p-2 text-sm ${msg.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>{msg.text}</p>}
      {connected ? (
        <>
          <p className="text-sm">
            ✓ Verbunden seit {formatDateTime(row.connected_at, env.timeZone())}. Neue Aktivitäten werden automatisch der passenden
            geplanten Einheit zugeordnet.
          </p>
          <p className="muted">
            Distanz, Puls und Abweichungen siehst nur du; dein Coach sieht nur Dauer und Erledigt-Status. Trennen: bei Strava unter
            Einstellungen → Meine Apps → PT-Coach „Zugriff entziehen“ – dann werden alle Strava-Daten hier gelöscht.
          </p>
        </>
      ) : (
        <>
          <p className="muted">
            Verbinde Strava, damit Läufe, Radfahrten usw. automatisch eingetragen werden. Es werden nur Aktivitäten ab der Verbindung
            übernommen und nur Sportart, Start, Dauer, Distanz und Ø-Puls gespeichert.
          </p>
          <a href="/api/strava/verbinden" className="btn inline-flex bg-[#fc4c02] text-white hover:bg-[#e34402]">
            Mit Strava verbinden
          </a>
        </>
      )}
    </section>
  );
}
