"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveProgramResults, type WorkoutRef } from "@/lib/actions/training";
import {
  SCORING_INPUT_UNIT,
  describeScoring,
  formatBlockValue,
  loadForSex,
  parseBlockValue,
  valueCount,
  type BlockResults,
} from "@/lib/calc/blocks";
import type { ProgramBlock, ProgramSession } from "@/lib/plan/schema";

type Draft = Record<string, { done: boolean; inputs: string[]; note: string }>;

function initialDraft(session: ProgramSession, existing: BlockResults | null): Draft {
  const draft: Draft = {};
  for (const b of session.blocks) {
    const r = existing?.[b.key];
    draft[b.key] = {
      done: r?.done ?? false,
      inputs: Array.from({ length: valueCount(b.scoring) }, (_, i) => formatBlockValue(b.scoring.type, r?.values[i] ?? null)),
      note: r?.note ?? "",
    };
  }
  return draft;
}

/** Text mit Zeilen (Aufzählungen) als Liste anzeigen. */
function Lines({ text, className }: { text: string; className?: string }) {
  return (
    <div className={className}>
      {text.split("\n").map((line, i) => (
        <p key={i}>{line}</p>
      ))}
    </div>
  );
}

function BlockCard({
  block,
  value,
  sex,
  onChange,
}: {
  block: ProgramBlock;
  value: Draft[string];
  sex: "m" | "w" | null;
  onChange: (next: Draft[string]) => void;
}) {
  const type = block.scoring.type;
  const unit = SCORING_INPUT_UNIT[type];
  const many = value.inputs.length > 1;
  return (
    <section className="card space-y-2">
      <div className="flex flex-wrap items-baseline gap-2">
        {block.label && <span className="badge bg-slate-200 text-slate-700">{block.label}</span>}
        <h3 className="font-semibold">{block.name}</h3>
        <span className="muted">{describeScoring(block.scoring)}</span>
      </div>
      {block.details && <Lines text={block.details} className="text-sm text-slate-700" />}
      {block.loads && block.loads.length > 0 && (
        <ul className="text-sm text-slate-700">
          {block.loads.map((l, i) => (
            <li key={i}>
              <strong>{l.label}:</strong> {loadForSex(l, sex)}
            </li>
          ))}
        </ul>
      )}
      {block.coachNotes && (
        <details className="text-sm">
          <summary className="cursor-pointer py-2 text-brand-700">Coach-Hinweis</summary>
          <Lines text={block.coachNotes} className="italic text-slate-600" />
        </details>
      )}
      {type !== "none" && (
        <>
          {value.inputs.length > 0 && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {value.inputs.map((input, i) => (
                <label key={i} className="block">
                  <span className="label">
                    {many ? `Runde ${i + 1}` : "Ergebnis"}
                    {unit && ` (${unit})`}
                  </span>
                  <input
                    className="input text-center text-lg"
                    inputMode={type === "time" ? "text" : "decimal"}
                    placeholder={type === "time" ? "2:45" : ""}
                    value={input}
                    onChange={(e) => {
                      const inputs = [...value.inputs];
                      inputs[i] = e.target.value;
                      onChange({ ...value, inputs, done: value.done || e.target.value.trim() !== "" });
                    }}
                  />
                </label>
              ))}
            </div>
          )}
          <label className="flex min-h-11 items-center gap-3">
            <input
              type="checkbox"
              className="h-6 w-6"
              checked={value.done}
              onChange={(e) => onChange({ ...value, done: e.target.checked })}
            />
            <span>erledigt</span>
          </label>
          <input
            className="input"
            placeholder="Notiz (optional)"
            value={value.note}
            onChange={(e) => onChange({ ...value, note: e.target.value })}
          />
        </>
      )}
    </section>
  );
}

export function ProgramLogger({
  session,
  workoutRef,
  existing,
  sex,
}: {
  session: ProgramSession;
  workoutRef: WorkoutRef;
  existing: { results: BlockResults | null; notes: string; completed: boolean } | null;
  sex: "m" | "w" | null;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(() => initialDraft(session, existing?.results ?? null));
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [date, setDate] = useState(workoutRef.date);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [pending, startTransition] = useTransition();

  const submit = () => {
    setError("");
    setSaved("");
    const results: BlockResults = {};
    for (const b of session.blocks) {
      const d = draft[b.key];
      const values: (number | null)[] = [];
      for (const raw of d.inputs) {
        const parsed = parseBlockValue(b.scoring.type, raw);
        if (!parsed.ok) return setError(`${b.label ? `${b.label} ` : ""}${b.name}: ${parsed.error}`);
        values.push(parsed.value);
      }
      results[b.key] = { done: d.done, values, note: d.note };
    }
    startTransition(async () => {
      try {
        const { completed } = await saveProgramResults({ ...workoutRef, date, results, notes });
        setSaved(completed ? "Gespeichert – Einheit erledigt." : "Gespeichert.");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Fehler beim Speichern");
      }
    });
  };

  return (
    <div className="space-y-4">
      {session.blocks.map((b) => (
        <BlockCard
          key={b.key}
          block={b}
          value={draft[b.key]}
          sex={sex}
          onChange={(next) => setDraft((prev) => ({ ...prev, [b.key]: next }))}
        />
      ))}
      <section className="card space-y-3">
        <label className="block">
          <span className="label">Datum</span>
          <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="block">
          <span className="label">Notizen zur Einheit</span>
          <textarea className="input min-h-20" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
        {error && <p className="text-sm text-red-700">{error}</p>}
        {saved && <p className="text-sm text-green-700">{saved}</p>}
        <button type="button" className="btn-primary w-full" disabled={pending} onClick={submit}>
          {pending ? "Speichere …" : existing ? "Ergebnisse aktualisieren" : "Ergebnisse speichern"}
        </button>
      </section>
    </div>
  );
}
