import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ClientProfileRow, ProfileRow, TestResultRow } from "@/lib/db-types";
import { buildProfileExport, type ProfileExport } from "@/lib/export/profile";
import { extractTemplate } from "@/lib/export/prompt";
import { appToday } from "@/lib/today";

export interface ProfileData {
  profile: ProfileRow;
  clientProfile: ClientProfileRow | null;
  tests: TestResultRow[];
}

export async function loadProfileData(supabase: SupabaseClient, clientId: string): Promise<ProfileData | null> {
  const [{ data: profile }, { data: cp }, { data: tests }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", clientId).maybeSingle(),
    supabase.from("client_profiles").select("*").eq("client_id", clientId).maybeSingle(),
    supabase.from("test_results").select("*").eq("client_id", clientId).order("tested_on", { ascending: false }),
  ]);
  if (!profile) return null;
  return {
    profile: profile as ProfileRow,
    clientProfile: (cp as ClientProfileRow) ?? null,
    tests: (tests ?? []) as TestResultRow[],
  };
}

export async function loadProfileExport(
  supabase: SupabaseClient,
  clientId: string,
  pseudonymized: boolean,
): Promise<ProfileExport | null> {
  const data = await loadProfileData(supabase, clientId);
  return data ? buildProfileExport(data.profile, data.clientProfile, data.tests, pseudonymized, appToday()) : null;
}

export function loadPromptTemplate(): string {
  try {
    return extractTemplate(readFileSync(path.join(process.cwd(), "docs", "ki-prompt-vorlage.md"), "utf8"));
  } catch {
    return "Ändere den Plan gemäß Aufgabe und gib nur gültiges JSON nach dem Schema zurück.\n\nAufgabe: {{AUFGABE}}\n\nSchema:\n{{SCHEMA}}\n\nDatei:\n{{EXPORT}}";
  }
}
