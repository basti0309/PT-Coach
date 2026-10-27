import "server-only";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ProfileRow } from "@/lib/db-types";

/** Kundenprofil-Basis laden; 404, wenn per RLS nicht sichtbar. */
export async function loadClient(clientId: string): Promise<ProfileRow> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("profiles").select("*").eq("id", clientId).eq("role", "client").maybeSingle();
  if (!data) notFound();
  return data as ProfileRow;
}
