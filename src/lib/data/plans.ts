import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PlanRow, PlanVersionRow, WorkoutLogRow } from "@/lib/db-types";

export interface PlanWithVersion {
  plan: PlanRow;
  version: PlanVersionRow;
}

export async function loadPlanWithVersion(supabase: SupabaseClient, planId: string): Promise<PlanWithVersion | null> {
  const { data: plan } = await supabase.from("plans").select("*").eq("id", planId).maybeSingle();
  if (!plan) return null;
  const { data: version } = await supabase
    .from("plan_versions")
    .select("*")
    .eq("plan_id", planId)
    .eq("version", plan.current_version)
    .maybeSingle();
  if (!version) return null;
  return { plan: plan as PlanRow, version: version as PlanVersionRow };
}

export async function loadActivePlan(supabase: SupabaseClient, clientId: string): Promise<PlanWithVersion | null> {
  const { data: plan } = await supabase
    .from("plans")
    .select("id")
    .eq("client_id", clientId)
    .eq("is_active", true)
    .maybeSingle();
  return plan ? loadPlanWithVersion(supabase, plan.id) : null;
}

export async function loadPlans(supabase: SupabaseClient, clientId: string): Promise<PlanRow[]> {
  const { data } = await supabase
    .from("plans")
    .select("*")
    .eq("client_id", clientId)
    .order("is_active", { ascending: false })
    .order("updated_at", { ascending: false });
  return (data ?? []) as PlanRow[];
}

/** Logs, die Einheiten dieses Plans zugeordnet sind (session_id → Log). */
export async function loadSessionLogs(
  supabase: SupabaseClient,
  clientId: string,
  planId: string,
): Promise<Map<string, WorkoutLogRow>> {
  const { data } = await supabase
    .from("workout_logs")
    .select("*")
    .eq("client_id", clientId)
    .eq("plan_id", planId)
    .not("session_id", "is", null);
  return new Map(((data ?? []) as WorkoutLogRow[]).map((l) => [l.session_id!, l]));
}
