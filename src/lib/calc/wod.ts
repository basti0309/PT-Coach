// WOD-Wiedererkennung über wodId oder normalisierte Bewegungsliste.
import type { WodSession, WodType } from "@/lib/plan/schema";
import { formatDuration } from "@/lib/format";

/** "Klimmzüge (Band)!" → "klimmzuege band"; "Pull-Ups" → "pull ups" */
export function normalizeMovementName(name: string): string {
  return name
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Schlüssel aus Typ und Bewegungen (Reihenfolge zählt) mit Wdh./Distanz/Kalorien.
 * Gewichte gehören nicht dazu – sie werden als "verwendete Gewichte" angezeigt.
 */
export function wodMovementsKey(wod: Pick<WodSession, "wodType" | "movements">): string {
  const parts = wod.movements.map((m) =>
    [normalizeMovementName(m.name), m.reps ?? "", m.distanceM ?? "", m.calories ?? ""].join(":"),
  );
  return `${wod.wodType}|${parts.join("|")}`;
}

export interface WodLogLike {
  id: string;
  performed_on: string;
  created_at: string;
  completed: boolean;
  wod_id: string | null;
  wod_movements_key: string | null;
  wod_result: { timeSeconds?: number; rounds?: number; reps?: number } | null;
  wod_weights: string;
}

/** Letztes Ergebnis desselben WODs (gleiche wodId ODER gleicher Bewegungsschlüssel). */
export function findLastWodResult<T extends WodLogLike>(
  wod: Pick<WodSession, "wodId" | "wodType" | "movements">,
  logs: T[],
  excludeLogId?: string,
): T | null {
  const key = wodMovementsKey(wod);
  const matches = logs.filter(
    (l) =>
      l.completed &&
      l.id !== excludeLogId &&
      l.wod_result &&
      ((wod.wodId && l.wod_id === wod.wodId) || l.wod_movements_key === key),
  );
  if (matches.length === 0) return null;
  return matches.reduce((best, l) =>
    l.performed_on > best.performed_on || (l.performed_on === best.performed_on && l.created_at > best.created_at) ? l : best,
  );
}

/** Für For Time / RFT zählt die Zeit, für AMRAP / EMOM Runden + Wdh. */
export function wodResultKind(type: WodType): "time" | "rounds" {
  return type === "for_time" || type === "rft" ? "time" : "rounds";
}

export function formatWodResult(result: WodLogLike["wod_result"]): string {
  if (!result) return "–";
  if (result.timeSeconds != null) return `Zeit ${formatDuration(result.timeSeconds)}`;
  const rounds = result.rounds ?? 0;
  const reps = result.reps ?? 0;
  return reps ? `${rounds} Runden + ${reps} Wdh.` : `${rounds} Runden`;
}
