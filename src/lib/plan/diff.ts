// Zeilenweiser Vergleich zweier Pläne (für die Diff-Ansicht vor dem Import).
import { listScheduledSessions } from "./dates";
import type { PlanContent } from "./schema";

export type DiffLine = { type: "same" | "add" | "del"; text: string };

/** Klassischer LCS-Zeilendiff. */
export function lineDiff(oldText: string, newText: string): DiffLine[] {
  const a = oldText.split("\n");
  const b = newText.split("\n");
  const n = a.length;
  const m = b.length;
  const lcs: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      out.push({ type: "same", text: a[i] });
      i++;
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      out.push({ type: "del", text: a[i++] });
    } else {
      out.push({ type: "add", text: b[j++] });
    }
  }
  while (i < n) out.push({ type: "del", text: a[i++] });
  while (j < m) out.push({ type: "add", text: b[j++] });
  return out;
}

export function planToText(plan: PlanContent | null): string {
  return plan ? JSON.stringify(plan, null, 2) : "";
}

export interface PlanChangeSummary {
  added: string[];
  removed: string[];
  changed: string[];
  metaChanged: boolean;
}

/** Zusammenfassung auf Ebene der Einheiten (per ID). */
export function summarizePlanChanges(oldPlan: PlanContent | null, newPlan: PlanContent): PlanChangeSummary {
  const oldSessions = new Map(oldPlan ? listScheduledSessions(oldPlan).map((s) => [s.session.id, s]) : []);
  const newSessions = new Map(listScheduledSessions(newPlan).map((s) => [s.session.id, s]));
  const label = (s: { week: number; day: number; session: { id: string } }) => `Woche ${s.week}, Tag ${s.day}: ${s.session.id}`;
  const added: string[] = [];
  const removed: string[] = [];
  const changed: string[] = [];
  for (const [id, s] of newSessions) {
    const prev = oldSessions.get(id);
    if (!prev) added.push(label(s));
    else if (JSON.stringify(prev.session) !== JSON.stringify(s.session) || prev.week !== s.week || prev.day !== s.day)
      changed.push(label(s));
  }
  for (const [id, s] of oldSessions) if (!newSessions.has(id)) removed.push(label(s));
  const meta = (p: PlanContent | null) =>
    p ? JSON.stringify({ t: p.title, s: p.startDate, g: p.goal, n: p.notes, f: p.weeks.map((w) => [w.week, w.focus]) }) : "";
  return { added, removed, changed, metaChanged: meta(oldPlan) !== meta(newPlan) };
}
