"use server";

import { revalidatePath } from "next/cache";
import { requireCoach } from "@/lib/auth";
import { env } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSubscription, deleteSubscription, listSubscriptions } from "@/lib/strava/api";
import { STRAVA_SUBSCRIPTION_KEY, stravaConfig } from "@/lib/strava/config";

export interface WebhookActionState {
  ok?: string;
  error?: string;
}

export async function registerStravaWebhook(): Promise<WebhookActionState> {
  await requireCoach();
  try {
    const cfg = stravaConfig();
    const callbackUrl = `${env.siteUrl()}/api/strava/webhook`;
    const existing = await listSubscriptions(cfg);
    let id: number;
    const same = existing.find((s) => s.callback_url === callbackUrl);
    if (same) {
      id = same.id;
    } else if (existing.length > 0) {
      return {
        error: `Bei Strava ist bereits ein Abo (ID ${existing[0].id}) für eine andere Adresse (${existing[0].callback_url ?? "unbekannt"}) registriert. Bitte zuerst „Abo löschen“.`,
      };
    } else {
      // Strava ruft dabei sofort GET /api/strava/webhook zur Validierung auf.
      id = (await createSubscription(cfg, callbackUrl, env.stravaVerifyToken())).id;
    }
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("app_settings").upsert({ key: STRAVA_SUBSCRIPTION_KEY, value: id });
    if (error) return { error: `Abo angelegt (ID ${id}), aber nicht gespeichert: ${error.message}` };
    revalidatePath("/coach/einrichtung");
    return { ok: `Webhook registriert (Abo-ID ${id}).` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unbekannter Fehler" };
  }
}

export async function deleteStravaWebhook(): Promise<WebhookActionState> {
  await requireCoach();
  try {
    const cfg = stravaConfig();
    const subs = await listSubscriptions(cfg);
    for (const s of subs) await deleteSubscription(cfg, s.id);
    const supabase = await createSupabaseServerClient();
    await supabase.from("app_settings").delete().eq("key", STRAVA_SUBSCRIPTION_KEY);
    revalidatePath("/coach/einrichtung");
    return { ok: subs.length ? `Abo gelöscht (${subs.map((s) => s.id).join(", ")}).` : "Es war kein Abo registriert." };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unbekannter Fehler" };
  }
}
