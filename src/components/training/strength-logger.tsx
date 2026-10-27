"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Placeholder } from "@/lib/calc/prefill";
import { ensureWorkoutLog, finishWorkout, saveSet, type WorkoutRef } from "@/lib/actions/training";
import { formatNumber, parseDecimal } from "@/lib/format";
import type { StrengthSession } from "@/lib/plan/schema";
import { RestTimer, type TimerState } from "./rest-timer";

interface SetState {
  weight: string;
  reps: string;
  done: boolean;
  saving: boolean;
  error?: string;
}

export interface ExistingSet {
  exerciseId: string;
  setNo: number;
  weightKg: number | null;
  reps: number | null;
  done: boolean;
}

const fmt = (n: number | null | undefined) => (n == null ? "" : formatNumber(n, 2));

export function StrengthLogger({
  session,
  workoutRef,
  existingLogId,
  existingSets,
  existingCompleted,
  existingNotes,
  prefill,
}: {
  session: StrengthSession;
  workoutRef: WorkoutRef;
  existingLogId: string | null;
  existingSets: ExistingSet[];
  existingCompleted: boolean;
  existingNotes: string;
  prefill: Record<string, (Placeholder | null)[]>;
}) {
  const router = useRouter();
  const [logId, setLogId] = useState<string | null>(existingLogId);
  const [timer, setTimer] = useState<TimerState | null>(null);
  const [notes, setNotes] = useState(existingNotes);
  const [date, setDate] = useState(workoutRef.date);
  const [completed, setCompleted] = useState(existingCompleted);
  const [pending, startTransition] = useTransition();
  const [sets, setSets] = useState<Record<string, SetState[]>>(() => {
    const init: Record<string, SetState[]> = {};
    for (const ex of session.exercises) {
      init[ex.exerciseId] = Array.from({ length: ex.sets }, (_, i) => {
        const found = existingSets.find((s) => s.exerciseId === ex.exerciseId && s.setNo === i + 1);
        return { weight: fmt(found?.weightKg), reps: found?.reps != null ? String(found.reps) : "", done: found?.done ?? false, saving: false };
      });
    }
    return init;
  });

  const update = (exId: string, i: number, patch: Partial<SetState>) =>
    setSets((prev) => ({ ...prev, [exId]: prev[exId].map((s, j) => (j === i ? { ...s, ...patch } : s)) }));

  /** Platzhalter: Werte vom letzten Mal; ohne Historie die Plan-Vorgabe. */
  const placeholderFor = (exId: string, i: number) => {
    const ex = session.exercises.find((e) => e.exerciseId === exId)!;
    const last = prefill[exId]?.[i];
    return {
      weight: last?.weightKg != null ? fmt(last.weightKg) : fmt(ex.targetWeightKg),
      reps: last?.reps != null ? String(last.reps) : String(ex.reps),
      fromHistory: Boolean(last),
    };
  };

  const ensureLog = async () => {
    if (logId) return logId;
    const id = await ensureWorkoutLog(workoutRef);
    setLogId(id);
    return id;
  };

  const toggleSet = async (exId: string, exName: string, i: number, restSeconds: number) => {
    const current = sets[exId][i];
    const ph = placeholderFor(exId, i);
    const nextDone = !current.done;
    // Abhaken mit leeren Feldern übernimmt die Platzhalter.
    const weight = current.weight || (nextDone ? ph.weight : "");
    const reps = current.reps || (nextDone ? ph.reps : "");
    update(exId, i, { weight, reps, done: nextDone, saving: true, error: undefined });
    try {
      const id = await ensureLog();
      const repsNum = reps ? parseInt(reps, 10) : null;
      await saveSet({
        clientId: workoutRef.clientId,
        workoutLogId: id,
        exerciseId: exId,
        exerciseName: exName,
        setNo: i + 1,
        weightKg: parseDecimal(weight),
        reps: Number.isFinite(repsNum) ? repsNum : null,
        done: nextDone,
      });
      update(exId, i, { saving: false });
      if (nextDone && restSeconds > 0) {
        setTimer({ endsAt: Date.now() + restSeconds * 1000, total: restSeconds, label: exName });
      }
    } catch (e) {
      update(exId, i, { done: current.done, saving: false, error: e instanceof Error ? e.message : "Fehler beim Speichern" });
    }
  };

  const saveValuesOnBlur = async (exId: string, exName: string, i: number) => {
    const s = sets[exId][i];
    if (!s.done) return; // nicht abgehakte Sätze werden erst beim Abhaken gespeichert
    const id = await ensureLog();
    await saveSet({
      clientId: workoutRef.clientId,
      workoutLogId: id,
      exerciseId: exId,
      exerciseName: exName,
      setNo: i + 1,
      weightKg: parseDecimal(s.weight),
      reps: s.reps ? parseInt(s.reps, 10) : null,
      done: true,
    }).catch(() => update(exId, i, { error: "Fehler beim Speichern" }));
  };

  const finish = (done: boolean) =>
    startTransition(async () => {
      const id = await ensureLog();
      await finishWorkout({ clientId: workoutRef.clientId, workoutLogId: id, completed: done, date, notes });
      setCompleted(done);
      router.refresh();
    });

  return (
    <div className="space-y-4 pb-40">
      {session.exercises.map((ex) => (
        <section key={ex.exerciseId} className="card space-y-2">
          <div>
            <h3 className="h2">{ex.name}</h3>
            <p className="muted">
              Plan: {ex.sets} × {ex.reps}
              {ex.targetWeightKg != null && ` @ ${formatNumber(ex.targetWeightKg)} kg`} · Pause {ex.restSeconds} s
              {prefill[ex.exerciseId]?.some(Boolean) && " · grau = letztes Mal (antippen übernimmt)"}
            </p>
            {ex.notes && <p className="text-sm italic text-slate-500">{ex.notes}</p>}
          </div>
          <div className="grid grid-cols-[2rem_1fr_1fr_3.5rem] items-center gap-2 text-xs font-medium text-slate-500">
            <span>Satz</span>
            <span>kg</span>
            <span>Wdh.</span>
            <span className="text-center">✓</span>
          </div>
          {sets[ex.exerciseId].map((s, i) => {
            const ph = placeholderFor(ex.exerciseId, i);
            return (
              <div key={i} className="space-y-1">
                <div className={`grid grid-cols-[2rem_1fr_1fr_3.5rem] items-center gap-2 rounded-xl ${s.done ? "bg-green-50" : ""}`}>
                  <span className="text-center font-semibold">{i + 1}</span>
                  <input
                    aria-label={`Satz ${i + 1} Gewicht in kg`}
                    className="input text-center text-lg"
                    inputMode="decimal"
                    placeholder={ph.weight}
                    value={s.weight}
                    onFocus={(e) => {
                      if (!s.weight && ph.weight) {
                        update(ex.exerciseId, i, { weight: ph.weight });
                        requestAnimationFrame(() => e.target.select());
                      }
                    }}
                    onChange={(e) => update(ex.exerciseId, i, { weight: e.target.value })}
                    onBlur={() => saveValuesOnBlur(ex.exerciseId, ex.name, i)}
                  />
                  <input
                    aria-label={`Satz ${i + 1} Wiederholungen`}
                    className="input text-center text-lg"
                    inputMode="numeric"
                    placeholder={ph.reps}
                    value={s.reps}
                    onFocus={(e) => {
                      if (!s.reps && ph.reps) {
                        update(ex.exerciseId, i, { reps: ph.reps });
                        requestAnimationFrame(() => e.target.select());
                      }
                    }}
                    onChange={(e) => update(ex.exerciseId, i, { reps: e.target.value.replace(/\D/g, "") })}
                    onBlur={() => saveValuesOnBlur(ex.exerciseId, ex.name, i)}
                  />
                  <button
                    type="button"
                    aria-label={s.done ? `Satz ${i + 1} nicht erledigt` : `Satz ${i + 1} abhaken`}
                    aria-pressed={s.done}
                    disabled={s.saving}
                    onClick={() => toggleSet(ex.exerciseId, ex.name, i, ex.restSeconds)}
                    className={`flex h-12 w-full items-center justify-center rounded-xl text-2xl font-bold ${
                      s.done ? "bg-green-600 text-white" : "border-2 border-slate-300 bg-white text-slate-300"
                    }`}
                  >
                    ✓
                  </button>
                </div>
                {s.error && <p className="text-xs text-red-700">{s.error}</p>}
              </div>
            );
          })}
        </section>
      ))}

      <section className="card space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="label">Datum</span>
            <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="block sm:col-span-2">
            <span className="label">Notizen</span>
            <textarea className="input min-h-20" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
        </div>
        {completed ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge bg-green-600 text-white">✓ Training abgeschlossen</span>
            <button type="button" className="btn-secondary btn-small" disabled={pending} onClick={() => finish(true)}>
              Notizen/Datum speichern
            </button>
            <button type="button" className="btn-secondary btn-small" disabled={pending} onClick={() => finish(false)}>
              Wieder öffnen
            </button>
          </div>
        ) : (
          <button type="button" className="btn-primary w-full" disabled={pending} onClick={() => finish(true)}>
            {pending ? "Speichere …" : "Training abschließen"}
          </button>
        )}
      </section>

      <RestTimer timer={timer} onChange={setTimer} />
    </div>
  );
}
