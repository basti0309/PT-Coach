// Trainingslast nach der Session-RPE-Methode: Foster et al. (2001), J Strength Cond Res 15(1):109–115
// („multiplying the duration of the exercise bout by the session RPE“), Monotonie und Strain nach
// Foster (1998), Med Sci Sports Exerc 30(7):1164–1168 („monotony (daily mean/standard deviation), and strain (load * monotony)“).
import { addDays, daysBetween } from "@/lib/format";

/** CR-10-Skala in der Fassung von Foster et al. 2001 (Beschriftung laut Wiedergabe bei Haddad et al. 2017, Front Neurosci). */
export const CR10_LABELS: Record<number, string> = {
  0: "Ruhe",
  1: "sehr, sehr leicht",
  2: "leicht",
  3: "mittel",
  4: "etwas schwer",
  5: "schwer",
  6: "",
  7: "sehr schwer",
  8: "",
  9: "",
  10: "maximal",
};

export interface RpeSession {
  date: string;
  durationMinutes: number;
  rpe: number;
}

export const sessionLoad = (s: RpeSession) => s.durationMinutes * s.rpe;

export interface WeekLoad {
  /** Montag der Woche */
  weekStart: string;
  load: number;
  sessions: number;
  /** Tagesmittel / Standardabweichung der 7 Tageslasten; null bei SD = 0 */
  monotony: number | null;
  strain: number | null;
}

/** Montag (ISO-Woche) zu einem Datum */
export function mondayOf(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = So
  return addDays(date, -((dow + 6) % 7));
}

/** Wochenlast, Monotonie und Strain. Tage ohne Einheit zählen mit Last 0. SD = Populations-Standardabweichung (Festlegung). */
export function weeklyLoads(sessions: RpeSession[]): WeekLoad[] {
  const byWeek = new Map<string, number[]>();
  const counts = new Map<string, number>();
  for (const s of sessions) {
    const w = mondayOf(s.date);
    const days = byWeek.get(w) ?? [0, 0, 0, 0, 0, 0, 0];
    days[daysBetween(w, s.date)] += sessionLoad(s);
    byWeek.set(w, days);
    counts.set(w, (counts.get(w) ?? 0) + 1);
  }
  return [...byWeek.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekStart, days]) => {
      const load = days.reduce((a, b) => a + b, 0);
      const mean = load / 7;
      const sd = Math.sqrt(days.reduce((a, d) => a + (d - mean) ** 2, 0) / 7);
      const monotony = sd > 0 ? mean / sd : null;
      return { weekStart, load, sessions: counts.get(weekStart) ?? 0, monotony, strain: monotony == null ? null : load * monotony };
    });
}
