import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ClientHealthRow, ClientProfileRow, HealthConsentRow, ProfileRow, QuestionnaireRow, TestResultRow } from "@/lib/db-types";
import type { RpeSession } from "@/lib/calc/session-load";
import { buildProfileExport, type ProfileExport, type ProfileExtras } from "@/lib/export/profile";
import { addDays } from "@/lib/format";
import { extractTemplate } from "@/lib/export/prompt";
import { appToday } from "@/lib/today";

export interface ProfileData {
  profile: ProfileRow;
  clientProfile: ClientProfileRow | null;
  tests: TestResultRow[];
  questionnaire: QuestionnaireRow | null;
  consent: HealthConsentRow | null;
  /** nur mit aktiver Einwilligung (RLS) */
  health: ClientHealthRow | null;
  rpeSessions: RpeSession[];
}

export async function loadProfileData(supabase: SupabaseClient, clientId: string): Promise<ProfileData | null> {
  const since = addDays(appToday(), -35);
  const [{ data: profile }, { data: cp }, { data: tests }, { data: q }, { data: consent }, { data: health }, { data: rpe }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", clientId).maybeSingle(),
    supabase.from("client_profiles").select("*").eq("client_id", clientId).maybeSingle(),
    supabase.from("test_results").select("*").eq("client_id", clientId).order("tested_on", { ascending: false }),
    supabase.from("client_questionnaires").select("*").eq("client_id", clientId).maybeSingle(),
    supabase.from("health_consents").select("*").eq("client_id", clientId).is("withdrawn_at", null).maybeSingle(),
    supabase.from("client_health").select("*").eq("client_id", clientId).maybeSingle(),
    supabase
      .from("workout_logs")
      .select("performed_on, duration_seconds, session_rpe")
      .eq("client_id", clientId)
      .eq("source", "manual")
      .eq("completed", true)
      .not("session_rpe", "is", null)
      .not("duration_seconds", "is", null)
      .gte("performed_on", since),
  ]);
  if (!profile) return null;
  return {
    profile: profile as ProfileRow,
    clientProfile: (cp as ClientProfileRow) ?? null,
    tests: (tests ?? []) as TestResultRow[],
    questionnaire: (q as QuestionnaireRow) ?? null,
    consent: (consent as HealthConsentRow) ?? null,
    health: consent ? ((health as ClientHealthRow) ?? null) : null,
    rpeSessions: (rpe ?? []).map((r) => ({ date: r.performed_on, durationMinutes: r.duration_seconds / 60, rpe: r.session_rpe })),
  };
}

export function extrasOf(data: ProfileData, forChat = false): ProfileExtras {
  return { questionnaire: data.questionnaire, health: data.health, hasConsent: data.consent != null, rpeSessions: data.rpeSessions, forChat };
}

export async function loadProfileExport(
  supabase: SupabaseClient,
  clientId: string,
  pseudonymized: boolean,
): Promise<ProfileExport | null> {
  const data = await loadProfileData(supabase, clientId);
  return data ? buildProfileExport(data.profile, data.clientProfile, data.tests, pseudonymized, appToday(), extrasOf(data)) : null;
}

export function loadPromptTemplate(): string {
  try {
    return extractTemplate(readFileSync(path.join(process.cwd(), "docs", "ki-prompt-vorlage.md"), "utf8"));
  } catch {
    return "Ändere den Plan gemäß Aufgabe und gib nur gültiges JSON nach dem Schema zurück.\n\nAufgabe: {{AUFGABE}}\n\nSchema:\n{{SCHEMA}}\n\nDatei:\n{{EXPORT}}";
  }
}

export function loadNewPlanPromptTemplate(): string {
  try {
    return extractTemplate(readFileSync(path.join(process.cwd(), "docs", "ki-prompt-neuer-plan.md"), "utf8"));
  } catch {
    return "Erstelle einen Trainingsplan nach der Beschreibung und gib nur gültiges JSON nach dem Schema zurück.\n\nBeschreibung: {{BESCHREIBUNG}}\n\nSchema:\n{{SCHEMA}}\n\nVorlage:\n{{VORLAGE}}";
  }
}
