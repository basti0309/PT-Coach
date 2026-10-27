"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireClient } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Nur der Kunde selbst; die Datenbank erlaubt hier ausschließlich die Spalte is_test. */
export async function setStravaTestFlag(activityId: string, value: boolean): Promise<void> {
  await requireClient();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("strava_activities")
    .update({ is_test: value })
    .eq("id", z.uuid().parse(activityId));
  if (error) throw new Error(error.message);
  revalidatePath("/kunde", "layout");
}
