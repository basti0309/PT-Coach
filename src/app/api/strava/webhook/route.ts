import { after, NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { verifyWebhookChallenge } from "@/lib/strava/api";
import { createWebhookDeps } from "@/lib/strava/repo";
import { handleStravaEvent, WebhookEventSchema } from "@/lib/strava/webhook";

// Validierung durch Strava beim Anlegen des Abos.
export async function GET(request: NextRequest) {
  const answer = verifyWebhookChallenge(request.nextUrl.searchParams, process.env.STRAVA_WEBHOOK_VERIFY_TOKEN ?? "");
  if (!answer) return NextResponse.json({ error: "verify_token ungültig" }, { status: 403 });
  return NextResponse.json(answer);
}

// Ereignisse: sofort 200 antworten (Strava erwartet Antwort < 2 s), Verarbeitung danach.
export async function POST(request: NextRequest) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "kein JSON" }, { status: 400 });
  }
  const parsed = WebhookEventSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ ok: true, ignored: true });

  after(async () => {
    try {
      // Vorab prüfen, ob Strava überhaupt konfiguriert ist.
      env.stravaClientId();
      const outcome = await handleStravaEvent(parsed.data, createWebhookDeps());
      console.info("Strava-Webhook", parsed.data.object_type, parsed.data.aspect_type, outcome);
    } catch (e) {
      console.error("Strava-Webhook fehlgeschlagen", e);
    }
  });
  return NextResponse.json({ ok: true });
}
