"use client";

import { useActionState, useState, useTransition } from "react";
import type { FormState } from "@/lib/actions/profile";
import { formatNumber, parseDecimal } from "@/lib/format";
import { BODY_REGION_LABELS, BODY_REGIONS, type Health } from "@/lib/questionnaire/schema";

export const PARQ_URL = "https://eparmedx.com/wp-content/uploads/2025/01/PARQPlus2025ImageFile.pdf";

type YesNo = "" | "ja" | "nein";
const yn = (b: boolean | undefined): YesNo => (b == null ? "" : b ? "ja" : "nein");

function YesNoSelect({ value, onChange, label }: { value: YesNo; onChange: (v: YesNo) => void; label: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <select className="input" value={value} onChange={(e) => onChange(e.target.value as YesNo)}>
        <option value="">–</option>
        <option value="ja">ja</option>
        <option value="nein">nein</option>
      </select>
    </label>
  );
}

export function HealthForm({ initial, action }: { initial: Health | null; action: (prev: FormState, data: FormData) => Promise<FormState> }) {
  const [state, formAction, pending] = useActionState(action, {});
  const [, startTransition] = useTransition();
  const h = initial ?? {};
  const [parqDate, setParqDate] = useState(h.parq?.date ?? "");
  const [parqResult, setParqResult] = useState<"" | "alle_nein" | "mind_ein_ja">(h.parq?.result ?? "");
  const [clearance, setClearance] = useState(h.medicalClearance?.date ?? "");
  const [active, setActive] = useState<YesNo>(yn(h.acsm?.regularlyActive));
  const [disease, setDisease] = useState<YesNo>(yn(h.acsm?.knownDisease));
  const [symptoms, setSymptoms] = useState<YesNo>(yn(h.acsm?.symptoms));
  const [complaints, setComplaints] = useState(h.complaints ?? []);
  const [sleep, setSleep] = useState(h.sleepHours != null ? formatNumber(h.sleepHours, 1) : "");
  const [hrMax, setHrMax] = useState(h.hrMax != null ? String(h.hrMax) : "");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: Record<string, unknown> = {
      parq: parqDate && parqResult ? { date: parqDate, result: parqResult } : null,
      medicalClearance: clearance ? { date: clearance } : null,
      acsm: active && disease && symptoms ? { regularlyActive: active === "ja", knownDisease: disease === "ja", symptoms: symptoms === "ja" } : null,
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
        <h2 className="h2">Gesundheits-Check PAR-Q+</h2>
        <p className="text-sm">
          Bitte den offiziellen Fragebogen{" "}
          <a href={PARQ_URL} target="_blank" rel="noopener noreferrer" className="text-brand-700 underline">
            PAR-Q+ (eparmedx.com, PDF)
          </a>{" "}
          vollständig ausfüllen und hier nur das Ergebnis eintragen. Gilt 12 Monate.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="label">Ausgefüllt am</span>
            <input type="date" className="input" value={parqDate} onChange={(e) => setParqDate(e.target.value)} />
          </label>
          <label className="block">
            <span className="label">Ergebnis</span>
            <select className="input" value={parqResult} onChange={(e) => setParqResult(e.target.value as typeof parqResult)}>
              <option value="">–</option>
              <option value="alle_nein">alle Fragen mit Nein beantwortet</option>
              <option value="mind_ein_ja">mindestens ein Ja</option>
            </select>
          </label>
        </div>
        {parqResult === "mind_ein_ja" && (
          <p className="text-sm text-amber-700">Mindestens ein Ja: Vor der Testwoche bitte ärztlich abklären lassen und das Datum unten eintragen.</p>
        )}
        <label className="block">
          <span className="label">Ärztlich abgeklärt / freigegeben am (falls zutreffend)</span>
          <input type="date" className="input" value={clearance} onChange={(e) => setClearance(e.target.value)} />
        </label>
      </section>

      <section className="card space-y-3">
        <h2 className="h2">Drei Fragen nach dem ACSM-Modell</h2>
        <div className="grid gap-3">
          <YesNoSelect
            label="Trainierst du seit mindestens 3 Monaten an mindestens 3 Tagen pro Woche je mindestens 30 Minuten mit mittlerer Anstrengung?"
            value={active}
            onChange={setActive}
          />
          <YesNoSelect
            label="Hast du eine bekannte Herz-Kreislauf-Erkrankung (Herz, Gefäße, Schlaganfall), Diabetes (Typ 1 oder 2) oder eine Nierenerkrankung?"
            value={disease}
            onChange={setDisease}
          />
          <YesNoSelect
            label="Hast du Anzeichen wie Brustschmerz oder Druck (auch in Hals, Kiefer, Arm), Atemnot in Ruhe oder bei leichter Belastung, Schwindel oder Ohnmacht, Atemnot im Liegen oder nachts, geschwollene Knöchel, Herzrasen oder -stolpern, Wadenschmerz beim Gehen, ein bekanntes Herzgeräusch oder ungewöhnliche Erschöpfung im Alltag?"
            value={symptoms}
            onChange={setSymptoms}
          />
        </div>
      </section>

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
