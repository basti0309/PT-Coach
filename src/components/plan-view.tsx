import Link from "next/link";
import { formatDate } from "@/lib/format";
import { listScheduledSessions, sessionDate, type ScheduledSession } from "@/lib/plan/dates";
import { sessionDetails, sessionTitle } from "@/lib/plan/describe";
import type { PlanContent } from "@/lib/plan/schema";

export interface SessionStatus {
  completed: boolean;
  source: "manual" | "strava";
}

const TYPE_STYLE = {
  strength: "bg-amber-100 text-amber-800",
  wod: "bg-rose-100 text-rose-800",
  endurance: "bg-emerald-100 text-emerald-800",
  program: "bg-sky-100 text-sky-800",
} as const;
const TYPE_LABEL = { strength: "Kraft", wod: "WOD", endurance: "Ausdauer", program: "Programm" } as const;

export function SessionCard({
  item,
  status,
  href,
  today,
}: {
  item: ScheduledSession;
  status?: SessionStatus;
  href?: string;
  today?: string;
}) {
  const s = item.session;
  const content = (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        {s.label && <span className="badge bg-slate-800 text-white">{s.label}</span>}
        <span className={`badge ${TYPE_STYLE[s.type]}`}>{TYPE_LABEL[s.type]}</span>
        <span className="font-semibold">{sessionTitle(s)}</span>
        {status?.completed && (
          <span className="badge bg-green-600 text-white">✓ erledigt{status.source === "strava" ? " (Strava)" : ""}</span>
        )}
        {status && !status.completed && <span className="badge bg-slate-200 text-slate-700">begonnen</span>}
        {!status && today && item.date < today && <span className="badge bg-slate-100 text-slate-500">offen</span>}
      </div>
      <ul className="text-sm text-slate-600">
        {sessionDetails(s).map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
      {s.type !== "endurance" && s.notes && <p className="whitespace-pre-line text-sm italic text-slate-500">{s.notes}</p>}
    </div>
  );
  return href ? (
    <Link href={href} className="block rounded-xl border border-slate-200 p-3 hover:border-brand-500">
      {content}
    </Link>
  ) : (
    <div className="rounded-xl border border-slate-200 p-3">{content}</div>
  );
}

export function PlanView({
  plan,
  statuses,
  today,
  hrefFor,
}: {
  plan: PlanContent;
  statuses: Map<string, SessionStatus>;
  today: string;
  hrefFor?: (item: ScheduledSession) => string;
}) {
  const items = listScheduledSessions(plan);
  const weeks = [...plan.weeks].sort((a, b) => a.week - b.week);
  return (
    <div className="space-y-4">
      {(plan.goal || plan.notes) && (
        <div className="card space-y-1 text-sm">
          {plan.goal && (
            <p>
              <strong>Ziel:</strong> {plan.goal}
            </p>
          )}
          {plan.notes && <p className="text-slate-600">{plan.notes}</p>}
        </div>
      )}
      {weeks.map((w) => {
        const weekItems = items.filter((i) => i.week === w.week);
        const days = [...w.days].sort((a, b) => a.day - b.day);
        return (
          <section key={w.week} className="card space-y-3">
            <h3 className="h2">
              Woche {w.week}
              {w.focus && <span className="font-normal text-slate-500"> · {w.focus}</span>}
            </h3>
            {days.length === 0 && <p className="muted">Keine Einheiten.</p>}
            {days.map((d) => {
              const date = sessionDate(plan.startDate, w.week, d.day);
              const dayItems = weekItems.filter((i) => i.day === d.day);
              return (
                <div key={d.day} className="space-y-2">
                  <p className={`text-sm font-semibold ${date === today ? "text-brand-600" : "text-slate-700"}`}>
                    {formatDate(date)}
                    {date === today && " · heute"}
                    {d.title && ` · ${d.title}`}
                  </p>
                  {d.notes && <p className="whitespace-pre-line text-sm text-slate-600">{d.notes}</p>}
                  {dayItems.length === 0 && <p className="muted">Ruhetag</p>}
                  {dayItems.map((item) => (
                    <SessionCard
                      key={item.session.id}
                      item={item}
                      status={statuses.get(item.session.id)}
                      href={hrefFor?.(item)}
                      today={today}
                    />
                  ))}
                </div>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}
