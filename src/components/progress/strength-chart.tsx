"use client";

import { useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { OneRmFormula } from "@/lib/calc/one-rep-max";
import { strengthSeries, type StrengthPoint, type StrengthSetRecord } from "@/lib/calc/volume";
import { formatDate, formatNumber } from "@/lib/format";
import { Toggle } from "./endurance-chart";

const BRAND = "#1f5bc4";
const WARN = "#b45309";

interface DotProps {
  cx?: number;
  cy?: number;
  payload?: StrengthPoint;
}

/** Punkt: gefüllt = verlässlich, hohl orange = Satz mit 10 oder mehr Wdh. (Brzycki: nur unter 10 gültig) */
function Dot({ cx, cy, payload }: DotProps) {
  if (cx == null || cy == null) return null;
  const unreliable = payload?.unreliable;
  return (
    <circle cx={cx} cy={cy} r={5} stroke={unreliable ? WARN : "#fff"} strokeWidth={2} fill={unreliable ? "#fff" : BRAND} />
  );
}

export function StrengthChart({ records, exercises }: { records: StrengthSetRecord[]; exercises: { id: string; name: string }[] }) {
  const [exerciseId, setExerciseId] = useState(exercises[0]?.id ?? "");
  const [metric, setMetric] = useState<"volume" | "oneRm">("volume");
  const [formula, setFormula] = useState<OneRmFormula>("epley");
  if (exercises.length === 0) return <p className="muted">Noch keine Kraftsätze eingetragen.</p>;
  const data = strengthSeries(records, exerciseId, formula).map((p) => ({ ...p, label: formatDate(p.date, false).slice(0, 6) }));
  const anyUnreliable = metric === "oneRm" && data.some((d) => d.unreliable);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <select className="input w-auto min-h-9 py-1 text-sm" value={exerciseId} onChange={(e) => setExerciseId(e.target.value)} aria-label="Übung">
          {exercises.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
        <Toggle value={metric} onChange={setMetric} options={[["volume", "Volumen"], ["oneRm", "geschätztes 1RM"]]} />
        {metric === "oneRm" && <Toggle value={formula} onChange={setFormula} options={[["epley", "Epley"], ["brzycki", "Brzycki"]]} />}
      </div>
      <p className="text-sm font-medium text-slate-700">
        {metric === "volume" ? "Volumen pro Einheit (Σ Gewicht × Wdh., kg)" : `Geschätztes 1RM (${formula === "epley" ? "Epley: w·(1 + r/30)" : "Brzycki: w·36/(37 − r)"}), bester Satz der Einheit`}
      </p>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={{ stroke: "#cbd5e1" }} />
            <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} domain={["auto", "auto"]} />
            <Tooltip
              content={({ active, payload }) => {
                const p = active ? (payload?.[0]?.payload as StrengthPoint | undefined) : undefined;
                if (!p) return null;
                return (
                  <div className="rounded-lg border border-slate-200 bg-white p-2 text-xs shadow">
                    <p className="font-semibold">{formatDate(p.date)}</p>
                    <p>Volumen: {formatNumber(p.volume, 0)} kg</p>
                    {p.oneRm != null && (
                      <p>
                        1RM ≈ {formatNumber(p.oneRm, 1)} kg (bester Satz {formatNumber(p.bestWeightKg ?? 0)} kg × {p.bestReps})
                      </p>
                    )}
                    {p.unreliable && <p className="text-amber-700">⚠ Satz mit 10 oder mehr Wdh. – Schätzung weniger verlässlich</p>}
                  </div>
                );
              }}
            />
            <Line
              type="monotone"
              dataKey={metric}
              stroke={BRAND}
              strokeWidth={2}
              dot={metric === "oneRm" ? <Dot /> : { r: 4, fill: BRAND, stroke: "#fff", strokeWidth: 2 }}
              activeDot={{ r: 6 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {anyUnreliable && (
        <p className="text-xs text-amber-700">Hohle orange Punkte: bester Satz mit 10 oder mehr Wiederholungen – 1RM-Schätzung weniger verlässlich.</p>
      )}
    </div>
  );
}
