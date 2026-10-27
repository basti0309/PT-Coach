// Teil-Antworten einer KI (z. B. Wochen 1–4 und 5–8) zu einem Plan zusammenführen.
import type { PlanContent } from "./schema";
import { validatePlan, type ValidationResult } from "./validate";

/**
 * Titel und Startdatum müssen in allen Teilen gleich sein; Wochen werden zusammengelegt
 * und nach Nummer sortiert. Ziel/Notizen kommen aus dem ersten Teil, der sie enthält.
 * Doppelte Wochen oder Einheiten-IDs meldet die anschließende Validierung.
 */
export function mergePlanParts(parts: PlanContent[]): ValidationResult {
  if (parts.length === 0) return { ok: false, errors: ["Es wurde noch kein Teil hinzugefügt."] };
  const [first] = parts;
  const errors: string[] = [];
  parts.forEach((p, i) => {
    if (p.title !== first.title) errors.push(`Teil ${i + 1}: Titel „${p.title}“ weicht von Teil 1 („${first.title}“) ab.`);
    if (p.startDate !== first.startDate)
      errors.push(`Teil ${i + 1}: Startdatum ${p.startDate} weicht von Teil 1 (${first.startDate}) ab.`);
  });
  if (errors.length) return { ok: false, errors };
  const merged: PlanContent = {
    ...first,
    goal: parts.find((p) => p.goal)?.goal,
    notes: parts.find((p) => p.notes)?.notes,
    weeks: parts.flatMap((p) => p.weeks).sort((a, b) => a.week - b.week),
  };
  if (merged.goal === undefined) delete merged.goal;
  if (merged.notes === undefined) delete merged.notes;
  return validatePlan(merged);
}
