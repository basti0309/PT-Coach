"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireCoach } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const entry = z.object({
  kind: z.enum(["wissen", "faq"]),
  title: z.string().trim().min(1).max(200),
  content: z.string().trim().min(1).max(10000),
});

export async function saveKnowledgeEntry(id: string | null, formData: FormData): Promise<void> {
  await requireCoach();
  const values = entry.parse({ kind: formData.get("kind"), title: formData.get("title"), content: formData.get("content") });
  const supabase = await createSupabaseServerClient();
  const { error } = id
    ? await supabase.from("knowledge_entries").update(values).eq("id", z.uuid().parse(id))
    : await supabase.from("knowledge_entries").insert(values);
  if (error) throw new Error(error.message);
  revalidatePath("/coach/wissen");
}

export async function deleteKnowledgeEntry(id: string): Promise<void> {
  await requireCoach();
  const supabase = await createSupabaseServerClient();
  await supabase.from("knowledge_entries").delete().eq("id", z.uuid().parse(id));
  revalidatePath("/coach/wissen");
}
