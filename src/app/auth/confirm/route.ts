import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Link aus der E-Mail-Vorlage mit token_hash (funktioniert auch in einem anderen Browser).
export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = (request.nextUrl.searchParams.get("type") ?? "email") as EmailOtpType;
  if (tokenHash) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.redirect(new URL("/login?fehler=1", request.url));
}
