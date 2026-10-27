// Automatische Zuordnung einer Strava-Aktivität zu einer geplanten Ausdauereinheit.
import { listScheduledSessions, planWeekOf, type ScheduledSession } from "@/lib/plan/dates";
import type { EnduranceSession, PlanContent } from "@/lib/plan/schema";
import { plannedTargets } from "./deviation";
import type { Sport } from "./sport";

export interface MatchResult {
  sessionId: string;
  week: number;
  date: string;
  rule: "gleicher-tag" | "gleiche-woche";
  planned: { durationSeconds: number | null; distanceM: number | null };
  session: EnduranceSession;
}

/**
 * Regeln (in dieser Reihenfolge):
 * 1. offene Einheit gleicher Sportart am gleichen Tag
 * 2. sonst die früheste offene Einheit gleicher Sportart in derselben Planwoche
 * 3. sonst kein Treffer → "ungeplante Einheit"
 * "Offen" = für die Einheit gibt es noch keinen Eintrag. Kategorie "sonstiges" wird nie zugeordnet.
 */
export function matchActivity(
  activity: { sport: Sport; date: string },
  plan: PlanContent | null,
  takenSessionIds: ReadonlySet<string>,
): MatchResult | null {
  if (!plan || activity.sport === "sonstiges") return null;
  const week = planWeekOf(plan, activity.date);
  if (week == null) return null;

  const candidates = listScheduledSessions(plan).filter(
    (s): s is ScheduledSession & { session: EnduranceSession } =>
      s.session.type === "endurance" && s.session.sport === activity.sport && !takenSessionIds.has(s.session.id),
  );

  const sameDay = candidates.find((s) => s.date === activity.date);
  const sameWeek = candidates.filter((s) => s.week === week).sort((a, b) => a.order - b.order)[0];
  const hit = sameDay ?? sameWeek;
  if (!hit) return null;
  return {
    sessionId: hit.session.id,
    week: hit.week,
    date: hit.date,
    rule: sameDay ? "gleicher-tag" : "gleiche-woche",
    planned: plannedTargets(hit.session),
    session: hit.session,
  };
}
