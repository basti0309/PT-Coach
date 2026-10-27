// Datumslogik für Pläne: Datum einer Einheit = startDate + (week − 1)·7 + (day − 1).
import { addDays, daysBetween } from "@/lib/format";
import type { PlanContent, PlanDay, PlanSession } from "./schema";

export interface ScheduledSession {
  session: PlanSession;
  week: number;
  day: number;
  date: string;
  /** Reihenfolge im Plan (für "früheste offene Einheit") */
  order: number;
  dayTitle?: string;
}

export function sessionDate(startDate: string, week: number, day: number): string {
  return addDays(startDate, (week - 1) * 7 + (day - 1));
}

/** Alle Einheiten mit Datum, chronologisch (bei gleichem Tag in Plan-Reihenfolge). */
export function listScheduledSessions(plan: PlanContent): ScheduledSession[] {
  const out: ScheduledSession[] = [];
  let order = 0;
  const weeks = [...plan.weeks].sort((a, b) => a.week - b.week);
  for (const w of weeks) {
    const days = [...w.days].sort((a, b) => a.day - b.day);
    for (const d of days) {
      for (const s of d.sessions) {
        out.push({ session: s, week: w.week, day: d.day, date: sessionDate(plan.startDate, w.week, d.day), order: order++, dayTitle: d.title });
      }
    }
  }
  return out;
}

/** Planwoche (1, 2, …), in die ein Datum fällt; null vor Planbeginn. */
export function planWeekOf(plan: PlanContent, date: string): number | null {
  const diff = daysBetween(plan.startDate, date);
  if (diff < 0) return null;
  return Math.floor(diff / 7) + 1;
}

export function findSession(plan: PlanContent, sessionId: string): ScheduledSession | undefined {
  return listScheduledSessions(plan).find((s) => s.session.id === sessionId);
}

/** Tag des Plans an einem Datum (mit Titel/Hinweis, auch Ruhetage) oder undefined. */
export function findDay(plan: PlanContent, date: string): PlanDay | undefined {
  const diff = daysBetween(plan.startDate, date);
  if (diff < 0) return undefined;
  const week = Math.floor(diff / 7) + 1;
  const day = (diff % 7) + 1;
  return plan.weeks.find((w) => w.week === week)?.days.find((d) => d.day === day);
}
