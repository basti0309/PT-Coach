// Formatierung und Eingabe-Parsing (deutsche Schreibweise). Reine Funktionen.

const WEEKDAYS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

/** "2026-10-27" → Date (UTC-Mitternacht, ohne Zeitzonen-Verschiebung). */
export function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  const d = parseIsoDate(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return toIsoDate(d);
}

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((parseIsoDate(toIso).getTime() - parseIsoDate(fromIso).getTime()) / 86_400_000);
}

/** Heutiges Datum in der App-Zeitzone als YYYY-MM-DD. */
export function todayIn(timeZone: string, now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** "2026-10-27" → "Di, 27.10.2026" */
export function formatDate(iso: string, withWeekday = true): string {
  const d = parseIsoDate(iso);
  const s = `${String(d.getUTCDate()).padStart(2, "0")}.${String(d.getUTCMonth() + 1).padStart(2, "0")}.${d.getUTCFullYear()}`;
  return withWeekday ? `${WEEKDAYS[d.getUTCDay()]}, ${s}` : s;
}

export function formatDateTime(isoTimestamp: string, timeZone: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    timeZone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(isoTimestamp));
}

/** Sekunden → "1:05:09" bzw. "25:30" */
export function formatDuration(totalSeconds: number): string {
  const s = Math.round(Math.abs(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const sign = totalSeconds < 0 ? "−" : "";
  return h > 0
    ? `${sign}${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
    : `${sign}${m}:${String(sec).padStart(2, "0")}`;
}

/** "25:30", "1:05:09", "45" (Minuten) → Sekunden; ungültig → null */
export function parseDuration(input: string): number | null {
  const t = input.trim();
  if (!t) return null;
  if (/^\d+([.,]\d+)?$/.test(t)) return Math.round(Number(t.replace(",", ".")) * 60);
  const parts = t.split(":");
  if (parts.length < 2 || parts.length > 3 || parts.some((p) => !/^\d+$/.test(p))) return null;
  const nums = parts.map(Number);
  if (nums.slice(1).some((n) => n >= 60)) return null;
  return nums.length === 3 ? nums[0] * 3600 + nums[1] * 60 + nums[2] : nums[0] * 60 + nums[1];
}

/** Dezimalzahl mit Komma oder Punkt; leer/ungültig → null */
export function parseDecimal(input: string | null | undefined): number | null {
  if (input == null) return null;
  const t = String(input).trim().replace(",", ".");
  if (!t || !/^-?\d+(\.\d+)?$/.test(t)) return null;
  return Number(t);
}

export function formatNumber(value: number, maxFractionDigits = 1): string {
  return new Intl.NumberFormat("de-DE", { maximumFractionDigits: maxFractionDigits }).format(value);
}

export function formatKm(meters: number): string {
  return `${formatNumber(meters / 1000, 2)} km`;
}

/** Vorschlag für ein Kunden-Kürzel aus dem Namen: "Anna Beispiel" → "AB" */
export function suggestShortCode(fullName: string): string {
  const letters = fullName
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0]!.toUpperCase())
    .join("");
  return (letters || "K").replace(/[^A-Z0-9]/g, "").slice(0, 4) || "K";
}
