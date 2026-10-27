"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireCoach } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { INVITE_CODE_KEY } from "@/lib/accounts/invite";

export interface InviteState {
  ok?: string;
  error?: string;
}

// Ohne leicht verwechselbare Zeichen (0/O, 1/I/L).
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export async function saveInviteCode(_prev: InviteState, formData: FormData): Promise<InviteState> {
  await requireCoach();
  const intent = formData.get("intent");
  const supabase = await createSupabaseServerClient();
  if (intent === "close") {
    await supabase.from("app_settings").delete().eq("key", INVITE_CODE_KEY);
    revalidatePath("/coach/einrichtung");
    return { ok: "Selbstregistrierung geschlossen." };
  }
  let code = String(formData.get("code") ?? "").trim().toUpperCase();
  if (intent === "generate") code = Array.from({ length: 10 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
  if (!/^[A-Z0-9-]{6,40}$/.test(code)) return { error: "Code: mindestens 6 Zeichen, nur Buchstaben, Ziffern und „-“." };
  const { error } = await supabase.from("app_settings").upsert({ key: INVITE_CODE_KEY, value: code });
  if (error) return { error: error.message };
  revalidatePath("/coach/einrichtung");
  return { ok: `Einladungscode gespeichert: ${code}` };
}
