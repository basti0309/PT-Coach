import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ClientProfileRow, MessageRow, ProfileRow, QuestionnaireRow, TestResultRow } from "@/lib/db-types";
import { buildProfileExport } from "@/lib/export/profile";
import { appToday } from "@/lib/today";
import type { PrefilterContext } from "./prefilter";

/**
 * Kontext für den KI-Vorfilter. Liest bewusst NUR: Regeln, Wissensbasis, Profil,
 * Testwerte (manuell), Fragebogen, aktuellen Plan, Nachrichten – niemals strava_activities
 * und niemals Gesundheitsangaben (client_health).
 * Das Profil wird pseudonymisiert übergeben (Kürzel statt Name).
 */
export async function loadPrefilterContext(admin: SupabaseClient, clientId: string): Promise<PrefilterContext> {
  const [{ data: rules }, { data: kb }, { data: profile }, { data: cp }, { data: tests }, { data: plan }, { data: msgs }, { data: q }] =
    await Promise.all([
      admin.from("escalation_rules").select("rule").eq("active", true).order("sort"),
      admin.from("knowledge_entries").select("kind, title, content").order("kind").order("title"),
      admin.from("profiles").select("full_name, short_code").eq("id", clientId).single(),
      admin.from("client_profiles").select("*").eq("client_id", clientId).maybeSingle(),
      admin.from("test_results").select("*").eq("client_id", clientId),
      admin.from("plans").select("id, current_version").eq("client_id", clientId).eq("is_active", true).maybeSingle(),
      admin.from("messages").select("sender, body, created_at").eq("client_id", clientId).order("created_at", { ascending: false }).limit(11),
      admin.from("client_questionnaires").select("*").eq("client_id", clientId).maybeSingle(),
    ]);
  let planJson = "";
  if (plan) {
    const { data: v } = await admin.from("plan_versions").select("content").eq("plan_id", plan.id).eq("version", plan.current_version).single();
    planJson = v ? JSON.stringify(v.content) : "";
  }
  const profileExport = profile
    ? buildProfileExport(profile as ProfileRow, (cp as ClientProfileRow) ?? null, (tests ?? []) as TestResultRow[], true, appToday(), {
        // Chat: Fragebogen ja, Gesundheitsangaben und abgeleitete Werte nie (Einwilligungstext)
        questionnaire: (q as QuestionnaireRow) ?? null,
        health: null,
        hasConsent: false,
        rpeSessions: [],
        forChat: true,
      })
    : null;
  const history = ((msgs ?? []) as Pick<MessageRow, "sender" | "body">[])
    .slice(1) // die neue Nachricht selbst ist bereits gespeichert
    .reverse()
    .filter((m) => m.sender !== "system")
    .map((m) => ({ from: m.sender === "client" ? ("Kunde" as const) : m.sender === "coach" ? ("Coach" as const) : ("KI" as const), text: m.body }));
  return {
    rules: (rules ?? []).map((r) => r.rule),
    knowledge: (kb ?? []) as PrefilterContext["knowledge"],
    profileJson: profileExport ? JSON.stringify(profileExport) : "",
    planJson,
    history,
  };
}
