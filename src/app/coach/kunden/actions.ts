"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireCoach } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export interface CreateClientState {
  error?: string;
}

const schema = z.object({
  fullName: z.string().trim().min(2, "Bitte einen Namen eingeben.").max(120),
  email: z.email("Bitte eine gültige E-Mail-Adresse eingeben.").transform((s) => s.trim().toLowerCase()),
  shortCode: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9_-]{1,16}$/, "Kürzel: 1–16 Zeichen, nur Buchstaben, Ziffern, - oder _."),
});

export async function createClientAccount(_prev: CreateClientState, formData: FormData): Promise<CreateClientState> {
  await requireCoach();
  const parsed = schema.safeParse({
    fullName: formData.get("fullName"),
    email: String(formData.get("email") ?? "").trim(),
    shortCode: formData.get("shortCode"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const { fullName, email, shortCode } = parsed.data;

  const admin = createSupabaseAdminClient();
  const [{ data: emailTaken }, { data: codeTaken }] = await Promise.all([
    admin.from("profiles").select("id").eq("email", email).maybeSingle(),
    admin.from("profiles").select("id").eq("short_code", shortCode).maybeSingle(),
  ]);
  if (emailTaken) return { error: "Diese E-Mail-Adresse ist schon vergeben." };
  if (codeTaken) return { error: "Dieses Kürzel ist schon vergeben." };

  const created = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (!created.data.user) {
    return { error: `Konto konnte nicht angelegt werden: ${created.error?.message ?? "unbekannt"}` };
  }
  const id = created.data.user.id;
  const { error } = await admin.from("profiles").insert({ id, role: "client", full_name: fullName, short_code: shortCode, email });
  if (error) {
    await admin.auth.admin.deleteUser(id);
    return { error: `Profil konnte nicht angelegt werden: ${error.message}` };
  }
  await admin.from("client_profiles").insert({ client_id: id });
  revalidatePath("/coach");
  redirect(`/coach/kunden/${id}`);
}
