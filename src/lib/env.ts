// Zentrale, lazy gelesene Umgebungsvariablen. Nie auf Modulebene lesen,
// damit `next build` ohne gesetzte Variablen funktioniert.

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Umgebungsvariable ${name} fehlt (siehe README_SETUP.md).`);
  }
  return value;
}

export const env = {
  supabaseUrl: () => required("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: () => required("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  supabaseServiceRoleKey: () => required("SUPABASE_SERVICE_ROLE_KEY"),
  siteUrl: () => required("NEXT_PUBLIC_SITE_URL").replace(/\/$/, ""),
  coachEmail: () => (process.env.COACH_EMAIL ?? "").trim().toLowerCase(),
  timeZone: () => process.env.APP_TIMEZONE || "Europe/Berlin",
  /** Strava ist optional: ohne Client-ID/-Secret blendet die App die Verbindung aus. */
  stravaEnabled: () => Boolean(process.env.STRAVA_CLIENT_ID && process.env.STRAVA_CLIENT_SECRET),
  stravaClientId: () => required("STRAVA_CLIENT_ID"),
  stravaClientSecret: () => required("STRAVA_CLIENT_SECRET"),
  stravaVerifyToken: () => required("STRAVA_WEBHOOK_VERIFY_TOKEN"),
  stravaApiBase: () => (process.env.STRAVA_API_BASE || "https://www.strava.com/api/v3").replace(/\/$/, ""),
  stravaAuthorizeUrl: () => process.env.STRAVA_AUTHORIZE_URL || "https://www.strava.com/oauth/authorize",
  anthropicApiKey: () => process.env.ANTHROPIC_API_KEY ?? "",
  anthropicModel: () => process.env.ANTHROPIC_MODEL || "claude-opus-5-5",
};

/** Für die Statusseite: welche Variablen sind gesetzt (ohne Werte preiszugeben). */
export const ENV_VARIABLES = [
  { name: "NEXT_PUBLIC_SUPABASE_URL", required: true },
  { name: "NEXT_PUBLIC_SUPABASE_ANON_KEY", required: true },
  { name: "SUPABASE_SERVICE_ROLE_KEY", required: true },
  { name: "NEXT_PUBLIC_SITE_URL", required: true },
  { name: "COACH_EMAIL", required: true },
  { name: "ANTHROPIC_API_KEY", required: true },
  { name: "ANTHROPIC_MODEL", required: false },
  { name: "STRAVA_CLIENT_ID", required: false },
  { name: "STRAVA_CLIENT_SECRET", required: false },
  { name: "STRAVA_WEBHOOK_VERIFY_TOKEN", required: false },
  { name: "STRAVA_API_BASE", required: false },
  { name: "STRAVA_AUTHORIZE_URL", required: false },
  { name: "APP_TIMEZONE", required: false },
] as const;
