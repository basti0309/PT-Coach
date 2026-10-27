"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureCoachAccount, isKnownEmail } from "@/lib/accounts/coach";
import { env } from "@/lib/env";

export interface LoginState {
  step: "email" | "code";
  email: string;
  message?: string;
  error?: string;
}

const emailSchema = z.email();

async function requestLogin(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!emailSchema.safeParse(email).success) {
    return { step: "email", email, error: "Bitte eine gültige E-Mail-Adresse eingeben." };
  }
  try {
    await ensureCoachAccount(email);
    if (await isKnownEmail(email)) {
      const supabase = await createSupabaseServerClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false, emailRedirectTo: `${env.siteUrl()}/auth/callback` },
      });
      if (error) {
        return { step: "email", email, error: `Versand fehlgeschlagen: ${error.message}` };
      }
    }
  } catch (e) {
    return { step: "email", email, error: e instanceof Error ? e.message : "Unbekannter Fehler" };
  }
  // Gleiche Antwort für unbekannte Adressen (keine Auskunft, wer Kunde ist).
  return {
    step: "code",
    email,
    message:
      "Wenn diese Adresse freigeschaltet ist, haben wir dir eine E-Mail geschickt. Tippe auf den Link oder gib den Code aus der E-Mail hier ein.",
  };
}

export async function loginAction(prev: LoginState, formData: FormData): Promise<LoginState> {
  return formData.get("intent") === "code" ? verifyCode(prev, formData) : requestLogin(prev, formData);
}

async function verifyCode(prev: LoginState, formData: FormData): Promise<LoginState> {
  const token = String(formData.get("code") ?? "").replace(/\s/g, "");
  if (!/^\d{6,10}$/.test(token)) {
    return { ...prev, error: "Bitte den Zahlencode aus der E-Mail eingeben." };
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({ email: prev.email, token, type: "email" });
  if (error) {
    return { ...prev, error: "Der Code ist ungültig oder abgelaufen. Fordere einen neuen an." };
  }
  redirect("/");
}
