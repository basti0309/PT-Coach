import Link from "next/link";
import { SessionCard } from "@/components/plan-view";
import { requireClient } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loadActivePlan, loadSessionLogs } from "@/lib/data/plans";
import { listScheduledSessions, planWeekOf } from "@/lib/plan/dates";
import { formatDate } from "@/lib/format";
import { appToday } from "@/lib/today";

export default async function KundeHeute() {
  const viewer = await requireClient();
  const supabase = await createSupabaseServerClient();
  const today = appToday();
  const active = await loadActivePlan(supabase, viewer.userId);
  const logs = active ? await loadSessionLogs(supabase, viewer.userId, active.plan.id) : new Map();
  const items = active ? listScheduledSessions(active.version.content) : [];
  const week = active ? planWeekOf(active.version.content, today) : null;
  const todays = items.filter((i) => i.date === today);
  const openThisWeek = items.filter((i) => i.week === week && i.date !== today && !logs.get(i.session.id)?.completed);
  const href = (sessionId: string) => `/kunde/training/erfassen?plan=${active!.plan.id}&einheit=${encodeURIComponent(sessionId)}`;
  const status = (id: string) => {
    const l = logs.get(id);
    return l ? { completed: l.completed, source: l.source } : undefined;
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="muted">{formatDate(today)}</p>
        <h1 className="h1">Hallo {viewer.fullName.split(" ")[0]}!</h1>
      </div>

      {!active && <p className="card muted">Noch kein Plan – dein Coach legt ihn bald an.</p>}

      {active && (
        <section className="space-y-2">
          <h2 className="h2">Heute</h2>
          {todays.length === 0 && <p className="card muted">Heute ist nichts geplant.</p>}
          {todays.map((i) => (
            <SessionCard key={i.session.id} item={i} status={status(i.session.id)} href={href(i.session.id)} />
          ))}
        </section>
      )}

      {openThisWeek.length > 0 && (
        <section className="space-y-2">
          <h2 className="h2">Noch offen diese Woche</h2>
          {openThisWeek.map((i) => (
            <div key={i.session.id} className="space-y-1">
              <p className="text-xs font-semibold text-slate-500">{formatDate(i.date)}</p>
              <SessionCard item={i} status={status(i.session.id)} href={href(i.session.id)} today={today} />
            </div>
          ))}
        </section>
      )}

      <section className="flex flex-wrap gap-2">
        <Link href="/kunde/training/ausdauer" className="btn-secondary">
          + Ausdauer eintragen
        </Link>
        <Link href="/kunde/plan" className="btn-secondary">
          Ganzen Plan ansehen
        </Link>
      </section>
    </div>
  );
}
