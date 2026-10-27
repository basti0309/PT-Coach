"use client";

import { useActionState } from "react";
import type { ClientProfileRow } from "@/lib/db-types";
import { PAL_OPTIONS } from "@/lib/calc/calories";
import type { FormState } from "@/lib/actions/profile";

export function ProfileForm({
  profile,
  isCoach,
  action,
}: {
  profile: ClientProfileRow | null;
  isCoach: boolean;
  action: (prev: FormState, data: FormData) => Promise<FormState>;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const p = profile;
  const palValues = PAL_OPTIONS.map((o) => o.value);
  const pal = p?.pal_factor ?? 1.5;
  return (
    <form action={formAction} className="card space-y-3">
      <h2 className="h2">Stammdaten</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="label">Geschlecht (für Grundumsatz)</span>
          <select name="sex" className="input" defaultValue={p?.sex ?? ""}>
            <option value="">–</option>
            <option value="w">weiblich</option>
            <option value="m">männlich</option>
          </select>
        </label>
        <label className="block">
          <span className="label">Alter</span>
          <input name="age" className="input" inputMode="numeric" defaultValue={p?.age ?? ""} />
        </label>
        <label className="block">
          <span className="label">Größe (cm)</span>
          <input name="height_cm" className="input" inputMode="decimal" defaultValue={p?.height_cm ?? ""} />
        </label>
        <label className="block">
          <span className="label">Trainingstage pro Woche</span>
          <input name="training_days_per_week" className="input" inputMode="numeric" defaultValue={p?.training_days_per_week ?? ""} />
        </label>
        <label className="block">
          <span className="label">Max. Zeit pro Workout (min)</span>
          <input name="max_minutes_per_workout" className="input" inputMode="numeric" defaultValue={p?.max_minutes_per_workout ?? ""} />
        </label>
        <label className="block">
          <span className="label">Gymzugang</span>
          <select name="gym_access" className="input" defaultValue={p?.gym_access == null ? "" : p.gym_access ? "ja" : "nein"}>
            <option value="">–</option>
            <option value="ja">ja</option>
            <option value="nein">nein</option>
          </select>
        </label>
      </div>
      <label className="block">
        <span className="label">Equipment zu Hause</span>
        <textarea name="equipment_home" className="input min-h-16" defaultValue={p?.equipment_home ?? ""} />
      </label>
      <label className="block">
        <span className="label">Notizen</span>
        <textarea name="notes" className="input min-h-20" defaultValue={p?.notes ?? ""} />
      </label>
      <label className="block">
        <span className="label">Aktivitätsniveau (PAL-Faktor)</span>
        <select name="pal_factor" className="input" defaultValue={String(pal)}>
          {!palValues.includes(pal) && <option value={String(pal)}>{String(pal).replace(".", ",")}</option>}
          {PAL_OPTIONS.map((o) => (
            <option key={o.value} value={String(o.value)}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <fieldset className="space-y-2">
        <legend className="label">Nährstoffziele pro Tag (setzt der Coach)</legend>
        <div className="grid grid-cols-3 gap-3">
          {(
            [
              ["protein_g", "Protein (g)", p?.protein_g],
              ["fat_g", "Fett (g)", p?.fat_g],
              ["carbs_g", "Kohlenhydrate (g)", p?.carbs_g],
            ] as const
          ).map(([name, label, value]) => (
            <label key={name} className="block">
              <span className="text-xs text-slate-600">{label}</span>
              <input name={name} className="input" inputMode="numeric" defaultValue={value ?? ""} disabled={!isCoach} />
            </label>
          ))}
        </div>
      </fieldset>
      {state.ok && <p className="text-sm text-green-700">{state.ok}</p>}
      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
      <button className="btn-primary" disabled={pending}>
        {pending ? "Speichere …" : "Speichern"}
      </button>
    </form>
  );
}
