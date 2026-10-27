import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const TOO_MANY = "Zu viele Versuche. Bitte warte ein paar Minuten und versuche es dann erneut.";

/** IP des Aufrufers (Vercel setzt x-forwarded-for), nur gehasht gespeichert. */
async function clientIpHash(): Promise<string> {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "unbekannt";
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

/**
 * Drosselt Login/Registrierung je IP-Adresse (Zählung in der Datenbank, damit es
 * auch auf mehreren Server-Instanzen gilt). true = erlaubt.
 */
export async function allowFromThisIp(action: string, max: number, windowSeconds: number): Promise<boolean> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("hit_rate_limit", {
    p_key: `${action}:${await clientIpHash()}`,
    p_max: max,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    console.error("Drosselung nicht verfügbar", error.message);
    return true; // im Zweifel nicht aussperren
  }
  return data === true;
}
