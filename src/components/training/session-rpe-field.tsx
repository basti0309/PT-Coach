"use client";

import { CR10_LABELS } from "@/lib/calc/session-load";

/** Session-RPE nach Foster 2001 (CR-10). Optional; Last = RPE × Minuten (Regel R12). */
export function SessionRpeField({
  rpe,
  onRpe,
  minutes,
  onMinutes,
}: {
  rpe: string;
  onRpe: (v: string) => void;
  /** nur bei Kraft/WOD: Dauer der Einheit, die sonst nicht erfasst wird */
  minutes?: string;
  onMinutes?: (v: string) => void;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="label">Wie anstrengend war die Einheit insgesamt? (0–10, optional)</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        <select className="input" value={rpe} onChange={(e) => onRpe(e.target.value)} aria-label="Session-RPE">
          <option value="">– noch nicht bewertet –</option>
          {Object.entries(CR10_LABELS).map(([v, label]) => (
            <option key={v} value={v}>
              {v}
              {label && ` – ${label}`}
            </option>
          ))}
        </select>
        {onMinutes && (
          <input
            className="input"
            inputMode="numeric"
            placeholder="Dauer der Einheit (min)"
            aria-label="Dauer der Einheit in Minuten"
            value={minutes ?? ""}
            onChange={(e) => onMinutes(e.target.value.replace(/\D/g, ""))}
          />
        )}
      </div>
      <p className="text-xs text-slate-500">Am aussagekräftigsten etwa 30 Minuten nach dem Training – du kannst den Wert später nachtragen.</p>
    </fieldset>
  );
}

export function parseRpe(v: string): number | null {
  if (v === "") return null;
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 && n <= 10 ? n : null;
}
