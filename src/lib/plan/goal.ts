// Das Ziel eines Plans legen Coach oder Kunde im Fragebogen fest – nie die KI.
// Beim Import überschreibt die App deshalb "goal" mit dem Ziel aus dem Fragebogen.
import { GOAL_LABELS, type Goal } from "@/lib/questionnaire/schema";
import type { PlanContent } from "./schema";

export const PLAN_GOAL_MAX = 500;

/** Ziel-Text für den Plan: „<Ziel> – <Freitext>“, gekürzt auf 500 Zeichen; ohne Ziel null. */
export function clientGoalText(goal: Goal | null | undefined, goalNote: string | null | undefined): string | null {
  const note = (goalNote ?? "").trim();
  if (!goal) return note ? note.slice(0, PLAN_GOAL_MAX) : null;
  const text = note ? `${GOAL_LABELS[goal]} – ${note}` : GOAL_LABELS[goal];
  return text.length > PLAN_GOAL_MAX ? `${text.slice(0, PLAN_GOAL_MAX - 1)}…` : text;
}

/** Ersetzt "goal" im Plan durch das Ziel des Kunden; ohne Ziel wird "goal" entfernt. */
export function applyClientGoal(plan: PlanContent, goal: Goal | null | undefined, goalNote: string | null | undefined): PlanContent {
  const text = clientGoalText(goal, goalNote);
  const { goal: _ignored, ...rest } = plan;
  void _ignored;
  return text ? { ...rest, goal: text } : rest;
}
