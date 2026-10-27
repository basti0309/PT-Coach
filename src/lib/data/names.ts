import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Namen zu Profil-IDs (für "erfasst von"). Liefert nur, was RLS sichtbar macht. */
export async function loadNames(supabase: SupabaseClient, ids: (string | null)[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter((x): x is string => Boolean(x)))];
  const map = new Map<string, string>();
  if (unique.length === 0) return map;
  const { data } = await supabase.from("profiles").select("id, full_name, role").in("id", unique);
  for (const p of data ?? []) map.set(p.id, p.role === "coach" ? `${p.full_name} (Coach)` : p.full_name);
  return map;
}

export function authorLabel(names: Map<string, string>, id: string | null, fallback = "automatisch (Strava)"): string {
  if (!id) return fallback;
  return names.get(id) ?? "unbekannt";
}
