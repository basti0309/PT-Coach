import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

/**
 * Supabase-Client mit der Sitzung des angemeldeten Nutzers.
 * Alle Abfragen laufen unter Row Level Security – Normalfall für Datenzugriffe.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(env.supabaseUrl(), env.supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // In Server Components nicht setzbar – die Sitzung erneuert proxy.ts.
        }
      },
    },
  });
}
