import Link from "next/link";
import { PlanView } from "@/components/plan-view";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loadPlans, loadPlanWithVersion, loadSessionLogs } from "@/lib/data/plans";
import { formatDate } from "@/lib/format";
import { appToday } from "@/lib/today";
import { activatePlan, createPlan, deletePlan } from "./actions";

export default async function CoachPlanPage({ params, searchParams }: PageProps<"/coach/kunden/[clientId]/plan">) {
  const { clientId } = await params;
  const { plan: selectedId } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const plans = await loadPlans(supabase, clientId);
  const selected = plans.find((p) => p.id === selectedId) ?? plans.find((p) => p.is_active) ?? plans[0];
  const data = selected ? await loadPlanWithVersion(supabase, selected.id) : null;
  const logs = selected ? await loadSessionLogs(supabase, clientId, selected.id) : new Map();
  const today = appToday();
  const base = `/coach/kunden/${clientId}/plan`;

  return (
    <div className="space-y-4">
      {plans.length > 0 && (
        <div className="card space-y-2">
          <h2 className="h2">Pläne</h2>
          <ul className="space-y-1">
            {plans.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-2">
                <Link href={`${base}?plan=${p.id}`} className={p.id === selected?.id ? "font-semibold text-brand-700" : ""}>
                  {p.title}
                </Link>
                <span className="muted">v{p.current_version}</span>
                {p.is_active ? (
                  <span className="badge bg-green-100 text-green-800">aktiv</span>
                ) : (
                  <form action={activatePlan.bind(null, clientId, p.id)}>
                    <button className="btn-secondary btn-small">aktiv setzen</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {data && selected && (
        <>
          <div className="flex flex-wrap gap-2">
            <Link className="btn-primary" href={`${base}/${selected.id}/bearbeiten`}>
              Bearbeiten
            </Link>
            <Link className="btn-secondary" href={`${base}/${selected.id}/export`}>
              Export & KI-Prompt
            </Link>
            <Link className="btn-secondary" href={`${base}/${selected.id}/import`}>
              Import
            </Link>
            <Link className="btn-secondary" href={`${base}/${selected.id}/versionen`}>
              Versionen ({selected.current_version})
            </Link>
          </div>
          <p className="muted">
            Start: {formatDate(data.version.content.startDate)} · Version {data.version.version}
          </p>
          <details className="card">
            <summary className="cursor-pointer py-1 font-semibold">Plan „{selected.title}“ löschen …</summary>
            <form action={deletePlan.bind(null, clientId, selected.id)} className="mt-3 space-y-3">
              <label className="flex min-h-11 items-start gap-2">
                <input type="checkbox" name="confirm" value="ja" className="mt-1 h-5 w-5" required />
                <span>
                  Plan mit allen Versionen endgültig löschen{selected.is_active && " (das ist der aktive Plan – der Kunde hat danach keinen Plan)"}. Erfasste
                  Trainings bleiben im Verlauf, nur ohne Plan-Bezug.
                </span>
              </label>
              <button className="btn-danger">Plan löschen</button>
            </form>
          </details>
          <PlanView
            plan={data.version.content}
            statuses={new Map([...logs].map(([k, l]) => [k, { completed: l.completed, source: l.source }]))}
            today={today}
            hrefFor={(item) => `/coach/kunden/${clientId}/training/erfassen?plan=${selected.id}&einheit=${item.session.id}`}
          />
        </>
      )}

      <form action={createPlan.bind(null, clientId)} className="card space-y-3">
        <h2 className="h2">Neuen Plan anlegen</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="title">
              Titel
            </label>
            <input id="title" name="title" className="input" placeholder="z. B. Grundlage Winter" required />
          </div>
          <div>
            <label className="label" htmlFor="startDate">
              Startdatum (Tag 1 von Woche 1)
            </label>
            <input id="startDate" name="startDate" type="date" className="input" defaultValue={today} required />
          </div>
        </div>
        <p className="muted">Der neue Plan wird der aktive Plan des Kunden. Inhalte per Editor oder über „Export & Prompt“.</p>
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary">Leeren Plan anlegen</button>
          <Link className="btn-primary" href={`${base}/neu`}>
            Export & Prompt (neuer Plan)
          </Link>
        </div>
      </form>
    </div>
  );
}
