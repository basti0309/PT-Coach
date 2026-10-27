"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { aggregateEndurance, type EnduranceEntry } from "@/lib/calc/aggregate";
import { SPORT_LABELS, type Sport } from "@/lib/calc/sport";
import { formatNumber } from "@/lib/format";

const BRAND = "#1f5bc4";

function Toggle<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex rounded-xl bg-slate-100 p-1 text-sm">
      {options.map(([v, label]) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={`min-h-9 rounded-lg px-3 font-medium ${value === v ? "bg-white shadow-sm" : "text-slate-600"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export { Toggle };

/** Trainingszeit (und für den Kunden: km) je Woche/Monat, je Sportart filterbar. */
export function EnduranceChart({ entries, showKm }: { entries: EnduranceEntry[]; showKm: boolean }) {
  const [period, setPeriod] = useState<"week" | "month">("week");
  const [metric, setMetric] = useState<"minutes" | "km">("minutes");
  const [sport, setSport] = useState<string>("alle");
  const sports = useMemo(() => [...new Set(entries.map((e) => e.sport).filter(Boolean))] as Sport[], [entries]);
  const data = aggregateEndurance(entries, period, sport);
  const m = showKm ? metric : "minutes";

  if (entries.length === 0) return <p className="muted">Noch keine Ausdauereinheiten.</p>;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Toggle value={period} onChange={setPeriod} options={[["week", "Woche"], ["month", "Monat"]]} />
        {showKm && <Toggle value={metric} onChange={setMetric} options={[["minutes", "Zeit"], ["km", "km"]]} />}
        <select className="input w-auto min-h-9 py-1 text-sm" value={sport} onChange={(e) => setSport(e.target.value)} aria-label="Sportart">
          <option value="alle">Alle Sportarten</option>
          {sports.map((s) => (
            <option key={s} value={s}>
              {SPORT_LABELS[s] ?? s}
            </option>
          ))}
        </select>
      </div>
      <p className="text-sm font-medium text-slate-700">{m === "minutes" ? "Trainingszeit in Minuten" : "Distanz in km"}</p>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={{ stroke: "#cbd5e1" }} />
            <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
            <Tooltip
              cursor={{ fill: "#f1f5f9" }}
              formatter={(v) => [m === "minutes" ? `${formatNumber(Number(v), 0)} min` : `${formatNumber(Number(v), 1)} km`, m === "minutes" ? "Zeit" : "Distanz"]}
            />
            <Bar dataKey={m} fill={BRAND} radius={[4, 4, 0, 0]} maxBarSize={36} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <details className="text-sm">
        <summary className="cursor-pointer text-slate-600">Als Tabelle</summary>
        <table className="mt-2 w-full">
          <thead>
            <tr className="text-left text-slate-500">
              <th className="font-medium">Zeitraum</th>
              <th className="font-medium">Minuten</th>
              {showKm && <th className="font-medium">km</th>}
            </tr>
          </thead>
          <tbody>
            {data.map((b) => (
              <tr key={b.key}>
                <td>{b.label}</td>
                <td>{formatNumber(b.minutes, 0)}</td>
                {showKm && <td>{formatNumber(b.km, 1)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
