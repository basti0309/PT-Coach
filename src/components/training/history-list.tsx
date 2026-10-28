import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loadHistory } from "@/lib/data/training";
import { authorLabel, loadNames } from "@/lib/data/names";
import { deleteWorkoutLog } from "@/lib/actions/training";
import { SPORT_LABELS, type Sport } from "@/lib/calc/sport";
import { formatWodResult } from "@/lib/calc/wod";
import { planDeviation } from "@/lib/calc/deviation";
import { formatDate, formatDuration, formatKm, formatNumber } from "@/lib/format";
import { DeviationView } from "./deviation-view";
import { StravaTestToggle } from "./strava-test-toggle";

const KIND = { strength: "Kraft", wod: "WOD", endurance: "Ausdauer" } as const;

export async function HistoryList({ clientId, base }: { clientId: string; base: string }) {
  const supabase = await createSupabaseServerClient();
  const entries = await loadHistory(supabase, clientId);
  const names = await loadNames(
    supabase,
    entries.flatMap((e) => [e.log.created_by, e.log.updated_by]),
  );
  if (entries.length === 0) return <p className="muted">Noch keine Trainings eingetragen.</p>;

  return (
    <ul className="space-y-3">
      {entries.map(({ log, sets, strava }) => {
        const doneSets = sets.filter((s) => s.done);
        const href =
          log.plan_id && log.session_id
            ? `${base}/erfassen?plan=${log.plan_id}&einheit=${encodeURIComponent(log.session_id)}`
            : log.kind === "endurance" && log.source === "manual"
              ? `${base}/ausdauer?log=${log.id}`
              : null;
        return (
          <li key={log.id} className="card space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-slate-500">{formatDate(log.performed_on)}</span>
              <span className="badge bg-slate-100 text-slate-700">{KIND[log.kind]}</span>
              {log.source === "strava" && <span className="badge bg-orange-100 text-orange-800">Strava</span>}
              {!log.session_id && <span className="badge bg-violet-100 text-violet-800">ungeplant</span>}
              {log.completed ? (
                <span className="badge bg-green-600 text-white">✓ erledigt</span>
              ) : (
                <span className="badge bg-slate-200 text-slate-700">begonnen</span>
              )}
              {(log.is_test || strava?.is_test) && <span className="badge bg-blue-100 text-blue-800">Test/Wettkampf</span>}
            </div>
            <p className="font-semibold">{log.title || (log.sport ? SPORT_LABELS[log.sport as Sport] : KIND[log.kind])}</p>

            {log.kind === "strength" && (
              <p className="text-sm text-slate-600">
                {doneSets.length} Sätze ·{" "}
                {[...new Set(doneSets.map((s) => s.exercise_name || s.exercise_id))].join(", ") || "–"}
              </p>
            )}
            {log.kind === "wod" && (
              <p className="text-sm text-slate-600">
                {formatWodResult(log.wod_result)}
                {log.wod_weights && ` · ${log.wod_weights}`}
              </p>
            )}
            {log.kind === "endurance" && (
              <p className="text-sm text-slate-600">
                {log.sport && `${SPORT_LABELS[log.sport as Sport]} · `}
                {log.duration_seconds != null && `Dauer ${formatDuration(log.duration_seconds)}`}
                {log.distance_m != null && ` · ${formatKm(log.distance_m)}`}
                {log.avg_hr != null && ` · Ø ${log.avg_hr} bpm`}
                {strava?.distance_m != null && ` · ${formatKm(strava.distance_m)}`}
                {strava?.avg_hr != null && ` · Ø ${formatNumber(strava.avg_hr, 0)} bpm`}
              </p>
            )}
            {strava && strava.matched && (
              <DeviationView
                deviation={planDeviation(
                  { durationSeconds: strava.planned_duration_seconds, distanceM: strava.planned_distance_m },
                  { durationSeconds: strava.moving_time_seconds, distanceM: strava.distance_m },
                )}
              />
            )}
            {strava && strava.sport === "laufen" && <StravaTestToggle activityId={strava.id} initial={strava.is_test} />}
            {log.session_rpe != null && (
              <p className="text-sm text-slate-600">
                Session-RPE {log.session_rpe}/10
                {log.duration_seconds != null &&
                  ` · Last ${formatNumber(Math.round(log.duration_seconds / 60) * log.session_rpe, 0)} (RPE × ${Math.round(log.duration_seconds / 60)} min)`}
              </p>
            )}
            {log.notes && <p className="text-sm italic text-slate-500">{log.notes}</p>}
            <p className="text-xs text-slate-400">
              erfasst von {authorLabel(names, log.created_by)}
              {log.updated_by && log.updated_by !== log.created_by && ` · zuletzt geändert von ${authorLabel(names, log.updated_by)}`}
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {href && (
                <Link href={href} className="btn-secondary btn-small">
                  Öffnen
                </Link>
              )}
              {log.source === "manual" && (
                <form action={deleteWorkoutLog.bind(null, clientId, log.id)}>
                  <button className="btn-danger btn-small">Löschen</button>
                </form>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
