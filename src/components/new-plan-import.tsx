"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PlanView } from "@/components/plan-view";
import { formatDate } from "@/lib/format";
import { mergePlanParts } from "@/lib/plan/merge";
import type { PlanContent } from "@/lib/plan/schema";
import { parsePlanImport } from "@/lib/plan/validate";

type CreateFn = (
  content: PlanContent,
  note: string,
) => Promise<{ ok: true; version: number; planId?: string } | { ok: false; errors: string[] }>;

function ErrorList({ errors }: { errors: string[] }) {
  if (errors.length === 0) return null;
  return (
    <div className="max-h-72 overflow-auto rounded-lg bg-red-50 p-3 text-sm text-red-800">
      <p className="font-semibold">
        Das kann so nicht übernommen werden ({errors.length} Problem{errors.length > 1 ? "e" : ""}):
      </p>
      <ul className="list-disc pl-5">
        {errors.map((e, i) => (
          <li key={i}>{e}</li>
        ))}
      </ul>
    </div>
  );
}

/** Upload der KI-Antwort für einen neuen Plan – auch in mehreren Teilen (z. B. Wochen 1–4, 5–8). */
export function NewPlanImport({ create, planBaseHref, today }: { create: CreateFn; planBaseHref: string; today: string }) {
  const [text, setText] = useState("");
  const [parts, setParts] = useState<PlanContent[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [note, setNote] = useState("Neuer Plan (KI)");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const addPart = (value: string) => {
    const result = parsePlanImport(value);
    if (!result.ok) return setErrors(result.errors);
    setErrors([]);
    setText("");
    setParts((prev) => [...prev, result.plan]);
  };

  const merged = parts.length > 0 ? mergePlanParts(parts) : null;
  const plan = merged?.ok ? merged.plan : null;
  const days = plan ? plan.weeks.flatMap((w) => w.days) : [];
  const sessions = days.flatMap((d) => d.sessions);
  const blocks = sessions.reduce((n, s) => n + (s.type === "program" ? s.blocks.length : 0), 0);

  const apply = () => {
    if (!plan) return;
    startTransition(async () => {
      const result = await create(plan, note);
      if (result.ok && result.planId) {
        router.push(`${planBaseHref}?plan=${result.planId}`);
        router.refresh();
      } else if (!result.ok) {
        setErrors(result.errors);
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <label className="label" htmlFor="ki-antwort">
          Antwort der KI einfügen {parts.length > 0 && `(Teil ${parts.length + 1})`}
        </label>
        <textarea
          id="ki-antwort"
          className="input min-h-40 font-mono text-xs"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder='{"format": "pt-coach-export", ...}'
        />
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="btn-primary" onClick={() => addPart(text)} disabled={!text.trim()}>
            {parts.length === 0 ? "Prüfen" : "Teil hinzufügen"}
          </button>
          <label className="btn-secondary cursor-pointer">
            Datei hochladen
            <input
              type="file"
              accept="application/json,.json,.txt"
              multiple
              className="hidden"
              onChange={async (e) => {
                const files = [...(e.target.files ?? [])];
                e.target.value = "";
                for (const f of files) addPart(await f.text());
              }}
            />
          </label>
        </div>
        <p className="muted">Hat die KI den Plan in mehreren Teilen geliefert, jeden Teil nacheinander hinzufügen – die App fügt sie zusammen.</p>
        <ErrorList errors={errors} />
      </div>

      {parts.length > 0 && (
        <div className="card space-y-3">
          <h3 className="h2">Hochgeladene Teile</h3>
          <ul className="space-y-1 text-sm">
            {parts.map((p, i) => (
              <li key={i} className="flex flex-wrap items-center gap-2">
                <span>
                  Teil {i + 1}: Woche {p.weeks.map((w) => w.week).join(", ")}
                </span>
                <button type="button" className="btn-danger btn-small" onClick={() => setParts((prev) => prev.filter((_, j) => j !== i))}>
                  entfernen
                </button>
              </li>
            ))}
          </ul>
          {merged && !merged.ok && <ErrorList errors={merged.errors} />}
          {plan && (
            <>
              <p className="text-sm">
                <strong>{plan.title}</strong> · Start {formatDate(plan.startDate)} · {plan.weeks.length} Wochen · {days.length} Tage
                (davon {days.filter((d) => d.sessions.length === 0).length} Ruhetage) · {sessions.length} Einheiten
                {blocks > 0 && ` · ${blocks} Blöcke`}
              </p>
              <details>
                <summary className="cursor-pointer text-sm font-medium">Plan ansehen</summary>
                <div className="mt-2">
                  <PlanView plan={plan} statuses={new Map()} today={today} />
                </div>
              </details>
              <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Notiz zur Version" />
              <button type="button" className="btn-primary" onClick={apply} disabled={pending}>
                {pending ? "Lege an …" : "Plan anlegen und aktiv setzen"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
