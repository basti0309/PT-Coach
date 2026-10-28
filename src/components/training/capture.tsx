import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loadPlanWithVersion } from "@/lib/data/plans";
import { loadLastWod, loadLogBySession, loadPrefill, loadSets } from "@/lib/data/training";
import { findSession } from "@/lib/plan/dates";
import { sessionDetails, sessionTitle } from "@/lib/plan/describe";
import { planDeviation, plannedTargets } from "@/lib/calc/deviation";
import { wodMovementsKey } from "@/lib/calc/wod";
import { formatDate, formatDuration } from "@/lib/format";
import { appToday } from "@/lib/today";
import type { StravaActivityRow } from "@/lib/db-types";
import type { WorkoutRef } from "@/lib/actions/training";
import { StrengthLogger } from "./strength-logger";
import { WodLogger } from "./wod-logger";
import { EnduranceForm } from "./endurance-form";
import { DeviationView } from "./deviation-view";

/** Erfassung einer geplanten Einheit – gemeinsam für Kunde und Coach. */
export async function CaptureSession({
  clientId,
  planId,
  sessionId,
  backHref,
}: {
  clientId: string;
  planId: string;
  sessionId: string;
  backHref: string;
}) {
  const supabase = await createSupabaseServerClient();
  const data = await loadPlanWithVersion(supabase, planId);
  if (!data || data.plan.client_id !== clientId) notFound();
  const item = findSession(data.version.content, sessionId);
  if (!item) notFound();
  const s = item.session;
  const log = await loadLogBySession(supabase, clientId, planId, sessionId);
  const today = appToday();

  const ref: WorkoutRef = {
    clientId,
    planId,
    planVersion: data.version.version,
    sessionId,
    kind: s.type,
    date: log?.performed_on ?? today,
    title: sessionTitle(s),
    wodId: s.type === "wod" ? (s.wodId ?? null) : null,
    wodMovementsKey: s.type === "wod" ? wodMovementsKey(s) : null,
  };

  let body: React.ReactNode = null;
  if (s.type === "strength") {
    const [sets, prefill] = await Promise.all([log ? loadSets(supabase, log.id) : [], loadPrefill(supabase, clientId, s, log?.id ?? null)]);
    body = (
      <StrengthLogger
        session={s}
        workoutRef={ref}
        existingLogId={log?.id ?? null}
        existingSets={sets.map((x) => ({ exerciseId: x.exercise_id, setNo: x.set_no, weightKg: x.weight_kg, reps: x.reps, done: x.done }))}
        existingCompleted={log?.completed ?? false}
        existingNotes={log?.notes ?? ""}
        existingRpe={log?.session_rpe ?? null}
        existingMinutes={log?.duration_seconds ? Math.round(log.duration_seconds / 60) : null}
        prefill={prefill}
      />
    );
  } else if (s.type === "wod") {
    const last = await loadLastWod(supabase, clientId, s, log?.id ?? null);
    body = (
      <WodLogger
        session={s}
        workoutRef={ref}
        existing={
          log
            ? {
                result: log.wod_result,
                weights: log.wod_weights,
                notes: log.notes,
                completed: log.completed,
                sessionRpe: log.session_rpe,
                durationSeconds: log.duration_seconds,
              }
            : null
        }
        last={last ? { date: last.performed_on, result: last.wod_result, weights: last.wod_weights } : null}
      />
    );
  } else {
    const targets = plannedTargets(s);
    if (log?.source === "strava") {
      // Strava-Details sieht nur der Kunde selbst (RLS liefert dem Coach keine Zeile).
      const { data: act } = await supabase.from("strava_activities").select("*").eq("workout_log_id", log.id).maybeSingle();
      const a = act as StravaActivityRow | null;
      body = (
        <section className="card space-y-2">
          <p>
            <span className="badge bg-orange-100 text-orange-800">Strava</span>{" "}
            <span className="badge bg-green-600 text-white">✓ erledigt</span>
          </p>
          <p>
            {formatDate(log.performed_on)} · Dauer {formatDuration(log.duration_seconds ?? 0)}
          </p>
          {a ? (
            <DeviationView
              deviation={planDeviation(
                { durationSeconds: a.planned_duration_seconds, distanceM: a.planned_distance_m },
                { durationSeconds: a.moving_time_seconds, distanceM: a.distance_m },
              )}
            />
          ) : (
            <p className="muted">Weitere Strava-Werte sieht nur der Kunde.</p>
          )}
        </section>
      );
    } else {
      body = (
        <div className="space-y-3">
          {log && (
            <section className="card space-y-2">
              <h3 className="h2">Abweichung zum Plan</h3>
              <DeviationView
                deviation={planDeviation(targets, { durationSeconds: log.duration_seconds, distanceM: log.distance_m })}
              />
            </section>
          )}
          <EnduranceForm
            clientId={clientId}
            logId={log?.id ?? null}
            planId={planId}
            planVersion={data.version.version}
            sessionId={sessionId}
            defaultDate={log?.performed_on ?? today}
            defaultSport={s.sport}
            sportFixed
            title={sessionTitle(s)}
            initial={
              log
                ? {
                    durationSeconds: log.duration_seconds,
                    distanceM: log.distance_m,
                    avgHr: log.avg_hr,
                    isTest: log.is_test,
                    notes: log.notes,
                    sessionRpe: log.session_rpe,
                  }
                : undefined
            }
          />
        </div>
      );
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <Link href={backHref} className="text-sm text-brand-700">
          ← zurück
        </Link>
        <h1 className="h1">{sessionTitle(s)}</h1>
        <p className="muted">
          Geplant: {formatDate(item.date)} (Woche {item.week}, Tag {item.day})
          {log?.completed && " · ✓ erledigt"}
        </p>
        {s.type !== "strength" && (
          <ul className="mt-1 text-sm text-slate-600">
            {sessionDetails(s).map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        )}
        {s.type === "wod" && s.notes && <p className="text-sm italic text-slate-500">{s.notes}</p>}
      </div>
      {body}
    </div>
  );
}
