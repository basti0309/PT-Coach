import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * Service-Role-Client: umgeht Row Level Security.
 * Nur für Kontoanlage, Strava-Tokens/Webhook und Chat-Nachrichten (KI-Vorfilter).
 * Aufrufer müssen die Berechtigung vorher selbst prüfen.
 */
export function createSupabaseAdminClient() {
  return createClient(env.supabaseUrl(), env.supabaseServiceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
