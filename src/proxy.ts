import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// Optimistische Prüfung: ohne Sitzung zum Login. Die eigentliche
// Rechteprüfung passiert in der Datenbank (RLS) und in src/lib/auth.ts.
export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const path = request.nextUrl.pathname;
  if (!user && (path.startsWith("/kunde") || path.startsWith("/coach"))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|api/strava/webhook|sw.js|manifest.webmanifest|icons/|favicon).*)"],
};
