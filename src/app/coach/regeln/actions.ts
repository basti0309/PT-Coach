"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireCoach } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Pflichtregeln (locked) schützt zusätzlich ein Datenbank-Trigger.

export async function addRule(formData: FormData): Promise<void> {
  await requireCoach();
  const rule = z.string().trim().min(3).max(500).parse(formData.get("rule"));
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("escalation_rules").insert({ rule, active: true, locked: false, sort: 100 });
  if (error) throw new Error(error.message);
  revalidatePath("/coach/regeln");
}

export async function updateRule(id: string, formData: FormData): Promise<void> {
  await requireCoach();
  const rule = z.string().trim().min(3).max(500).parse(formData.get("rule"));
  const active = formData.get("active") === "on";
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("escalation_rules").update({ rule, active }).eq("id", z.uuid().parse(id)).eq("locked", false);
  if (error) throw new Error(error.message);
  revalidatePath("/coach/regeln");
}

export async function deleteRule(id: string): Promise<void> {
  await requireCoach();
  const supabase = await createSupabaseServerClient();
  await supabase.from("escalation_rules").delete().eq("id", z.uuid().parse(id)).eq("locked", false);
  revalidatePath("/coach/regeln");
}
