// Vorbefüllung: Werte vom letzten Mal derselben Übung (gleiche Übungs-ID).

export interface PastSet {
  workoutLogId: string;
  performedOn: string;
  createdAt: string;
  setNo: number;
  weightKg: number | null;
  reps: number | null;
  done: boolean;
}

export interface Placeholder {
  weightKg: number | null;
  reps: number | null;
}

/**
 * Nimmt die jüngste frühere Einheit (Datum, dann Erfassungszeit), in der die Übung
 * mindestens einen abgehakten Satz hat. Satz n bekommt die Werte von Satz n;
 * hatte die letzte Einheit weniger Sätze, gilt der letzte vorhandene Satz.
 * Ohne Historie: null je Satz.
 */
export function prefillFromHistory(history: PastSet[], targetSets: number, excludeLogId?: string): (Placeholder | null)[] {
  const relevant = history.filter((s) => s.done && s.workoutLogId !== excludeLogId && (s.weightKg != null || s.reps != null));
  if (relevant.length === 0) return Array.from({ length: targetSets }, () => null);

  const latest = relevant.reduce((best, s) =>
    s.performedOn > best.performedOn || (s.performedOn === best.performedOn && s.createdAt > best.createdAt) ? s : best,
  );
  const sets = relevant.filter((s) => s.workoutLogId === latest.workoutLogId).sort((a, b) => a.setNo - b.setNo);

  return Array.from({ length: targetSets }, (_, i) => {
    const match = sets.find((s) => s.setNo === i + 1) ?? sets[sets.length - 1];
    return { weightKg: match.weightKg, reps: match.reps };
  });
}
