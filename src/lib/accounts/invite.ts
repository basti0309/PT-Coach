import "server-only";
import { timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { suggestShortCode } from "@/lib/format";

export const INVITE_CODE_KEY = "invite_code";

/** Einladungscode aus app_settings (null = Selbstregistrierung aus). */
export async function loadInviteCode(admin: SupabaseClient): Promise<string | null> {
  const { data } = await admin.from("app_settings").select("value").eq("key", INVITE_CODE_KEY).maybeSingle();
  const code = typeof data?.value === "string" ? data.value : null;
  return code && code.length >= 6 ? code : null;
}

/** Vergleich ohne Zeitunterschiede; Groß/Kleinschreibung und Leerzeichen egal. */
export function inviteCodeMatches(expected: string, given: string): boolean {
  const a = Buffer.from(expected.trim().toUpperCase());
  const b = Buffer.from(given.trim().toUpperCase());
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Freies Kürzel aus dem Namen: "AB", sonst "AB2", "AB3", … */
export async function freeShortCode(admin: SupabaseClient, fullName: string): Promise<string> {
  const base = suggestShortCode(fullName);
  const { data } = await admin.from("profiles").select("short_code").ilike("short_code", `${base}%`);
  const taken = new Set((data ?? []).map((p) => (p.short_code as string).toUpperCase()));
  if (!taken.has(base)) return base;
  for (let i = 2; ; i++) if (!taken.has(`${base}${i}`)) return `${base}${i}`;
}
