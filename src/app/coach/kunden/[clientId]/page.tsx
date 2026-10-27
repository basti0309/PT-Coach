import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loadActivePlan, loadSessionLogs } from "@/lib/data/plans";
import { listScheduledSessions } from "@/lib/plan/dates";
import { sessionTitle } from "@/lib/plan/describe";
import { formatDate, formatDuration } from "@/lib/format";
import { appToday } from "@/lib/today";
import type { WorkoutLogRow } from "@/lib/db-types";

export default async function ClientOverview({ params }: PageProps<"/coach/kunden/[clientId]">) {
  const { clientId } = await params;
  const supabase = await createSupabaseServerClient();
  const today = appToday();
  const [active, { data: recent }, { count: openMessages }] = await Promise.all([
    loadActivePlan(supabase, clientId),
    supabase.from("workout_logs").select("*").eq("client_id", clientId).order("performed_on", { ascending: false }).limit(5),
    supabase.from("messages").select("id", { count: "exact", head: true }).eq("client_id", clientId).eq("needs_coach", true).is("resolved_at", null),
  ]);
  const logs = active ? await loadSessionLogs(supabase, clientId, active.plan.id) : new Map();
  const upcoming = active ? listScheduledSessions(active.version.content).filter((i) => i.date >= today).slice(0, 5) : [];
  const base = `/coach/kunden/${clientId}`;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <section className="card space-y-2">
        <h2 className="h2">Aktiver Plan</h2>
        {active ? (
          <>
            <p>
              <Link className="font-semibold text-brand-700" href={`${base}/plan`}>
                {active.version.content.title}
              </Link>{" "}
              <span className="muted">Version {active.version.version}</span>
            </p>
            <ul className="space-y-1 text-sm">
              {upcoming.map((i) => (
                <li key={i.session.id}>
                  {formatDate(i.date)} · {sessionTitle(i.session)} {logs.get(i.session.id)?.completed && "✓"}
                </li>
              ))}
              {upcoming.length === 0 && <li className="muted">Keine anstehenden Einheiten.</li>}
            </ul>
          </>
        ) : (
          <p className="muted">
            Kein aktiver Plan.{" "}
            <Link className="text-brand-700 underline" href={`${base}/plan`}>
              Plan anlegen
            </Link>
          </p>
        )}
      </section>
      <section className="card space-y-2">
        <h2 className="h2">Letzte Trainings</h2>
        <ul className="space-y-1 text-sm">
          {((recent ?? []) as WorkoutLogRow[]).map((l) => (
            <li key={l.id}>
              {formatDate(l.performed_on)} · {l.title || l.kind} {l.completed ? "✓" : "(begonnen)"}
              {l.duration_seconds != null && ` · ${formatDuration(l.duration_seconds)}`}
              {l.source === "strava" && " · Strava"}
            </li>
          ))}
          {(recent ?? []).length === 0 && <li className="muted">Noch keine.</li>}
        </ul>
        <Link className="text-sm text-brand-700 underline" href={`${base}/training`}>
          Alle Trainings
        </Link>
      </section>
      <section className="card space-y-2">
        <h2 className="h2">Nachrichten</h2>
        <p className="text-sm">{openMessages ? `${openMessages} offene Nachricht(en) im Posteingang` : "Keine offenen Nachrichten."}</p>
        <Link className="text-sm text-brand-700 underline" href={`${base}/chat`}>
          Zum Chat
        </Link>
      </section>
    </div>
  );
}
