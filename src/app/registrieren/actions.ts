"use server";

import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { freeShortCode, inviteCodeMatches, loadInviteCode } from "@/lib/accounts/invite";
import { env } from "@/lib/env";
import { allowFromThisIp, TOO_MANY } from "@/lib/accounts/rate-limit";

export interface RegisterState {
  done?: boolean;
  email?: string;
  error?: string;
}

const schema = z.object({
  fullName: z.string().trim().min(2, "Bitte deinen Namen eingeben.").max(120),
  email: z.email("Bitte eine gültige E-Mail-Adresse eingeben."),
  code: z.string().trim().min(1, "Bitte den Einladungscode eingeben.").max(100),
});

/** Selbstregistrierung mit Einladungscode: legt ein Kundenkonto an und schickt den Anmelde-Code. */
export async function registerWithInvite(_prev: RegisterState, formData: FormData): Promise<RegisterState> {
  const parsed = schema.safeParse({
    fullName: formData.get("fullName"),
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    code: formData.get("code"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const { fullName, email, code } = parsed.data;
  if (!(await allowFromThisIp("registrieren", 10, 60 * 60))) return { error: TOO_MANY };

  const admin = createSupabaseAdminClient();
  const expected = await loadInviteCode(admin);
  if (!expected) return { error: "Die Registrierung ist zurzeit geschlossen. Bitte wende dich an deinen Coach." };
  if (!inviteCodeMatches(expected, code)) return { error: "Der Einladungscode stimmt nicht." };
  if (email === env.coachEmail()) return { error: "Diese Adresse ist für den Coach reserviert – bitte direkt anmelden." };

  const { data: existing } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
  if (existing) return { error: "Zu dieser Adresse gibt es schon ein Konto – bitte einfach anmelden." };

  const created = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (!created.data.user) return { error: "Das Konto konnte nicht angelegt werden. Bitte später erneut versuchen." };
  const id = created.data.user.id;
  const { error } = await admin
    .from("profiles")
    .insert({ id, role: "client", full_name: fullName, short_code: await freeShortCode(admin, fullName), email });
  if (error) {
    await admin.auth.admin.deleteUser(id);
    return { error: "Das Konto konnte nicht angelegt werden. Bitte später erneut versuchen." };
  }
  await admin.from("client_profiles").insert({ client_id: id });

  const supabase = await createSupabaseServerClient();
  await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false, emailRedirectTo: `${env.siteUrl()}/auth/callback` },
  });
  return { done: true, email };
}
