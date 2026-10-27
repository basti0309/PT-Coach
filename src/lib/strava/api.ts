// Strava-API: Basis-URL aus STRAVA_API_BASE, Access Token immer im Authorization-Header.
import { z } from "zod";

export interface StravaConfig {
  apiBase: string;
  clientId: string;
  clientSecret: string;
}

export class StravaAuthError extends Error {}
export class StravaApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export const TokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_at: z.number(),
  athlete: z.object({ id: z.number() }).optional(),
});
export type TokenResponse = z.infer<typeof TokenResponseSchema>;

/** Nur die Felder, die wir speichern dürfen. */
export const ActivitySchema = z.object({
  id: z.number(),
  /** Besitzer der Aktivität – muss zum Absender des Ereignisses passen */
  athlete: z.object({ id: z.number() }),
  sport_type: z.string(),
  start_date: z.string(),
  start_date_local: z.string(),
  moving_time: z.number(),
  distance: z.number().nullable().optional(),
  average_heartrate: z.number().nullable().optional(),
  workout_type: z.number().nullable().optional(),
});
export type StravaActivity = z.infer<typeof ActivitySchema>;

async function tokenRequest(cfg: StravaConfig, params: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(`${cfg.apiBase}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: cfg.clientId, client_secret: cfg.clientSecret, ...params }),
    cache: "no-store",
  });
  if (res.status === 400 || res.status === 401) throw new StravaAuthError(`Strava-Token abgelehnt (${res.status})`);
  if (!res.ok) throw new StravaApiError(`Strava-Token-Anfrage fehlgeschlagen (${res.status})`, res.status);
  return TokenResponseSchema.parse(await res.json());
}

export function exchangeCode(cfg: StravaConfig, code: string) {
  return tokenRequest(cfg, { code, grant_type: "authorization_code" });
}

export function refreshAccessToken(cfg: StravaConfig, refreshToken: string) {
  return tokenRequest(cfg, { refresh_token: refreshToken, grant_type: "refresh_token" });
}

/** Token gilt als abgelaufen, wenn weniger als 60 s Restlaufzeit. */
export function needsRefresh(expiresAt: Date, now: Date = new Date()): boolean {
  return expiresAt.getTime() - now.getTime() < 60_000;
}

async function authorizedGet(cfg: StravaConfig, accessToken: string, path: string): Promise<Response> {
  return fetch(`${cfg.apiBase}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
}

/** Aktivität abrufen; "not_found", wenn gelöscht oder nicht (mehr) sichtbar. */
export async function getActivity(cfg: StravaConfig, accessToken: string, id: number): Promise<StravaActivity | "not_found"> {
  const res = await authorizedGet(cfg, accessToken, `/activities/${id}`);
  if (res.status === 404) return "not_found";
  if (res.status === 401) throw new StravaAuthError("Strava-Zugriff nicht (mehr) erlaubt");
  if (!res.ok) throw new StravaApiError(`Aktivität ${id} nicht abrufbar (${res.status})`, res.status);
  return ActivitySchema.parse(await res.json());
}

/** true, wenn der Token noch Zugriff auf das Athletenkonto hat. */
export async function canAccessAthlete(cfg: StravaConfig, accessToken: string): Promise<boolean> {
  const res = await authorizedGet(cfg, accessToken, "/athlete");
  if (res.status === 401 || res.status === 403) return false;
  if (!res.ok) throw new StravaApiError(`Athlet nicht abrufbar (${res.status})`, res.status);
  return true;
}

// --- Webhook-Abonnement (Strava verlangt hier client_id/secret als Parameter) ---

export const SubscriptionSchema = z.object({ id: z.number(), callback_url: z.string().optional() });
export type Subscription = z.infer<typeof SubscriptionSchema>;

export async function listSubscriptions(cfg: StravaConfig): Promise<Subscription[]> {
  const url = new URL(`${cfg.apiBase}/push_subscriptions`);
  url.searchParams.set("client_id", cfg.clientId);
  url.searchParams.set("client_secret", cfg.clientSecret);
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new StravaApiError(`Abos nicht abrufbar (${res.status}): ${await res.text()}`, res.status);
  return z.array(SubscriptionSchema).parse(await res.json());
}

export async function createSubscription(cfg: StravaConfig, callbackUrl: string, verifyToken: string): Promise<Subscription> {
  const res = await fetch(`${cfg.apiBase}/push_subscriptions`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      callback_url: callbackUrl,
      verify_token: verifyToken,
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new StravaApiError(`Registrierung fehlgeschlagen (${res.status}): ${await res.text()}`, res.status);
  return SubscriptionSchema.parse(await res.json());
}

export async function deleteSubscription(cfg: StravaConfig, id: number): Promise<void> {
  const url = new URL(`${cfg.apiBase}/push_subscriptions/${id}`);
  url.searchParams.set("client_id", cfg.clientId);
  url.searchParams.set("client_secret", cfg.clientSecret);
  const res = await fetch(url, { method: "DELETE", cache: "no-store" });
  if (!res.ok && res.status !== 404) throw new StravaApiError(`Löschen fehlgeschlagen (${res.status}): ${await res.text()}`, res.status);
}

/** Strava-Validierung des Callbacks (GET mit hub.*). Gibt die Antwort oder null (abgelehnt). */
export function verifyWebhookChallenge(params: URLSearchParams, expectedToken: string): { "hub.challenge": string } | null {
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");
  if (mode !== "subscribe" || !challenge || !expectedToken || token !== expectedToken) return null;
  return { "hub.challenge": challenge };
}
