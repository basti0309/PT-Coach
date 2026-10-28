"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveWodResult, type WorkoutRef } from "@/lib/actions/training";
import { formatWodResult, wodResultKind } from "@/lib/calc/wod";
import { formatDate, formatDuration, parseDuration } from "@/lib/format";
import type { WodResult } from "@/lib/db-types";
import type { WodSession } from "@/lib/plan/schema";
import { parseRpe, SessionRpeField } from "./session-rpe-field";

export function WodLogger({
  session,
  workoutRef,
  existing,
  last,
}: {
  session: WodSession;
  workoutRef: WorkoutRef;
  existing: {
    result: WodResult | null;
    weights: string;
    notes: string;
    completed: boolean;
    sessionRpe: number | null;
    durationSeconds: number | null;
  } | null;
  last: { date: string; result: WodResult | null; weights: string } | null;
}) {
  const kind = wodResultKind(session.wodType);
  const router = useRouter();
  const [time, setTime] = useState(existing?.result?.timeSeconds != null ? formatDuration(existing.result.timeSeconds) : "");
  const [rounds, setRounds] = useState(existing?.result?.rounds != null ? String(existing.result.rounds) : "");
  const [reps, setReps] = useState(existing?.result?.reps != null ? String(existing.result.reps) : "");
  const [weights, setWeights] = useState(existing?.weights ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [rpe, setRpe] = useState(existing?.sessionRpe != null ? String(existing.sessionRpe) : "");
  const [minutes, setMinutes] = useState(existing?.durationSeconds ? String(Math.round(existing.durationSeconds / 60)) : "");
  const [date, setDate] = useState(workoutRef.date);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    setError("");
    const timeSeconds = kind === "time" ? parseDuration(time) : null;
    if (kind === "time" && timeSeconds == null) return setError("Bitte die Zeit als mm:ss eingeben, z. B. 12:34.");
    const r = kind === "rounds" ? parseInt(rounds || "0", 10) : null;
    if (kind === "rounds" && !rounds) return setError("Bitte die Runden eintragen.");
    startTransition(async () => {
      try {
        await saveWodResult({
          ...workoutRef,
          date,
          timeSeconds,
          rounds: r,
          reps: kind === "rounds" && reps ? parseInt(reps, 10) : null,
          weights,
          notes,
          sessionRpe: parseRpe(rpe),
          durationMinutes: minutes ? Math.min(600, Math.max(1, parseInt(minutes, 10))) : null,
        });
        setSaved(true);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Fehler beim Speichern");
      }
    });
  };

  return (
    <div className="space-y-4">
      <section className="card space-y-1">
        <h3 className="h2">Letztes Mal</h3>
        {last ? (
          <>
            <p className="text-lg font-semibold">{formatWodResult(last.result)}</p>
            <p className="muted">
              {formatDate(last.date)}
              {last.weights && ` · Gewichte: ${last.weights}`}
            </p>
          </>
        ) : (
          <p className="muted">Dieses WOD hast du noch nicht eingetragen.</p>
        )}
      </section>

      <section className="card space-y-3">
        <h3 className="h2">Ergebnis</h3>
        {kind === "time" ? (
          <label className="block">
            <span className="label">Zeit (mm:ss)</span>
            <input className="input text-center text-2xl" inputMode="numeric" placeholder="12:34" value={time} onChange={(e) => setTime(e.target.value)} />
          </label>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="label">Runden</span>
              <input className="input text-center text-2xl" inputMode="numeric" value={rounds} onChange={(e) => setRounds(e.target.value.replace(/\D/g, ""))} />
            </label>
            <label className="block">
              <span className="label">+ Wiederholungen</span>
              <input className="input text-center text-2xl" inputMode="numeric" value={reps} onChange={(e) => setReps(e.target.value.replace(/\D/g, ""))} />
            </label>
          </div>
        )}
        <label className="block">
          <span className="label">Verwendete Gewichte</span>
          <input className="input" placeholder="z. B. KB 16 kg, Klimmzüge mit Band grün" value={weights} onChange={(e) => setWeights(e.target.value)} />
        </label>
        <label className="block">
          <span className="label">Datum</span>
          <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="block">
          <span className="label">Notizen</span>
          <textarea className="input min-h-20" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
        <SessionRpeField rpe={rpe} onRpe={setRpe} minutes={minutes} onMinutes={setMinutes} />
        {error && <p className="text-sm text-red-700">{error}</p>}
        {saved && <p className="text-sm text-green-700">Gespeichert.</p>}
        <button type="button" className="btn-primary w-full" disabled={pending} onClick={submit}>
          {pending ? "Speichere …" : existing?.completed ? "Ergebnis aktualisieren" : "Ergebnis speichern"}
        </button>
      </section>
    </div>
  );
}
