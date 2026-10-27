import { redirectSameHost } from "@/lib/redirect";
import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getViewer } from "@/lib/auth";
import { env } from "@/lib/env";

const STATE_COOKIE = "strava_oauth_state";

// Startet die Strava-Verbindung (nur für angemeldete Kunden).
export async function GET(request: NextRequest) {
  const viewer = await getViewer();
  if (!viewer || viewer.role !== "client") return redirectSameHost(request, "/login");
  const state = randomBytes(16).toString("hex");
  const url = new URL(env.stravaAuthorizeUrl());
  url.searchParams.set("client_id", env.stravaClientId());
  url.searchParams.set("redirect_uri", `${env.siteUrl()}/api/strava/callback`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("approval_prompt", "auto");
  url.searchParams.set("scope", "activity:read_all");
  url.searchParams.set("state", state);
  const res = NextResponse.redirect(url);
  res.cookies.set(STATE_COOKIE, state, { httpOnly: true, secure: env.siteUrl().startsWith("https:"), sameSite: "lax", maxAge: 600, path: "/api/strava" });
  return res;
}
