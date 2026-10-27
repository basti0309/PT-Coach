// Ausdauer je Woche (ISO, Montag–Sonntag) oder Monat, optional je Sportart.
import { addDays, parseIsoDate } from "@/lib/format";

export interface EnduranceEntry {
  date: string;
  sport: string | null;
  durationSeconds: number | null;
  distanceM: number | null;
}

export interface Bucket {
  key: string;
  label: string;
  minutes: number;
  km: number;
}

/** Montag der ISO-Woche */
export function weekStart(iso: string): string {
  const day = parseIsoDate(iso).getUTCDay(); // 0 = So
  return addDays(iso, -((day + 6) % 7));
}

/** ISO-Kalenderwoche (Jahr der Woche, Nummer) */
export function isoWeek(iso: string): { year: number; week: number } {
  const thursday = addDays(weekStart(iso), 3);
  const d = parseIsoDate(thursday);
  const year = d.getUTCFullYear();
  const jan1 = Date.UTC(year, 0, 1);
  return { year, week: Math.floor((d.getTime() - jan1) / (7 * 86_400_000)) + 1 };
}

export function aggregateEndurance(entries: EnduranceEntry[], period: "week" | "month", sport: string | "alle" = "alle"): Bucket[] {
  const map = new Map<string, Bucket>();
  for (const e of entries) {
    if (sport !== "alle" && e.sport !== sport) continue;
    let key: string;
    let label: string;
    if (period === "week") {
      key = weekStart(e.date);
      const w = isoWeek(e.date);
      label = `KW ${w.week}/${String(w.year).slice(2)}`;
    } else {
      key = e.date.slice(0, 7);
      label = `${key.slice(5, 7)}/${key.slice(2, 4)}`;
    }
    const b = map.get(key) ?? { key, label, minutes: 0, km: 0 };
    b.minutes += (e.durationSeconds ?? 0) / 60;
    b.km += (e.distanceM ?? 0) / 1000;
    map.set(key, b);
  }
  return [...map.values()]
    .map((b) => ({ ...b, minutes: Math.round(b.minutes * 10) / 10, km: Math.round(b.km * 100) / 100 }))
    .sort((a, b) => a.key.localeCompare(b.key));
}
