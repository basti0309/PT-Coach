"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SPORTS, SPORT_LABELS, type Sport } from "@/lib/calc/sport";
import { newSessionId, slugify } from "@/lib/plan/ids";
import { SCORING_LABELS } from "@/lib/calc/blocks";
import {
  SCORING_TYPES,
  WOD_TYPES,
  WOD_TYPE_LABELS,
  type BlockLoad,
  type EnduranceSession,
  type PlanContent,
  type PlanSession,
  type ProgramBlock,
  type ProgramSession,
  type ScoringType,
  type StrengthExercise,
  type StrengthSession,
  type WodMovement,
  type WodSession,
} from "@/lib/plan/schema";
import { sessionDate } from "@/lib/plan/dates";
import { formatDate } from "@/lib/format";

type SaveFn = (content: PlanContent, note: string) => Promise<{ ok: true; version: number } | { ok: false; errors: string[] }>;

const num = (v: string): number | undefined => (v.trim() === "" ? undefined : Number(v.replace(",", ".")));
const int = (v: string, fallback: number) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
};

function NumberField({
  label,
  value,
  onChange,
  step = "any",
}: {
  label: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  step?: string;
}) {
  return (
    <label className="block text-xs text-slate-600">
      {label}
      <input
        type="number"
        step={step}
        inputMode="decimal"
        className="input min-h-9 py-1 text-sm"
        value={value ?? ""}
        onChange={(e) => onChange(num(e.target.value))}
      />
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
  multiline = false,
}: {
  label: string;
  value: string | undefined;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <label className="block text-xs text-slate-600">
      {label}
      {multiline ? (
        <textarea className="input min-h-16 py-1 text-sm" value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input className="input min-h-9 py-1 text-sm" value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  );
}

/** Leere optionale Texte entfernen, damit das Schema sauber bleibt. */
function clean<T extends object>(obj: T): T {
  const out = { ...obj } as Record<string, unknown>;
  for (const [k, v] of Object.entries(out)) {
    if (v === "" || v === undefined || (typeof v === "number" && Number.isNaN(v))) delete out[k];
  }
  return out as T;
}

function cleanPlan(plan: PlanContent): PlanContent {
  return clean({
    ...plan,
    weeks: plan.weeks.map((w) =>
      clean({
        ...w,
        days: w.days.map((d) =>
          clean({
            ...d,
            sessions: d.sessions.map((s) => {
              if (s.type === "strength") return clean({ ...s, exercises: s.exercises.map((e) => clean(e)) });
              if (s.type === "wod") return clean({ ...s, movements: s.movements.map((m) => clean(m)) });
              if (s.type === "program")
                return clean({
                  ...s,
                  blocks: s.blocks.map((b) =>
                    clean({
                      ...b,
                      scoring: clean(b.scoring),
                      loads: b.loads && b.loads.length > 0 ? b.loads.map((l) => clean(l)) : undefined,
                    }),
                  ),
                });
              return clean(s);
            }),
          }),
        ),
      }),
    ),
  });
}

function StrengthEditor({ s, onChange }: { s: StrengthSession; onChange: (s: StrengthSession) => void }) {
  const setEx = (i: number, e: StrengthExercise) => onChange({ ...s, exercises: s.exercises.map((x, j) => (j === i ? e : x)) });
  return (
    <div className="space-y-2">
      <TextField label="Titel" value={s.title} onChange={(title) => onChange({ ...s, title })} />
      {s.exercises.map((e, i) => (
        <div key={i} className="rounded-lg bg-slate-50 p-2">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
            <div className="col-span-2">
              <TextField
                label="Übung"
                value={e.name}
                onChange={(name) =>
                  setEx(i, { ...e, name, exerciseId: e.exerciseId && e.exerciseId !== slugify(e.name) ? e.exerciseId : slugify(name) })
                }
              />
            </div>
            <TextField label="Übungs-ID" value={e.exerciseId} onChange={(exerciseId) => setEx(i, { ...e, exerciseId })} />
            <NumberField label="Sätze" step="1" value={e.sets} onChange={(v) => setEx(i, { ...e, sets: v ?? 1 })} />
            <NumberField label="Wdh." step="1" value={e.reps} onChange={(v) => setEx(i, { ...e, reps: v ?? 1 })} />
            <NumberField label="Zielgewicht kg" value={e.targetWeightKg} onChange={(v) => setEx(i, { ...e, targetWeightKg: v })} />
            <NumberField label="Pause s" step="5" value={e.restSeconds} onChange={(v) => setEx(i, { ...e, restSeconds: v ?? 0 })} />
            <div className="col-span-2 sm:col-span-4">
              <TextField label="Hinweis" value={e.notes} onChange={(notes) => setEx(i, { ...e, notes })} />
            </div>
            <button
              type="button"
              className="btn-danger btn-small self-end"
              onClick={() => onChange({ ...s, exercises: s.exercises.filter((_, j) => j !== i) })}
            >
              Übung entfernen
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        className="btn-secondary btn-small"
        onClick={() =>
          onChange({ ...s, exercises: [...s.exercises, { exerciseId: "", name: "", sets: 3, reps: 8, restSeconds: 90 }] })
        }
      >
        + Übung
      </button>
      <TextField label="Notizen zur Einheit" value={s.notes} onChange={(notes) => onChange({ ...s, notes })} />
    </div>
  );
}

function WodEditor({ s, onChange }: { s: WodSession; onChange: (s: WodSession) => void }) {
  const setMv = (i: number, m: WodMovement) => onChange({ ...s, movements: s.movements.map((x, j) => (j === i ? m : x)) });
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
        <div className="col-span-2">
          <TextField label="Name" value={s.name} onChange={(name) => onChange({ ...s, name })} />
        </div>
        <TextField label="WOD-ID (optional)" value={s.wodId} onChange={(wodId) => onChange({ ...s, wodId: wodId || undefined })} />
        <label className="block text-xs text-slate-600">
          Typ
          <select
            className="input min-h-9 py-1 text-sm"
            value={s.wodType}
            onChange={(e) => onChange({ ...s, wodType: e.target.value as WodSession["wodType"] })}
          >
            {WOD_TYPES.map((t) => (
              <option key={t} value={t}>
                {WOD_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </label>
        <NumberField label="Dauer min" value={s.durationMinutes} onChange={(v) => onChange({ ...s, durationMinutes: v })} />
        <NumberField label="Time Cap min" value={s.timeCapMinutes} onChange={(v) => onChange({ ...s, timeCapMinutes: v })} />
        <NumberField label="Runden" step="1" value={s.rounds} onChange={(v) => onChange({ ...s, rounds: v })} />
      </div>
      {s.movements.map((m, i) => (
        <div key={i} className="grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-2 sm:grid-cols-6">
          <div className="col-span-2">
            <TextField label="Bewegung" value={m.name} onChange={(name) => setMv(i, { ...m, name })} />
          </div>
          <NumberField label="Wdh." step="1" value={m.reps} onChange={(v) => setMv(i, { ...m, reps: v })} />
          <NumberField label="Gewicht kg" value={m.weightKg} onChange={(v) => setMv(i, { ...m, weightKg: v })} />
          <NumberField label="Distanz m" value={m.distanceM} onChange={(v) => setMv(i, { ...m, distanceM: v })} />
          <button
            type="button"
            className="btn-danger btn-small self-end"
            onClick={() => onChange({ ...s, movements: s.movements.filter((_, j) => j !== i) })}
          >
            Entfernen
          </button>
        </div>
      ))}
      <button
        type="button"
        className="btn-secondary btn-small"
        onClick={() => onChange({ ...s, movements: [...s.movements, { name: "" }] })}
      >
        + Bewegung
      </button>
      <TextField label="Vorgaben / Skalierung" value={s.notes} onChange={(notes) => onChange({ ...s, notes })} multiline />
    </div>
  );
}

function EnduranceEditor({ s, onChange }: { s: EnduranceSession; onChange: (s: EnduranceSession) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <label className="block text-xs text-slate-600">
        Sportart
        <select
          className="input min-h-9 py-1 text-sm"
          value={s.sport}
          onChange={(e) => onChange({ ...s, sport: e.target.value as Sport })}
        >
          {SPORTS.map((sp) => (
            <option key={sp} value={sp}>
              {SPORT_LABELS[sp]}
            </option>
          ))}
        </select>
      </label>
      <NumberField label="Dauer min" value={s.durationMinutes} onChange={(v) => onChange({ ...s, durationMinutes: v })} />
      <NumberField label="Distanz km" value={s.distanceKm} onChange={(v) => onChange({ ...s, distanceKm: v })} />
      <TextField label="Intensität" value={s.intensity} onChange={(intensity) => onChange({ ...s, intensity })} />
      <div className="col-span-2 sm:col-span-4">
        <TextField label="Beschreibung" value={s.description} onChange={(description) => onChange({ ...s, description })} />
      </div>
    </div>
  );
}

const SESSION_LABELS = { strength: "Kraft", wod: "WOD", endurance: "Ausdauer", program: "Programm" } as const;

function LoadsEditor({ loads, onChange }: { loads: BlockLoad[]; onChange: (loads: BlockLoad[]) => void }) {
  const setLoad = (i: number, l: BlockLoad) => onChange(loads.map((x, j) => (j === i ? l : x)));
  return (
    <div className="space-y-1">
      {loads.map((l, i) => (
        <div key={i} className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <div className="col-span-2">
            <TextField label="Gewicht für" value={l.label} onChange={(label) => setLoad(i, { ...l, label })} />
          </div>
          <NumberField label="Männer kg" value={l.maleKg} onChange={(v) => setLoad(i, { ...l, maleKg: v })} />
          <NumberField label="Frauen kg" value={l.femaleKg} onChange={(v) => setLoad(i, { ...l, femaleKg: v })} />
          <NumberField label="alle kg" value={l.kg} onChange={(v) => setLoad(i, { ...l, kg: v })} />
          <button type="button" className="btn-danger btn-small col-span-2 sm:col-span-5 sm:justify-self-start" onClick={() => onChange(loads.filter((_, j) => j !== i))}>
            Gewicht entfernen
          </button>
        </div>
      ))}
      <button type="button" className="btn-secondary btn-small" onClick={() => onChange([...loads, { label: "" }])}>
        + Gewicht
      </button>
    </div>
  );
}

function ProgramEditor({ s, onChange }: { s: ProgramSession; onChange: (s: ProgramSession) => void }) {
  const setBlock = (i: number, b: ProgramBlock) => onChange({ ...s, blocks: s.blocks.map((x, j) => (j === i ? b : x)) });
  const moveBlock = (i: number, delta: number) => {
    const target = i + delta;
    if (target < 0 || target >= s.blocks.length) return;
    const arr = [...s.blocks];
    [arr[i], arr[target]] = [arr[target], arr[i]];
    onChange({ ...s, blocks: arr });
  };
  const nextKey = () => {
    const used = new Set(s.blocks.map((b) => b.key));
    let n = s.blocks.length + 1;
    while (used.has(`p${n}`)) n++;
    return `p${n}`;
  };
  return (
    <div className="space-y-2">
      <TextField label="Titel" value={s.title} onChange={(title) => onChange({ ...s, title })} />
      <TextField label="Hinweis zur Einheit" value={s.notes} onChange={(notes) => onChange({ ...s, notes })} multiline />
      {s.blocks.map((b, i) => (
        <div key={i} className="space-y-2 rounded-lg bg-slate-50 p-2">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
            <TextField label="Kürzel (z. B. P1)" value={b.label} onChange={(label) => setBlock(i, { ...b, label })} />
            <TextField label="Block-Kennung" value={b.key} onChange={(key) => setBlock(i, { ...b, key })} />
            <div className="col-span-2">
              <TextField label="Name" value={b.name} onChange={(name) => setBlock(i, { ...b, name })} />
            </div>
            <label className="block text-xs text-slate-600">
              Wertung
              <select
                className="input min-h-9 py-1 text-sm"
                value={b.scoring.type}
                onChange={(e) => setBlock(i, { ...b, scoring: { ...b.scoring, type: e.target.value as ScoringType } })}
              >
                {SCORING_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {SCORING_LABELS[t]}
                  </option>
                ))}
              </select>
            </label>
            <NumberField
              label="Runden (je Runde ein Wert)"
              step="1"
              value={b.scoring.rounds}
              onChange={(v) => setBlock(i, { ...b, scoring: { ...b.scoring, rounds: v } })}
            />
          </div>
          <TextField label="Details (eine Angabe pro Zeile)" value={b.details} onChange={(details) => setBlock(i, { ...b, details })} multiline />
          <TextField label="Coach-Hinweise" value={b.coachNotes} onChange={(coachNotes) => setBlock(i, { ...b, coachNotes })} multiline />
          <LoadsEditor loads={b.loads ?? []} onChange={(loads) => setBlock(i, { ...b, loads })} />
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-secondary btn-small" onClick={() => moveBlock(i, -1)}>
              ↑
            </button>
            <button type="button" className="btn-secondary btn-small" onClick={() => moveBlock(i, 1)}>
              ↓
            </button>
            <button
              type="button"
              className="btn-danger btn-small"
              onClick={() => onChange({ ...s, blocks: s.blocks.filter((_, j) => j !== i) })}
            >
              Block entfernen
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        className="btn-secondary btn-small"
        onClick={() => onChange({ ...s, blocks: [...s.blocks, { key: nextKey(), name: "", scoring: { type: "checkmark" } }] })}
      >
        + Block
      </button>
    </div>
  );
}

export function PlanEditor({ initial, save, backHref }: { initial: PlanContent; save: SaveFn; backHref: string }) {
  const [plan, setPlan] = useState<PlanContent>(initial);
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const allIds = useMemo(
    () => new Set(plan.weeks.flatMap((w) => w.days.flatMap((d) => d.sessions.map((s) => s.id)))),
    [plan],
  );

  const updateWeek = (wi: number, fn: (w: PlanContent["weeks"][number]) => PlanContent["weeks"][number]) =>
    setPlan((p) => ({ ...p, weeks: p.weeks.map((w, i) => (i === wi ? fn(w) : w)) }));

  const updateSession = (wi: number, di: number, si: number, s: PlanSession) =>
    updateWeek(wi, (w) => ({
      ...w,
      days: w.days.map((d, j) => (j === di ? { ...d, sessions: d.sessions.map((x, k) => (k === si ? s : x)) } : d)),
    }));

  const addSession = (wi: number, di: number, type: PlanSession["type"]) => {
    const w = plan.weeks[wi];
    const d = w.days[di];
    const id = newSessionId(allIds, w.week, d.day, { strength: "kraft", wod: "wod", endurance: "ausdauer", program: "programm" }[type]);
    const session: PlanSession =
      type === "strength"
        ? { id, type, title: "Kraft", exercises: [{ exerciseId: "", name: "", sets: 3, reps: 8, restSeconds: 90 }] }
        : type === "wod"
          ? { id, type, name: "WOD", wodType: "for_time", movements: [{ name: "" }] }
          : type === "program"
            ? { id, type, title: "Einheit", blocks: [{ key: "p1", label: "P1", name: "", scoring: { type: "checkmark" } }] }
            : { id, type, sport: "laufen", durationMinutes: 30, intensity: "locker" };
    updateWeek(wi, (wk) => ({
      ...wk,
      days: wk.days.map((dd, j) => (j === di ? { ...dd, sessions: [...dd.sessions, session] } : dd)),
    }));
  };

  const moveSession = (wi: number, di: number, si: number, delta: number) =>
    updateWeek(wi, (w) => ({
      ...w,
      days: w.days.map((d, j) => {
        if (j !== di) return d;
        const arr = [...d.sessions];
        const target = si + delta;
        if (target < 0 || target >= arr.length) return d;
        [arr[si], arr[target]] = [arr[target], arr[si]];
        return { ...d, sessions: arr };
      }),
    }));

  const addDay = (wi: number) => {
    const used = new Set(plan.weeks[wi].days.map((d) => d.day));
    const free = [1, 2, 3, 4, 5, 6, 7].find((n) => !used.has(n));
    if (!free) return;
    updateWeek(wi, (w) => ({ ...w, days: [...w.days, { day: free, sessions: [] }].sort((a, b) => a.day - b.day) }));
  };

  const duplicateWeek = (wi: number) => {
    const src = plan.weeks[wi];
    const nextNo = Math.max(...plan.weeks.map((w) => w.week)) + 1;
    const ids = new Set(allIds);
    const copy = {
      ...structuredClone(src),
      week: nextNo,
      days: src.days.map((d) => ({
        ...structuredClone(d),
        sessions: d.sessions.map((s) => {
          const kind = s.id.replace(/^w\d+d\d+-/, "").replace(/-\d+$/, "") || s.type;
          const id = newSessionId(ids, nextNo, d.day, kind);
          ids.add(id);
          return { ...structuredClone(s), id };
        }),
      })),
    };
    setPlan((p) => ({ ...p, weeks: [...p.weeks, copy] }));
  };

  const submit = () => {
    setErrors([]);
    setMessage("");
    startTransition(async () => {
      const result = await save(cleanPlan(plan), note || "Im Editor bearbeitet");
      if (result.ok) {
        setMessage(`Gespeichert als Version ${result.version}.`);
        setNote("");
        router.refresh();
      } else {
        setErrors(result.errors);
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="card grid gap-3 sm:grid-cols-2">
        <TextField label="Titel" value={plan.title} onChange={(title) => setPlan({ ...plan, title })} />
        <label className="block text-xs text-slate-600">
          Startdatum (Tag 1 von Woche 1)
          <input
            type="date"
            className="input min-h-9 py-1 text-sm"
            value={plan.startDate}
            onChange={(e) => setPlan({ ...plan, startDate: e.target.value })}
          />
        </label>
        <TextField label="Ziel" value={plan.goal} onChange={(goal) => setPlan({ ...plan, goal })} />
        <TextField label="Notizen" value={plan.notes} onChange={(notes) => setPlan({ ...plan, notes })} />
      </div>

      {plan.weeks.map((w, wi) => (
        <details key={wi} className="card space-y-3" open={plan.weeks.length <= 4}>
          <summary className="h2 min-h-11 cursor-pointer py-2">
            Woche {w.week}
            {w.focus && <span className="font-normal text-slate-500"> · {w.focus}</span>}
          </summary>
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-40 flex-1">
              <TextField label="Schwerpunkt" value={w.focus} onChange={(focus) => updateWeek(wi, (x) => ({ ...x, focus }))} />
            </div>
            <button type="button" className="btn-secondary btn-small" onClick={() => duplicateWeek(wi)}>
              Woche duplizieren
            </button>
            <button
              type="button"
              className="btn-danger btn-small"
              onClick={() => setPlan((p) => ({ ...p, weeks: p.weeks.filter((_, i) => i !== wi) }))}
              disabled={plan.weeks.length === 1}
            >
              Woche löschen
            </button>
          </div>
          {w.days.map((d, di) => (
            <div key={di} className="space-y-2 rounded-xl border border-slate-200 p-3">
              <div className="flex flex-wrap items-end gap-2">
                <label className="block text-xs text-slate-600">
                  Tag
                  <select
                    className="input min-h-9 py-1 text-sm"
                    value={d.day}
                    onChange={(e) =>
                      updateWeek(wi, (x) => ({
                        ...x,
                        days: x.days.map((dd, j) => (j === di ? { ...dd, day: int(e.target.value, dd.day) } : dd)),
                      }))
                    }
                  >
                    {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                      <option key={n} value={n}>
                        Tag {n} – {formatDate(sessionDate(plan.startDate || "2026-01-01", w.week, n))}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="min-w-32 flex-1">
                  <TextField
                    label="Titel des Tages"
                    value={d.title}
                    onChange={(title) =>
                      updateWeek(wi, (x) => ({ ...x, days: x.days.map((dd, j) => (j === di ? { ...dd, title } : dd)) }))
                    }
                  />
                </div>
                <button
                  type="button"
                  className="btn-danger btn-small"
                  onClick={() => updateWeek(wi, (x) => ({ ...x, days: x.days.filter((_, j) => j !== di) }))}
                >
                  Tag löschen
                </button>
              </div>
              <TextField
                label="Hinweis zum Tag (ohne Einheiten = Ruhetag)"
                value={d.notes}
                onChange={(notes) => updateWeek(wi, (x) => ({ ...x, days: x.days.map((dd, j) => (j === di ? { ...dd, notes } : dd)) }))}
                multiline
              />
              {d.sessions.map((s, si) => (
                <div key={s.id + si} className="space-y-2 rounded-lg border border-dashed border-slate-300 p-2">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="badge bg-slate-100 text-slate-700">{SESSION_LABELS[s.type]}</span>
                    <span className="font-mono text-xs text-slate-500">ID: {s.id}</span>
                    <span className="flex-1" />
                    <button type="button" className="btn-secondary btn-small" onClick={() => moveSession(wi, di, si, -1)}>
                      ↑
                    </button>
                    <button type="button" className="btn-secondary btn-small" onClick={() => moveSession(wi, di, si, 1)}>
                      ↓
                    </button>
                    <button
                      type="button"
                      className="btn-danger btn-small"
                      onClick={() =>
                        updateWeek(wi, (x) => ({
                          ...x,
                          days: x.days.map((dd, j) => (j === di ? { ...dd, sessions: dd.sessions.filter((_, k) => k !== si) } : dd)),
                        }))
                      }
                    >
                      Einheit löschen
                    </button>
                  </div>
                  {s.type === "strength" && <StrengthEditor s={s} onChange={(n) => updateSession(wi, di, si, n)} />}
                  {s.type === "wod" && <WodEditor s={s} onChange={(n) => updateSession(wi, di, si, n)} />}
                  <TextField
                    label="Zuordnung im Tag (optional, z. B. AM / PM)"
                    value={s.label}
                    onChange={(label) => updateSession(wi, di, si, { ...s, label })}
                  />
                  {s.type === "endurance" && <EnduranceEditor s={s} onChange={(n) => updateSession(wi, di, si, n)} />}
                  {s.type === "program" && <ProgramEditor s={s} onChange={(n) => updateSession(wi, di, si, n)} />}
                </div>
              ))}
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn-secondary btn-small" onClick={() => addSession(wi, di, "strength")}>
                  + Kraft
                </button>
                <button type="button" className="btn-secondary btn-small" onClick={() => addSession(wi, di, "wod")}>
                  + WOD
                </button>
                <button type="button" className="btn-secondary btn-small" onClick={() => addSession(wi, di, "endurance")}>
                  + Ausdauer
                </button>
                <button type="button" className="btn-secondary btn-small" onClick={() => addSession(wi, di, "program")}>
                  + Programm
                </button>
              </div>
            </div>
          ))}
          <button type="button" className="btn-secondary btn-small" onClick={() => addDay(wi)} disabled={w.days.length >= 7}>
            + Tag
          </button>
        </details>
      ))}

      <button
        type="button"
        className="btn-secondary"
        onClick={() =>
          setPlan((p) => ({ ...p, weeks: [...p.weeks, { week: Math.max(0, ...p.weeks.map((w) => w.week)) + 1, days: [] }] }))
        }
      >
        + Woche
      </button>

      <div className="card sticky bottom-2 space-y-2 border-brand-500">
        {errors.length > 0 && (
          <div className="max-h-48 overflow-auto rounded-lg bg-red-50 p-2 text-sm text-red-800">
            <p className="font-semibold">Plan ist noch nicht gültig:</p>
            <ul className="list-disc pl-5">
              {errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </div>
        )}
        {message && <p className="text-sm text-green-700">{message}</p>}
        <div className="flex flex-wrap items-center gap-2">
          <input
            className="input min-w-48 flex-1"
            placeholder="Was wurde geändert? (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <button type="button" className="btn-primary" onClick={submit} disabled={pending}>
            {pending ? "Speichere …" : "Als neue Version speichern"}
          </button>
          <a href={backHref} className="btn-secondary">
            Zurück
          </a>
        </div>
      </div>
    </div>
  );
}
