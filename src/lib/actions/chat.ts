"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireClient, requireCoach } from "@/lib/auth";
import { env } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createClaudeClassifier } from "@/lib/chat/claude";
import { loadPrefilterContext } from "@/lib/chat/context";
import { ESCALATION_INFO, runPrefilter } from "@/lib/chat/prefilter";

const body = z.string().trim().min(1, "Leere Nachricht").max(4000, "Nachricht zu lang (max. 4000 Zeichen)");
const MAX_PER_HOUR = 30;

export interface SendResult {
  ok: boolean;
  error?: string;
}

/**
 * Kundennachricht: wird serverseitig gespeichert und sofort durch den KI-Vorfilter geschickt.
 * Ergebnis: KI-Antwort (als solche gekennzeichnet) ODER Weiterleitung in den Coach-Posteingang.
 */
export async function sendClientMessage(text: string): Promise<SendResult> {
  const viewer = await requireClient();
  const parsed = body.safeParse(text);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const admin = createSupabaseAdminClient();

  const since = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await admin
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("client_id", viewer.userId)
    .eq("sender", "client")
    .gte("created_at", since);
  if ((count ?? 0) >= MAX_PER_HOUR) return { ok: false, error: "Zu viele Nachrichten in kurzer Zeit. Bitte etwas später erneut versuchen." };

  const { data: msg, error } = await admin
    .from("messages")
    .insert({ client_id: viewer.userId, sender: "client", author_id: viewer.userId, body: parsed.data })
    .select("id")
    .single();
  if (error || !msg) return { ok: false, error: "Nachricht konnte nicht gespeichert werden." };

  const ctx = await loadPrefilterContext(admin, viewer.userId);
  const decision = await runPrefilter(parsed.data, ctx, createClaudeClassifier(env.anthropicApiKey(), env.anthropicModel()));

  await admin
    .from("messages")
    .update({ ai_action: decision.action, ai_reason: decision.reason, needs_coach: decision.action === "escalate" })
    .eq("id", msg.id);
  await admin.from("messages").insert(
    decision.action === "answer"
      ? { client_id: viewer.userId, sender: "ai", body: decision.answer, ai_action: "answer", ai_reason: decision.reason }
      : { client_id: viewer.userId, sender: "system", body: ESCALATION_INFO },
  );
  revalidatePath("/kunde/chat");
  revalidatePath("/coach", "layout");
  return { ok: true };
}

/** Coach antwortet (läuft über RLS). Offene Posteingangs-Einträge dieses Kunden gelten damit als erledigt. */
export async function sendCoachMessage(clientId: string, text: string): Promise<SendResult> {
  const viewer = await requireCoach();
  const parsed = body.safeParse(text);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("messages")
    .insert({ client_id: z.uuid().parse(clientId), sender: "coach", author_id: viewer.userId, body: parsed.data });
  if (error) return { ok: false, error: error.message };
  await supabase
    .from("messages")
    .update({ resolved_at: new Date().toISOString(), resolved_by: viewer.userId })
    .eq("client_id", clientId)
    .eq("needs_coach", true)
    .is("resolved_at", null);
  revalidatePath("/coach", "layout");
  return { ok: true };
}

export async function resolveMessage(messageId: string): Promise<void> {
  const viewer = await requireCoach();
  const supabase = await createSupabaseServerClient();
  await supabase
    .from("messages")
    .update({ resolved_at: new Date().toISOString(), resolved_by: viewer.userId })
    .eq("id", z.uuid().parse(messageId));
  revalidatePath("/coach", "layout");
}
