import type { Deviation, DeviationValue } from "@/lib/calc/deviation";
import { formatDuration, formatNumber } from "@/lib/format";

function Row({ label, v, unit }: { label: string; v: DeviationValue; unit: "time" | "km" }) {
  const f = (n: number) => (unit === "time" ? formatDuration(n) : `${formatNumber(n / 1000, 2)} km`);
  const sign = v.abs > 0 ? "+" : v.abs < 0 ? "−" : "±";
  const absText = unit === "time" ? formatDuration(Math.abs(v.abs)) : `${formatNumber(Math.abs(v.abs) / 1000, 2)} km`;
  return (
    <tr>
      <td className="py-1 pr-3 text-slate-600">{label}</td>
      <td className="py-1 pr-3">{f(v.planned)}</td>
      <td className="py-1 pr-3">{f(v.actual)}</td>
      <td className={`py-1 font-semibold ${Math.abs(v.pct) <= 5 ? "text-green-700" : "text-amber-700"}`}>
        {sign}
        {absText} ({v.pct > 0 ? "+" : ""}
        {formatNumber(v.pct, 1)} %)
      </td>
    </tr>
  );
}

export function DeviationView({ deviation }: { deviation: Deviation }) {
  if (!deviation.duration && !deviation.distance) return null;
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs text-slate-500">
          <th className="pr-3 font-medium" />
          <th className="pr-3 font-medium">Plan</th>
          <th className="pr-3 font-medium">Ist</th>
          <th className="font-medium">Abweichung</th>
        </tr>
      </thead>
      <tbody>
        {deviation.duration && <Row label="Dauer" v={deviation.duration} unit="time" />}
        {deviation.distance && <Row label="Distanz" v={deviation.distance} unit="km" />}
      </tbody>
    </table>
  );
}
