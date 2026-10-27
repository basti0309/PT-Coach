import { redirectSameHost } from "@/lib/redirect";
import type { NextRequest } from "next/server";
import { getViewer } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { exchangeCode } from "@/lib/strava/api";
import { stravaConfig } from "@/lib/strava/config";

const back = (request: NextRequest, status: string) => {
  const res = redirectSameHost(request, `/kunde/profil?strava=${status}`);
  res.cookies.delete({ name: "strava_oauth_state", path: "/api/strava" });
  return res;
};

export async function GET(request: NextRequest) {
  const viewer = await getViewer();
  if (!viewer || viewer.role !== "client") return redirectSameHost(request, "/login");
  const params = request.nextUrl.searchParams;
  const state = request.cookies.get("strava_oauth_state")?.value;
  if (!state || params.get("state") !== state) return back(request, "fehler");
  if (params.get("error")) return back(request, "abgelehnt");
  const code = params.get("code");
  const scope = params.get("scope") ?? "";
  if (!code) return back(request, "fehler");
  if (!scope.split(",").includes("activity:read_all")) return back(request, "berechtigung");

  try {
    const token = await exchangeCode(stravaConfig(), code);
    if (!token.athlete) return back(request, "fehler");
    const admin = createSupabaseAdminClient();
    const { data: other } = await admin
      .from("strava_connections")
      .select("client_id")
      .eq("athlete_id", token.athlete.id)
      .maybeSingle();
    if (other && other.client_id !== viewer.userId) return back(request, "vergeben");
    const { error } = await admin.from("strava_connections").upsert(
      {
        client_id: viewer.userId,
        athlete_id: token.athlete.id,
        access_token: token.access_token,
        refresh_token: token.refresh_token,
        expires_at: new Date(token.expires_at * 1000).toISOString(),
        scope,
        connected_at: new Date().toISOString(),
      },
      { onConflict: "client_id" },
    );
    if (error) return back(request, "fehler");
  } catch {
    return back(request, "fehler");
  }
  return back(request, "verbunden");
}
