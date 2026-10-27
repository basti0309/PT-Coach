import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type Role = "coach" | "client";

export interface Viewer {
  userId: string;
  email: string;
  role: Role;
  fullName: string;
}

/** Angemeldeter Nutzer samt Rolle (aus `profiles`, durch RLS geschützt). */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) return null;
  return {
    userId: user.id,
    email: user.email ?? "",
    role: profile.role as Role,
    fullName: profile.full_name as string,
  };
});

export async function requireViewer(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect("/kein-zugang");
  return viewer;
}

export async function requireCoach(): Promise<Viewer> {
  const viewer = await requireViewer();
  if (viewer.role !== "coach") redirect("/kunde");
  return viewer;
}

export async function requireClient(): Promise<Viewer> {
  const viewer = await requireViewer();
  if (viewer.role !== "client") redirect("/coach");
  return viewer;
}

/**
 * Für Server Actions, die für einen bestimmten Kunden schreiben:
 * erlaubt dem Kunden selbst und dem Coach. (Die Datenbank prüft zusätzlich per RLS.)
 */
export async function requireClientAccess(clientId: string): Promise<Viewer> {
  const viewer = await requireViewer();
  if (viewer.role === "coach" || viewer.userId === clientId) return viewer;
  throw new Error("Keine Berechtigung für diesen Kunden.");
}
