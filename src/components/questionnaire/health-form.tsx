"use client";

import { useActionState, useState, useTransition } from "react";
import type { FormState } from "@/lib/actions/profile";
import { formatNumber, parseDecimal } from "@/lib/format";
import { BODY_REGION_LABELS, BODY_REGIONS, type Health } from "@/lib/questionnaire/schema";

export function HealthForm({ initial, action }: { initial: Health | null; action: (prev: FormState, data: FormData) => Promise<FormState> }) {
  const [state, formAction, pending] = useActionState(action, {});
  const [, startTransition] = useTransition();
  const h = initial ?? {};
  const [complaints, setComplaints] = useState(h.complaints ?? []);
  const [sleep, setSleep] = useState(h.sleepHours != null ? formatNumber(h.sleepHours, 1) : "");
  const [hrMax, setHrMax] = useState(h.hrMax != null ? String(h.hrMax) : "");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: Record<string, unknown> = {
      complaints,
      sleepHours: sleep ? (parseDecimal(sleep) ?? NaN) : null,
      hrMax: hrMax ? Number(hrMax) : null,
    };
    const fd = new FormData();
    fd.set("payload", JSON.stringify(data));
    startTransition(() => formAction(fd));
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <section className="card space-y-3">
        <h2 className="h2">Beschwerden</h2>
        <p className="muted">Nur zur Information für die Übungsauswahl – keine Diagnose.</p>
        {complaints.map((c, i) => (
          <div key={i} className="grid gap-2 rounded-lg border border-slate-200 p-2 sm:grid-cols-2">
            <select
              className="input"
              aria-label="Körperregion"
              value={c.region}
              onChange={(e) => setComplaints(complaints.map((x, j) => (j === i ? { ...x, region: e.target.value as typeof c.region } : x)))}
            >
              {BODY_REGIONS.map((r) => (
                <option key={r} value={r}>
                  {BODY_REGION_LABELS[r]}
                </option>
              ))}
            </select>
            <input className="input" placeholder="seit wann, z. B. 03/2026" value={c.since} onChange={(e) => setComplaints(complaints.map((x, j) => (j === i ? { ...x, since: e.target.value } : x)))} />
            <label className="flex min-h-11 items-center gap-2">
              <input type="checkbox" className="h-5 w-5" checked={c.painInTraining} onChange={(e) => setComplaints(complaints.map((x, j) => (j === i ? { ...x, painInTraining: e.target.checked } : x)))} />
              Schmerz beim Training
            </label>
            <label className="flex min-h-11 items-center gap-2">
              <input type="checkbox" className="h-5 w-5" checked={c.clarified} onChange={(e) => setComplaints(complaints.map((x, j) => (j === i ? { ...x, clarified: e.target.checked } : x)))} />
              ärztlich/physiotherapeutisch abgeklärt
            </label>
            <input
              className="input sm:col-span-2"
              placeholder="Welche Übungen lösen es aus?"
              value={c.triggers}
              onChange={(e) => setComplaints(complaints.map((x, j) => (j === i ? { ...x, triggers: e.target.value } : x)))}
            />
            <button type="button" className="btn-secondary btn-small" onClick={() => setComplaints(complaints.filter((_, j) => j !== i))}>
              ✕ entfernen
            </button>
          </div>
        ))}
        <button
          type="button"
          className="btn-secondary btn-small"
          onClick={() => setComplaints([...complaints, { region: "knie", since: "", painInTraining: false, clarified: false, triggers: "" }])}
        >
          + Beschwerde
        </button>
      </section>

      <section className="card space-y-3">
        <h2 className="h2">Schlaf und Herzfrequenz</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="label">Schlaf pro Nacht, Ø der letzten 4 Wochen (Stunden)</span>
            <input className="input" inputMode="decimal" value={sleep} onChange={(e) => setSleep(e.target.value)} />
          </label>
          <label className="block">
            <span className="label">Gemessene maximale Herzfrequenz (optional)</span>
            <input className="input" inputMode="numeric" placeholder="nur gemessen, nicht geschätzt" value={hrMax} onChange={(e) => setHrMax(e.target.value.replace(/\D/g, ""))} />
          </label>
        </div>
      </section>

      <div className="sticky bottom-16 z-10 space-y-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm md:bottom-2">
        {state.ok && <p className="text-sm text-green-700">{state.ok}</p>}
        {state.error && <p className="text-sm text-red-700">{state.error}</p>}
        <button className="btn-primary w-full" disabled={pending}>
          {pending ? "Speichere …" : "Gesundheitsangaben speichern"}
        </button>
      </div>
    </form>
  );
}
