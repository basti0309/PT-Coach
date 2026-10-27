import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { StravaActivityRow, TestResultRow, WorkoutLogRow } from "@/lib/db-types";
import type { EnduranceEntry } from "@/lib/calc/aggregate";
import type { StrengthSetRecord } from "@/lib/calc/volume";
import { pickReference, predictions, RIEGEL_EXPONENT, type ReferenceCandidate } from "@/lib/calc/riegel";
import { formatDate, formatDuration, formatKm, formatNumber } from "@/lib/format";
import { EnduranceChart } from "./endurance-chart";
import { StrengthChart } from "./strength-chart";

/**
 * Fortschritt. viewerIsClient = true: zusätzlich km und Strava-basierte Prognosen.
 * Strava-Werte kommen ohnehin nur für den Kunden selbst aus der Datenbank (RLS).
 */
export async function ProgressSection({ clientId, viewerIsClient }: { clientId: string; viewerIsClient: boolean }) {
  const supabase = await createSupabaseServerClient();
  const [{ data: logs }, { data: sets }, { data: tests }, { data: strava }] = await Promise.all([
    supabase
      .from("workout_logs")
      .select("id, kind, performed_on, sport, duration_seconds, distance_m, is_test, source, completed, title")
      .eq("client_id", clientId)
      .eq("completed", true)
      .order("performed_on"),
    supabase
      .from("set_logs")
      .select("workout_log_id, performed_on, exercise_id, exercise_name, weight_kg, reps, done")
      .eq("client_id", clientId)
      .eq("done", true)
      .order("performed_on")
      .limit(5000),
    supabase.from("test_results").select("*").eq("client_id", clientId).eq("kind", "run_5k"),
    viewerIsClient
      ? supabase.from("strava_activities").select("*").eq("client_id", clientId)
      : Promise.resolve({ data: [] as StravaActivityRow[] }),
  ]);

  const stravaByLog = new Map(((strava ?? []) as StravaActivityRow[]).map((a) => [a.workout_log_id, a]));
  const workouts = (logs ?? []) as Pick<WorkoutLogRow, "id" | "kind" | "performed_on" | "sport" | "duration_seconds" | "distance_m" | "is_test" | "source" | "title">[];

  const endurance: EnduranceEntry[] = workouts
    .filter((l) => l.kind === "endurance")
    .map((l) => ({
      date: l.performed_on,
      sport: l.sport,
      durationSeconds: l.duration_seconds,
      distanceM: viewerIsClient ? (l.distance_m ?? stravaByLog.get(l.id)?.distance_m ?? null) : null,
    }));

  const records: StrengthSetRecord[] = (sets ?? []).map((s) => ({
    workoutLogId: s.workout_log_id,
    performedOn: s.performed_on,
    exerciseId: s.exercise_id,
    weightKg: s.weight_kg,
    reps: s.reps,
    done: s.done,
  }));
  const exerciseNames = new Map<string, string>();
  for (const s of sets ?? []) exerciseNames.set(s.exercise_id, s.exercise_name || s.exercise_id);
  const exercises = [...exerciseNames].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, "de"));

  // Prognose-Grundlagen: jüngster 5-km-Test, als Test/Wettkampf markierte Läufe (manuell; Strava nur für den Kunden).
  const candidates: ReferenceCandidate[] = [
    ...((tests ?? []) as TestResultRow[])
      .filter((t) => t.value)
      .map((t) => ({ date: t.tested_on, distanceM: 5000, timeSeconds: t.value!, source: "test" as const, label: "5-km-Testzeit" })),
    ...workouts
      .filter((l) => l.kind === "endurance" && l.source === "manual" && l.is_test && l.sport === "laufen" && l.distance_m && l.duration_seconds)
      .map((l) => ({
        date: l.performed_on,
        distanceM: l.distance_m!,
        timeSeconds: l.duration_seconds!,
        source: "manuell" as const,
        label: `Test/Wettkampf (eingetragen): ${l.title || "Lauf"}`,
      })),
    ...((strava ?? []) as StravaActivityRow[])
      .filter((a) => a.is_test && a.sport === "laufen" && a.distance_m)
      .map((a) => ({
        date: a.start_date_local,
        distanceM: a.distance_m!,
        timeSeconds: a.moving_time_seconds,
        source: "strava" as const,
        label: "Test/Wettkampf (Strava)",
      })),
  ];
  const ref = pickReference(candidates);
  const preds = ref ? predictions(ref) : [];

  return (
    <div className="space-y-4">
      <section className="card space-y-2">
        <h2 className="h2">Ausdauer</h2>
        {!viewerIsClient && <p className="muted">Als Coach siehst du nur die Trainingszeit (keine Strava-Distanzen).</p>}
        <EnduranceChart entries={endurance} showKm={viewerIsClient} />
      </section>

      <section className="card space-y-2">
        <h2 className="h2">Kraft</h2>
        <StrengthChart records={records} exercises={exercises} />
      </section>

      <section className="card space-y-2">
        <h2 className="h2">Zeitprognosen (Laufen)</h2>
        {!ref ? (
          <p className="muted">
            Noch keine Grundlage: trage eine 5-km-Testzeit ein oder markiere einen Lauf mit Distanz als „Test/Wettkampf“.
          </p>
        ) : (
          <>
            <p className="text-sm">
              Referenz: <strong>{ref.label}</strong> vom {formatDate(ref.date)} – {formatKm(ref.distanceM)} in {formatDuration(ref.timeSeconds)}
            </p>
            <p className="muted">
              Formel nach Riegel: T2 = T1 · (D2 / D1)^{formatNumber(RIEGEL_EXPONENT, 2)}
            </p>
            <table className="w-full text-sm">
              <tbody>
                {preds.map((p) => (
                  <tr key={p.key} className="border-t border-slate-100">
                    <td className="py-1.5">{p.label}</td>
                    <td className="py-1.5 font-mono font-semibold">{formatDuration(p.seconds)}</td>
                    <td className="py-1.5 text-xs text-slate-500">
                      {formatDuration(p.seconds / (p.meters / 1000))} min/km{p.uncertain && " · unsicherer"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-amber-700">
              Hinweis: Je länger die Zieldistanz im Vergleich zur Referenz, desto unsicherer die Prognose – besonders Halbmarathon und
              Marathon setzen entsprechendes Ausdauertraining voraus.
            </p>
          </>
        )}
      </section>
    </div>
  );
}
