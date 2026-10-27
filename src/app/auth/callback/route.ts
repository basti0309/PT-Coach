import { redirectSameHost } from "@/lib/redirect";
import type { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Standard-Link von Supabase (PKCE, ?code=…) – funktioniert im selben Browser.
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return redirectSameHost(request, "/");
  }
  return redirectSameHost(request, "/login?fehler=1");
}
