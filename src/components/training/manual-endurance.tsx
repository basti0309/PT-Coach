import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { appToday } from "@/lib/today";
import type { WorkoutLogRow } from "@/lib/db-types";
import type { Sport } from "@/lib/calc/sport";
import { EnduranceForm } from "./endurance-form";

/** Ungeplante Ausdauereinheit von Hand eintragen oder bearbeiten. */
export async function ManualEndurance({ clientId, logId, base }: { clientId: string; logId?: string; base: string }) {
  let log: WorkoutLogRow | null = null;
  if (logId) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.from("workout_logs").select("*").eq("id", logId).eq("client_id", clientId).maybeSingle();
    if (!data || data.source !== "manual") notFound();
    log = data as WorkoutLogRow;
    if (log.plan_id && log.session_id) {
      // Geplante Einheiten werden über die Erfassungsseite bearbeitet.
      notFound();
    }
  }
  return (
    <div className="space-y-4">
      <div>
        <Link href={base} className="text-sm text-brand-700">
          ← zurück
        </Link>
        <h1 className="h1">{log ? "Ausdauereinheit bearbeiten" : "Ausdauer eintragen"}</h1>
        <p className="muted">Für Einheiten ohne Plan-Bezug. Geplante Einheiten trägst du direkt im Plan ein.</p>
      </div>
      <EnduranceForm
        clientId={clientId}
        logId={log?.id ?? null}
        planId={null}
        planVersion={null}
        sessionId={null}
        defaultDate={log?.performed_on ?? appToday()}
        defaultSport={(log?.sport as Sport) ?? "laufen"}
        sportFixed={false}
        title=""
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
        doneHref={base}
      />
    </div>
  );
}
