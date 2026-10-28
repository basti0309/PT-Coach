"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCoach } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { validatePlan } from "@/lib/plan/validate";
import type { PlanContent } from "@/lib/plan/schema";
import { appToday } from "@/lib/today";

export type SaveResult = { ok: true; version: number } | { ok: false; errors: string[] };

function revalidateClient(clientId: string) {
  revalidatePath(`/coach/kunden/${clientId}`, "layout");
  revalidatePath("/kunde", "layout");
}

export async function createPlan(clientId: string, formData: FormData) {
  await requireCoach();
  const title = String(formData.get("title") ?? "").trim() || "Neuer Plan";
  const startDate = String(formData.get("startDate") ?? "") || appToday();
  const content: PlanContent = { schemaVersion: 1, title, startDate, weeks: [{ week: 1, days: [] }] };
  const check = validatePlan(content);
  if (!check.ok) throw new Error(check.errors.join("\n"));

  const supabase = await createSupabaseServerClient();
  await supabase.from("plans").update({ is_active: false }).eq("client_id", clientId).eq("is_active", true);
  const { data: plan, error } = await supabase
    .from("plans")
    .insert({ client_id: clientId, title, is_active: true })
    .select("id")
    .single();
  if (error || !plan) throw new Error(`Plan konnte nicht angelegt werden: ${error?.message}`);
  const { error: vErr } = await supabase.rpc("save_plan_version", {
    p_plan_id: plan.id,
    p_content: check.plan,
    p_note: "Plan angelegt",
    p_source: "editor",
  });
  if (vErr) throw new Error(vErr.message);
  revalidateClient(clientId);
  redirect(`/coach/kunden/${clientId}/plan/${plan.id}/bearbeiten`);
}

/** Neuer Plan aus einer KI-Antwort (Upload): wird angelegt, aktiv gesetzt und als Version 1 gespeichert. */
export async function createPlanFromImport(clientId: string, content: unknown, note: string): Promise<SaveResult & { planId?: string }> {
  await requireCoach();
  const check = validatePlan(content);
  if (!check.ok) return check;
  const supabase = await createSupabaseServerClient();
  await supabase.from("plans").update({ is_active: false }).eq("client_id", clientId).eq("is_active", true);
  const { data: plan, error } = await supabase
    .from("plans")
    .insert({ client_id: clientId, title: check.plan.title, is_active: true })
    .select("id")
    .single();
  if (error || !plan) return { ok: false, errors: [`Plan konnte nicht angelegt werden: ${error?.message}`] };
  const { data, error: vErr } = await supabase.rpc("save_plan_version", {
    p_plan_id: plan.id,
    p_content: check.plan,
    p_note: (note || "Neuer Plan (KI)").slice(0, 500),
    p_source: "import",
  });
  if (vErr) return { ok: false, errors: [`Speichern fehlgeschlagen: ${vErr.message}`] };
  revalidateClient(clientId);
  return { ok: true, version: data as number, planId: plan.id };
}

/** Speichert einen Plan als neue Version (Editor, Import oder Wiederherstellung). */
export async function savePlanVersion(
  clientId: string,
  planId: string,
  content: unknown,
  note: string,
  source: "editor" | "import" | "restore",
): Promise<SaveResult> {
  await requireCoach();
  const check = validatePlan(content);
  if (!check.ok) return check;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("save_plan_version", {
    p_plan_id: planId,
    p_content: check.plan,
    p_note: note.slice(0, 500),
    p_source: source,
  });
  if (error) return { ok: false, errors: [`Speichern fehlgeschlagen: ${error.message}`] };
  revalidateClient(clientId);
  return { ok: true, version: data as number };
}

export async function restorePlanVersion(clientId: string, planId: string, version: number) {
  await requireCoach();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("plan_versions")
    .select("content")
    .eq("plan_id", planId)
    .eq("version", version)
    .single();
  if (!data) throw new Error("Version nicht gefunden.");
  const result = await savePlanVersion(clientId, planId, data.content, `Wiederhergestellt aus Version ${version}`, "restore");
  if (!result.ok) throw new Error(result.errors.join("\n"));
  redirect(`/coach/kunden/${clientId}/plan/${planId}/versionen`);
}

export async function activatePlan(clientId: string, planId: string) {
  await requireCoach();
  const supabase = await createSupabaseServerClient();
  await supabase.from("plans").update({ is_active: false }).eq("client_id", clientId).eq("is_active", true);
  await supabase.from("plans").update({ is_active: true }).eq("id", planId);
  revalidateClient(clientId);
}

export async function saveEditorVersion(clientId: string, planId: string, content: unknown, note: string) {
  return savePlanVersion(clientId, planId, content, note, "editor");
}

export async function saveImportedVersion(clientId: string, planId: string, content: unknown, note: string) {
  return savePlanVersion(clientId, planId, content, note, "import");
}
