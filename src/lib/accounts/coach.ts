import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";

/**
 * Legt beim ersten Login-Versuch mit COACH_EMAIL das Coach-Konto an
 * (Auth-Nutzer + Profil mit Rolle coach). Danach ohne Wirkung.
 */
export async function ensureCoachAccount(email: string): Promise<void> {
  const coachEmail = env.coachEmail();
  if (!coachEmail || email !== coachEmail) return;
  const admin = createSupabaseAdminClient();

  const { data: existing } = await admin.from("profiles").select("id, role").eq("email", email).maybeSingle();
  if (existing) {
    if (existing.role !== "coach") {
      await admin.from("profiles").update({ role: "coach" }).eq("id", existing.id);
    }
    return;
  }

  let userId: string | undefined;
  const created = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (created.data.user) {
    userId = created.data.user.id;
  } else {
    // Auth-Nutzer existiert schon (z. B. abgebrochene frühere Anlage) – suchen.
    for (let page = 1; page <= 20 && !userId; page++) {
      const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      userId = data.users.find((u) => u.email?.toLowerCase() === email)?.id;
      if (data.users.length < 200) break;
    }
  }
  if (!userId) throw new Error("Coach-Konto konnte nicht angelegt werden.");

  const { error } = await admin
    .from("profiles")
    .upsert({ id: userId, role: "coach", full_name: "Coach", email }, { onConflict: "id" });
  if (error) throw new Error(`Coach-Profil konnte nicht angelegt werden: ${error.message}`);
}

/** Darf sich diese Adresse anmelden? (Kunde vom Coach angelegt oder Coach-Adresse) */
export async function isKnownEmail(email: string): Promise<boolean> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
  return Boolean(data);
}
