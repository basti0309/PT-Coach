// Kurzbeschreibungen von Einheiten für die Anzeige.
import { SPORT_LABELS } from "@/lib/calc/sport";
import { describeScoring } from "@/lib/calc/blocks";
import { formatNumber } from "@/lib/format";
import { WOD_TYPE_LABELS, type PlanSession, type StrengthExercise, type WodMovement } from "./schema";

export function sessionTitle(s: PlanSession): string {
  if (s.type === "strength") return s.title;
  if (s.type === "wod") return `WOD: ${s.name}`;
  if (s.type === "program") return s.title;
  return SPORT_LABELS[s.sport];
}

export function describeExercise(e: StrengthExercise): string {
  const weight = e.targetWeightKg != null ? ` @ ${formatNumber(e.targetWeightKg)} kg` : "";
  return `${e.name} ${e.sets} × ${e.reps}${weight} · Pause ${e.restSeconds} s`;
}

export function describeMovement(m: WodMovement): string {
  const parts: string[] = [];
  if (m.reps) parts.push(String(m.reps));
  if (m.distanceM) parts.push(`${formatNumber(m.distanceM)} m`);
  if (m.calories) parts.push(`${m.calories} kcal`);
  parts.push(m.name);
  if (m.weightKg) parts.push(`(${formatNumber(m.weightKg)} kg)`);
  return parts.join(" ");
}

export function sessionDetails(s: PlanSession): string[] {
  if (s.type === "strength") return s.exercises.map(describeExercise);
  if (s.type === "wod") {
    const head = [WOD_TYPE_LABELS[s.wodType]];
    if (s.durationMinutes) head.push(`${formatNumber(s.durationMinutes)} min`);
    if (s.rounds) head.push(`${s.rounds} Runden`);
    if (s.timeCapMinutes) head.push(`Time Cap ${formatNumber(s.timeCapMinutes)} min`);
    return [head.join(" · "), ...s.movements.map(describeMovement)];
  }
  if (s.type === "program") return s.blocks.map((b) => `${b.label ? `${b.label}: ` : ""}${b.name} · ${describeScoring(b.scoring)}`);
  const parts: string[] = [];
  if (s.durationMinutes) parts.push(`${formatNumber(s.durationMinutes)} min`);
  if (s.distanceKm) parts.push(`${formatNumber(s.distanceKm, 2)} km`);
  parts.push(s.intensity);
  return [parts.join(" · "), ...(s.description ? [s.description] : [])];
}
