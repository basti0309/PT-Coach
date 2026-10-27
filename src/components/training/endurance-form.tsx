"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveEnduranceLog } from "@/lib/actions/training";
import { SPORTS, SPORT_LABELS, type Sport } from "@/lib/calc/sport";
import { formatDuration, formatNumber, parseDecimal, parseDuration } from "@/lib/format";

export interface EnduranceFormProps {
  clientId: string;
  logId: string | null;
  planId: string | null;
  planVersion: number | null;
  sessionId: string | null;
  defaultDate: string;
  defaultSport: Sport;
  sportFixed: boolean;
  title: string;
  initial?: { durationSeconds: number | null; distanceM: number | null; avgHr: number | null; isTest: boolean; notes: string };
  doneHref?: string;
}

export function EnduranceForm(props: EnduranceFormProps) {
  const router = useRouter();
  const [sport, setSport] = useState<Sport>(props.defaultSport);
  const [date, setDate] = useState(props.defaultDate);
  const [duration, setDuration] = useState(props.initial?.durationSeconds ? formatDuration(props.initial.durationSeconds) : "");
  const [distance, setDistance] = useState(props.initial?.distanceM != null ? formatNumber(props.initial.distanceM / 1000, 2) : "");
  const [hr, setHr] = useState(props.initial?.avgHr != null ? String(props.initial.avgHr) : "");
  const [isTest, setIsTest] = useState(props.initial?.isTest ?? false);
  const [notes, setNotes] = useState(props.initial?.notes ?? "");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const submit = () => {
    setError("");
    const durationSeconds = parseDuration(duration);
    if (!durationSeconds) return setError("Bitte die Dauer angeben, z. B. 45 (Minuten) oder 1:05:30.");
    const km = distance ? parseDecimal(distance) : null;
    if (distance && km == null) return setError("Distanz bitte als Zahl in km, z. B. 8,5.");
    const avgHr = hr ? parseInt(hr, 10) : null;
    startTransition(async () => {
      try {
        await saveEnduranceLog({
          clientId: props.clientId,
          logId: props.logId,
          planId: props.planId,
          planVersion: props.planVersion,
          sessionId: props.sessionId,
          date,
          sport,
          durationSeconds,
          distanceM: km != null ? Math.round(km * 1000) : null,
          avgHr,
          isTest,
          notes,
          title: props.title || SPORT_LABELS[sport],
        });
        if (props.doneHref) router.push(props.doneHref);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Fehler beim Speichern");
      }
    });
  };

  return (
    <section className="card space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="label">Sportart</span>
          <select className="input" value={sport} disabled={props.sportFixed} onChange={(e) => setSport(e.target.value as Sport)}>
            {SPORTS.map((s) => (
              <option key={s} value={s}>
                {SPORT_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label">Datum</span>
          <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="block">
          <span className="label">Dauer (Minuten oder h:mm:ss)</span>
          <input className="input" inputMode="numeric" placeholder="45 oder 1:05:30" value={duration} onChange={(e) => setDuration(e.target.value)} />
        </label>
        <label className="block">
          <span className="label">Distanz in km (optional)</span>
          <input className="input" inputMode="decimal" placeholder="8,5" value={distance} onChange={(e) => setDistance(e.target.value)} />
        </label>
        <label className="block">
          <span className="label">Ø-Puls (optional)</span>
          <input className="input" inputMode="numeric" value={hr} onChange={(e) => setHr(e.target.value.replace(/\D/g, ""))} />
        </label>
        <label className="flex min-h-11 items-center gap-2 self-end">
          <input type="checkbox" className="h-5 w-5" checked={isTest} onChange={(e) => setIsTest(e.target.checked)} />
          <span>Test / Wettkampf (zählt für Prognosen)</span>
        </label>
      </div>
      <label className="block">
        <span className="label">Notizen</span>
        <textarea className="input min-h-16" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <button type="button" className="btn-primary w-full" disabled={pending} onClick={submit}>
        {pending ? "Speichere …" : "Speichern"}
      </button>
    </section>
  );
}
