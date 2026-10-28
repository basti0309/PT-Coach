"use client";

import { useActionState, useState, useTransition } from "react";
import type { FormState } from "@/lib/actions/profile";
import { HYROX_DIVISION_LABELS } from "@/lib/calc/hyrox";
import { DGE_PAL } from "@/lib/calc/pal";
import { SPORT_LABELS, SPORTS, type Sport } from "@/lib/calc/sport";
import { formatDuration, formatNumber, parseDecimal, parseDuration } from "@/lib/format";
import {
  ABSENCE_OPTIONS,
  COMPETITION_LEVEL_LABELS,
  COMPETITION_LEVELS,
  DIET_STYLES,
  EVENT_KINDS,
  GOAL_LABELS,
  GOALS,
  HYROX_DIVISIONS,
  LIFT_LABELS,
  LIFTS,
  WORK_ACTIVITIES,
  type Answers,
  type CompetitionLevel,
  type Goal,
  type HyroxDivision,
} from "@/lib/questionnaire/schema";

const WEEKDAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const ABSENCE_LABELS = { keine: "kein Training möglich", koerpergewicht: "nur Körpergewicht", hotel_gym: "Hotel-Gym" } as const;
const EVENT_LABELS = { hyrox: "Hyrox", lauf: "Laufwettkampf", sonstiges: "Sonstiges" } as const;
const DIET_LABELS = { omnivor: "Mischkost", vegetarisch: "vegetarisch", vegan: "vegan", sonstiges: "Sonstiges" } as const;
const WEEK_LABELS = ["letzte Woche", "vor 2 Wochen", "vor 3 Wochen", "vor 4 Wochen"];

type YesNo = "" | "ja" | "nein";
interface Week {
  enduranceSessions: string;
  enduranceMinutes: string;
  vigorousMinutes: string;
  runKm: string;
  strengthSessions: string;
}
interface Vals {
  goal: Goal | "";
  weekdays: number[];
  events: { date: string; name: string; kind: (typeof EVENT_KINDS)[number]; detail: string }[];
  absences: { from: string; to: string; option: (typeof ABSENCE_OPTIONS)[number] }[];
  workActivity: (typeof WORK_ACTIVITIES)[number] | "";
  sportOften: YesNo;
  volume: Week[];
  mainSport: string;
  competedLast12Months: YesNo;
  competitionLevel: CompetitionLevel | "";
  hyroxDivision: HyroxDivision | "";
  hyroxResults: { date: string; division: HyroxDivision; total: string; run: string }[];
  equipment: { sled: boolean; skierg: boolean; rower: boolean; wallball: boolean };
  bests: { km: string; time: string; date: string; race: boolean }[];
  longestRunMinutes: string;
  targetKm: string;
  targetDate: string;
  targetTime: string;
  liftExp: Record<(typeof LIFTS)[number], string>;
  weightGoalKg: string;
  weightGoalDate: string;
  dietStyle: (typeof DIET_STYLES)[number] | "";
  intolerances: string;
  enduranceSports: Sport[];
}

const str = (n: number | null | undefined, digits = 2) => (n == null ? "" : formatNumber(n, digits));
const yn = (b: boolean | undefined): YesNo => (b == null ? "" : b ? "ja" : "nein");
const emptyWeek = (): Week => ({ enduranceSessions: "", enduranceMinutes: "", vigorousMinutes: "", runKm: "", strengthSessions: "" });

function fromAnswers(a: Answers | null): Vals {
  const x = a ?? {};
  return {
    goal: x.goal ?? "",
    weekdays: x.weekdays ?? [],
    events: x.events ?? [],
    absences: x.absences ?? [],
    workActivity: x.workActivity ?? "",
    sportOften: yn(x.sportOften),
    volume: x.volume
      ? x.volume.map((w) => ({
          enduranceSessions: String(w.enduranceSessions),
          enduranceMinutes: String(w.enduranceMinutes),
          vigorousMinutes: String(w.vigorousMinutes),
          runKm: str(w.runKm, 1),
          strengthSessions: String(w.strengthSessions),
        }))
      : [emptyWeek(), emptyWeek(), emptyWeek(), emptyWeek()],
    mainSport: x.mainSport ?? "",
    competedLast12Months: yn(x.competedLast12Months),
    competitionLevel: x.competitionLevel ?? "",
    hyroxDivision: x.hyrox?.division ?? "",
    hyroxResults: (x.hyrox?.results ?? []).map((r) => ({
      date: r.date,
      division: r.division,
      total: formatDuration(r.totalSeconds),
      run: r.runSeconds != null ? formatDuration(r.runSeconds) : "",
    })),
    equipment: x.hyrox?.equipment ?? { sled: false, skierg: false, rower: false, wallball: false },
    bests: (x.laufen?.bests ?? []).map((b) => ({ km: str(b.distanceM / 1000, 3), time: formatDuration(b.seconds), date: b.date, race: b.race })),
    longestRunMinutes: x.laufen?.longestRunMinutes != null ? String(x.laufen.longestRunMinutes) : "",
    targetKm: x.laufen?.targetRace ? str(x.laufen.targetRace.distanceM / 1000, 4) : "",
    targetDate: x.laufen?.targetRace?.date ?? "",
    targetTime: x.laufen?.targetRace?.targetSeconds != null ? formatDuration(x.laufen.targetRace.targetSeconds) : "",
    liftExp: {
      squat: x.liftExperienceMonths ? String(x.liftExperienceMonths.squat) : "",
      bench: x.liftExperienceMonths ? String(x.liftExperienceMonths.bench) : "",
      deadlift: x.liftExperienceMonths ? String(x.liftExperienceMonths.deadlift) : "",
    },
    weightGoalKg: str(x.weightGoal?.targetKg, 1),
    weightGoalDate: x.weightGoal?.byDate ?? "",
    dietStyle: x.diet?.style ?? "",
    intolerances: x.diet?.intolerances ?? "",
    enduranceSports: x.enduranceSports ?? [],
  };
}

const int = (s: string) => (s.trim() === "" ? null : Number.isInteger(Number(s)) ? Number(s) : NaN);

/** Nur ausgefüllte Angaben; Zweige nur für das gewählte Ziel. Ungültiges bleibt drin → Server meldet die Stelle. */
function toAnswers(v: Vals, gymAccess: boolean | null): Answers {
  const a: Record<string, unknown> = {};
  if (v.goal) a.goal = v.goal;
  if (v.weekdays.length) a.weekdays = [...v.weekdays].sort();
  a.events = v.events;
  a.absences = v.absences;
  if (v.workActivity) a.workActivity = v.workActivity;
  if (v.sportOften) a.sportOften = v.sportOften === "ja";
  if (v.volume.some((w) => Object.values(w).some((x) => x.trim() !== ""))) {
    a.volume = v.volume.map((w) => ({
      enduranceSessions: int(w.enduranceSessions) ?? 0,
      enduranceMinutes: int(w.enduranceMinutes) ?? 0,
      vigorousMinutes: int(w.vigorousMinutes) ?? 0,
      runKm: w.runKm.trim() === "" ? 0 : (parseDecimal(w.runKm) ?? NaN),
      strengthSessions: int(w.strengthSessions) ?? 0,
    }));
  }
  a.mainSport = v.mainSport.trim();
  if (v.competedLast12Months) a.competedLast12Months = v.competedLast12Months === "ja";
  if (v.competitionLevel) a.competitionLevel = v.competitionLevel;
  if (v.goal === "hyrox" && v.hyroxDivision) {
    a.hyrox = {
      division: v.hyroxDivision,
      results: v.hyroxResults.map((r) => ({
        date: r.date,
        division: r.division,
        totalSeconds: parseDuration(r.total) ?? NaN,
        runSeconds: r.run.trim() ? (parseDuration(r.run) ?? NaN) : null,
      })),
      equipment: v.equipment,
    };
  }
  if (v.goal === "laufen" && (v.bests.length || v.longestRunMinutes)) {
    a.laufen = {
      bests: v.bests.map((b) => ({ distanceM: Math.round((parseDecimal(b.km) ?? NaN) * 1000), seconds: parseDuration(b.time) ?? NaN, date: b.date, race: b.race })),
      longestRunMinutes: int(v.longestRunMinutes) ?? 0,
      targetRace:
        v.targetKm && v.targetDate
          ? {
              distanceM: Math.round((parseDecimal(v.targetKm) ?? NaN) * 1000),
              date: v.targetDate,
              targetSeconds: v.targetTime ? (parseDuration(v.targetTime) ?? NaN) : null,
            }
          : null,
    };
  }
  const liftsShown = v.goal === "kraft_muskelaufbau" || ((v.goal === "hyrox" || v.goal === "laufen") && gymAccess === true);
  if (liftsShown && LIFTS.every((l) => v.liftExp[l] !== "")) {
    a.liftExperienceMonths = { squat: int(v.liftExp.squat), bench: int(v.liftExp.bench), deadlift: int(v.liftExp.deadlift) };
  }
  if (v.goal === "abnehmen" || v.goal === "kraft_muskelaufbau") {
    a.weightGoal = { targetKg: v.weightGoalKg ? parseDecimal(v.weightGoalKg) : null, byDate: v.weightGoalDate || null };
    if (v.dietStyle) a.diet = { style: v.dietStyle, intolerances: v.intolerances.trim() };
  }
  if ((v.goal === "abnehmen" || v.goal === "fitness_gesundheit") && v.enduranceSports.length) a.enduranceSports = v.enduranceSports;
  return a as Answers;
}

function Q({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

function YesNoSelect({ value, onChange }: { value: YesNo; onChange: (v: YesNo) => void }) {
  return (
    <select className="input" value={value} onChange={(e) => onChange(e.target.value as YesNo)}>
      <option value="">–</option>
      <option value="ja">ja</option>
      <option value="nein">nein</option>
    </select>
  );
}

export function QuestionnaireForm({
  initial,
  gymAccess,
  action,
}: {
  initial: Answers | null;
  gymAccess: boolean | null;
  action: (prev: FormState, data: FormData) => Promise<FormState>;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [, startTransition] = useTransition();
  const [v, setV] = useState<Vals>(() => fromAnswers(initial));
  const set = <K extends keyof Vals>(k: K, val: Vals[K]) => setV((p) => ({ ...p, [k]: val }));
  const g = v.goal;
  const liftsShown = g === "kraft_muskelaufbau" || ((g === "hyrox" || g === "laufen") && gymAccess === true);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData();
    fd.set("payload", JSON.stringify(toAnswers(v, gymAccess)));
    startTransition(() => formAction(fd));
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <section className="card space-y-3">
        <h2 className="h2">1. Ziel</h2>
        <Q label="Was ist dein Hauptziel?" hint="Bestimmt Vorlage, Testwoche und welche Fragen folgen.">
          <select className="input" value={g} onChange={(e) => set("goal", e.target.value as Goal | "")}>
            <option value="">– bitte wählen –</option>
            {GOALS.map((x) => (
              <option key={x} value={x}>
                {GOAL_LABELS[x]}
              </option>
            ))}
          </select>
        </Q>
      </section>

      <section className="card space-y-3">
        <h2 className="h2">2. Rahmen</h2>
        <fieldset>
          <legend className="label">An welchen Wochentagen kannst du trainieren?</legend>
          <div className="flex flex-wrap gap-2">
            {WEEKDAY_LABELS.map((label, i) => {
              const day = i + 1;
              const on = v.weekdays.includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  aria-pressed={on}
                  className={`min-h-11 min-w-11 rounded-lg border px-3 ${on ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300 bg-white"}`}
                  onClick={() => set("weekdays", on ? v.weekdays.filter((d) => d !== day) : [...v.weekdays, day])}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </fieldset>
        <Q label="Beruf und Alltag" hint="Für den Vorschlag des Aktivitätsfaktors (PAL) nach DGE.">
          <select className="input" value={v.workActivity} onChange={(e) => set("workActivity", e.target.value as Vals["workActivity"])}>
            <option value="">– bitte wählen –</option>
            {WORK_ACTIVITIES.map((w) => (
              <option key={w} value={w}>
                {DGE_PAL[w].label}
              </option>
            ))}
          </select>
        </Q>
        <Q label="Machst du Sport oder Anstrengendes in der Freizeit, 4–5× pro Woche je 30–60 Minuten?">
          <YesNoSelect value={v.sportOften} onChange={(x) => set("sportOften", x)} />
        </Q>

        <div className="space-y-2">
          <p className="label">Termine und Wettkämpfe</p>
          {v.events.map((ev, i) => (
            <div key={i} className="grid gap-2 rounded-lg border border-slate-200 p-2 sm:grid-cols-4">
              <input type="date" className="input" aria-label="Datum" value={ev.date} onChange={(e) => set("events", v.events.map((x, j) => (j === i ? { ...x, date: e.target.value } : x)))} />
              <select className="input" aria-label="Art" value={ev.kind} onChange={(e) => set("events", v.events.map((x, j) => (j === i ? { ...x, kind: e.target.value as typeof ev.kind } : x)))}>
                {EVENT_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {EVENT_LABELS[k]}
                  </option>
                ))}
              </select>
              <input className="input" placeholder="Name" value={ev.name} onChange={(e) => set("events", v.events.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
              <div className="flex gap-2">
                <input className="input" placeholder="Strecke/Division" value={ev.detail} onChange={(e) => set("events", v.events.map((x, j) => (j === i ? { ...x, detail: e.target.value } : x)))} />
                <button type="button" className="btn-secondary btn-small" onClick={() => set("events", v.events.filter((_, j) => j !== i))}>
                  ✕
                </button>
              </div>
            </div>
          ))}
          <button type="button" className="btn-secondary btn-small" onClick={() => set("events", [...v.events, { date: "", name: "", kind: "sonstiges", detail: "" }])}>
            + Termin
          </button>
        </div>

        <div className="space-y-2">
          <p className="label">Reisen und Ausfallzeiten</p>
          {v.absences.map((ab, i) => (
            <div key={i} className="grid gap-2 rounded-lg border border-slate-200 p-2 sm:grid-cols-4">
              <input type="date" className="input" aria-label="von" value={ab.from} onChange={(e) => set("absences", v.absences.map((x, j) => (j === i ? { ...x, from: e.target.value } : x)))} />
              <input type="date" className="input" aria-label="bis" value={ab.to} onChange={(e) => set("absences", v.absences.map((x, j) => (j === i ? { ...x, to: e.target.value } : x)))} />
              <select className="input" aria-label="Trainingsmöglichkeit" value={ab.option} onChange={(e) => set("absences", v.absences.map((x, j) => (j === i ? { ...x, option: e.target.value as typeof ab.option } : x)))}>
                {ABSENCE_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {ABSENCE_LABELS[o]}
                  </option>
                ))}
              </select>
              <button type="button" className="btn-secondary btn-small" onClick={() => set("absences", v.absences.filter((_, j) => j !== i))}>
                ✕ entfernen
              </button>
            </div>
          ))}
          <button type="button" className="btn-secondary btn-small" onClick={() => set("absences", [...v.absences, { from: "", to: "", option: "keine" }])}>
            + Zeitraum
          </button>
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="h2">3. Training der letzten 4 Wochen</h2>
        <p className="muted">Tatsächliche Zahlen, keine Schätzung „normalerweise“. Daraus ergeben sich Einstufung und Startumfang.</p>
        {v.volume.map((w, i) => (
          <fieldset key={i} className="space-y-2 rounded-lg border border-slate-200 p-2">
            <legend className="px-1 text-sm font-semibold">{WEEK_LABELS[i]}</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {(
                [
                  ["enduranceSessions", "Ausdauer-Einheiten", "numeric"],
                  ["enduranceMinutes", "Ausdauer-Minuten", "numeric"],
                  ["vigorousMinutes", "davon intensiv (min)", "numeric"],
                  ["runKm", "Lauf-km", "decimal"],
                  ["strengthSessions", "Kraft-Einheiten", "numeric"],
                ] as const
              ).map(([k, label, mode]) => (
                <label key={k} className="block">
                  <span className="text-xs text-slate-600">{label}</span>
                  <input
                    className="input"
                    inputMode={mode}
                    value={w[k]}
                    onChange={(e) => set("volume", v.volume.map((x, j) => (j === i ? { ...x, [k]: e.target.value } : x)))}
                  />
                </label>
              ))}
            </div>
          </fieldset>
        ))}
        <p className="text-xs text-slate-500">
          Ausdauer = Bewegung mit mindestens mittlerer Anstrengung (z. B. zügiges Gehen, Rad, Laufen). Intensiv = Sprechen nur noch in Wortfetzen.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Q label="Betreibst du eine Sportart gezielt? Welche?" hint="leer lassen, wenn nicht">
            <input className="input" value={v.mainSport} onChange={(e) => set("mainSport", e.target.value)} />
          </Q>
          <Q label="Wettkampf in den letzten 12 Monaten?">
            <YesNoSelect value={v.competedLast12Months} onChange={(x) => set("competedLast12Months", x)} />
          </Q>
          <Q label="Höchstes Wettkampfniveau">
            <select className="input" value={v.competitionLevel} onChange={(e) => set("competitionLevel", e.target.value as Vals["competitionLevel"])}>
              <option value="">–</option>
              {COMPETITION_LEVELS.map((c) => (
                <option key={c} value={c}>
                  {COMPETITION_LEVEL_LABELS[c]}
                </option>
              ))}
            </select>
          </Q>
        </div>
      </section>

      {g === "hyrox" && (
        <section className="card space-y-3">
          <h2 className="h2">4. Hyrox</h2>
          <Q label="In welcher Division willst du starten?" hint="Bestimmt die Stationsgewichte (Rulebook 26/27).">
            <select className="input" value={v.hyroxDivision} onChange={(e) => set("hyroxDivision", e.target.value as HyroxDivision | "")}>
              <option value="">–</option>
              {HYROX_DIVISIONS.map((d) => (
                <option key={d} value={d}>
                  {HYROX_DIVISION_LABELS[d]}
                </option>
              ))}
            </select>
          </Q>
          <fieldset>
            <legend className="label">Welche Geräte hast du im Training?</legend>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ["sled", "Schlitten"],
                  ["skierg", "SkiErg"],
                  ["rower", "Rudergerät"],
                  ["wallball", "Wall Ball + Ziel"],
                ] as const
              ).map(([k, label]) => (
                <label key={k} className="flex min-h-11 items-center gap-2">
                  <input type="checkbox" className="h-5 w-5" checked={v.equipment[k]} onChange={(e) => set("equipment", { ...v.equipment, [k]: e.target.checked })} />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="space-y-2">
            <p className="label">Bisherige Hyrox-Ergebnisse (laut Ergebnisliste)</p>
            {v.hyroxResults.map((r, i) => (
              <div key={i} className="grid gap-2 rounded-lg border border-slate-200 p-2 sm:grid-cols-5">
                <input type="date" className="input" aria-label="Datum" value={r.date} onChange={(e) => set("hyroxResults", v.hyroxResults.map((x, j) => (j === i ? { ...x, date: e.target.value } : x)))} />
                <select className="input" aria-label="Division" value={r.division} onChange={(e) => set("hyroxResults", v.hyroxResults.map((x, j) => (j === i ? { ...x, division: e.target.value as HyroxDivision } : x)))}>
                  {HYROX_DIVISIONS.map((d) => (
                    <option key={d} value={d}>
                      {HYROX_DIVISION_LABELS[d]}
                    </option>
                  ))}
                </select>
                <input className="input" inputMode="numeric" placeholder="Gesamtzeit h:mm:ss" value={r.total} onChange={(e) => set("hyroxResults", v.hyroxResults.map((x, j) => (j === i ? { ...x, total: e.target.value } : x)))} />
                <input className="input" inputMode="numeric" placeholder="Laufzeit gesamt (optional)" value={r.run} onChange={(e) => set("hyroxResults", v.hyroxResults.map((x, j) => (j === i ? { ...x, run: e.target.value } : x)))} />
                <button type="button" className="btn-secondary btn-small" onClick={() => set("hyroxResults", v.hyroxResults.filter((_, j) => j !== i))}>
                  ✕ entfernen
                </button>
              </div>
            ))}
            <button
              type="button"
              className="btn-secondary btn-small"
              onClick={() => set("hyroxResults", [...v.hyroxResults, { date: "", division: v.hyroxDivision || "men", total: "", run: "" }])}
            >
              + Ergebnis
            </button>
          </div>
        </section>
      )}

      {g === "laufen" && (
        <section className="card space-y-3">
          <h2 className="h2">4. Laufen</h2>
          <div className="space-y-2">
            <p className="label">Bestzeiten (Strecke, Zeit, Datum)</p>
            {v.bests.map((b, i) => (
              <div key={i} className="grid gap-2 rounded-lg border border-slate-200 p-2 sm:grid-cols-5">
                <input className="input" inputMode="decimal" placeholder="km, z. B. 10" value={b.km} onChange={(e) => set("bests", v.bests.map((x, j) => (j === i ? { ...x, km: e.target.value } : x)))} />
                <input className="input" inputMode="numeric" placeholder="Zeit mm:ss" value={b.time} onChange={(e) => set("bests", v.bests.map((x, j) => (j === i ? { ...x, time: e.target.value } : x)))} />
                <input type="date" className="input" aria-label="Datum" value={b.date} onChange={(e) => set("bests", v.bests.map((x, j) => (j === i ? { ...x, date: e.target.value } : x)))} />
                <label className="flex min-h-11 items-center gap-2">
                  <input type="checkbox" className="h-5 w-5" checked={b.race} onChange={(e) => set("bests", v.bests.map((x, j) => (j === i ? { ...x, race: e.target.checked } : x)))} />
                  Wettkampf
                </label>
                <button type="button" className="btn-secondary btn-small" onClick={() => set("bests", v.bests.filter((_, j) => j !== i))}>
                  ✕ entfernen
                </button>
              </div>
            ))}
            <button type="button" className="btn-secondary btn-small" onClick={() => set("bests", [...v.bests, { km: "", time: "", date: "", race: true }])}>
              + Bestzeit
            </button>
          </div>
          <Q label="Längster Lauf der letzten 4 Wochen (Minuten)">
            <input className="input" inputMode="numeric" value={v.longestRunMinutes} onChange={(e) => set("longestRunMinutes", e.target.value)} />
          </Q>
          <fieldset className="grid gap-2 sm:grid-cols-3">
            <legend className="label">Zielwettkampf (optional)</legend>
            <input className="input" inputMode="decimal" placeholder="Strecke km" value={v.targetKm} onChange={(e) => set("targetKm", e.target.value)} />
            <input type="date" className="input" aria-label="Datum" value={v.targetDate} onChange={(e) => set("targetDate", e.target.value)} />
            <input className="input" inputMode="numeric" placeholder="Zielzeit (optional)" value={v.targetTime} onChange={(e) => set("targetTime", e.target.value)} />
          </fieldset>
        </section>
      )}

      {liftsShown && (
        <section className="card space-y-3">
          <h2 className="h2">Kraft: Erfahrung je Übung</h2>
          <p className="muted">Monate regelmäßiges Training (0, wenn nie). Ab 6 Monaten und Stufe 2 ist ein 3RM-Test möglich.</p>
          <div className="grid grid-cols-3 gap-2">
            {LIFTS.map((l) => (
              <label key={l} className="block">
                <span className="text-xs text-slate-600">{LIFT_LABELS[l]}</span>
                <input className="input" inputMode="numeric" value={v.liftExp[l]} onChange={(e) => set("liftExp", { ...v.liftExp, [l]: e.target.value })} />
              </label>
            ))}
          </div>
          <p className="text-xs text-slate-500">Deine Kraftwerte („Gewicht × Wiederholungen“) trägst du unten unter „Kraftwerte“ ein.</p>
        </section>
      )}

      {(g === "abnehmen" || g === "kraft_muskelaufbau") && (
        <section className="card space-y-3">
          <h2 className="h2">Ernährung</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Q label="Ernährungsweise">
              <select className="input" value={v.dietStyle} onChange={(e) => set("dietStyle", e.target.value as Vals["dietStyle"])}>
                <option value="">–</option>
                {DIET_STYLES.map((d) => (
                  <option key={d} value={d}>
                    {DIET_LABELS[d]}
                  </option>
                ))}
              </select>
            </Q>
            <Q label="Unverträglichkeiten / Allergien (optional)">
              <input className="input" value={v.intolerances} onChange={(e) => set("intolerances", e.target.value)} />
            </Q>
            <Q label="Zielgewicht in kg (optional)">
              <input className="input" inputMode="decimal" value={v.weightGoalKg} onChange={(e) => set("weightGoalKg", e.target.value)} />
            </Q>
            <Q label="bis wann? (optional)">
              <input type="date" className="input" value={v.weightGoalDate} onChange={(e) => set("weightGoalDate", e.target.value)} />
            </Q>
          </div>
        </section>
      )}

      {(g === "abnehmen" || g === "fitness_gesundheit") && (
        <section className="card space-y-3">
          <h2 className="h2">Ausdauer: was machst du gern?</h2>
          <div className="grid grid-cols-2 gap-2">
            {SPORTS.map((sp) => (
              <label key={sp} className="flex min-h-11 items-center gap-2">
                <input
                  type="checkbox"
                  className="h-5 w-5"
                  checked={v.enduranceSports.includes(sp)}
                  onChange={(e) => set("enduranceSports", e.target.checked ? [...v.enduranceSports, sp] : v.enduranceSports.filter((x) => x !== sp))}
                />
                {SPORT_LABELS[sp]}
              </label>
            ))}
          </div>
        </section>
      )}

      <div className="sticky bottom-16 z-10 space-y-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm md:bottom-2">
        {state.ok && <p className="text-sm text-green-700">{state.ok}</p>}
        {state.error && <p className="text-sm text-red-700">{state.error}</p>}
        <button className="btn-primary w-full" disabled={pending}>
          {pending ? "Speichere …" : "Fragebogen speichern"}
        </button>
      </div>
    </form>
  );
}
