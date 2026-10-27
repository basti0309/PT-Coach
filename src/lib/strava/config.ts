import { env } from "@/lib/env";
import type { StravaConfig } from "./api";

export function stravaConfig(): StravaConfig {
  return { apiBase: env.stravaApiBase(), clientId: env.stravaClientId(), clientSecret: env.stravaClientSecret() };
}

export const STRAVA_SUBSCRIPTION_KEY = "strava_subscription_id";
