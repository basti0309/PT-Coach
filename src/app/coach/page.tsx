import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function CoachHome() {
  const supabase = await createSupabaseServerClient();
  const [{ count: clientCount }, { count: inboxCount }] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "client"),
    supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("needs_coach", true)
      .is("resolved_at", null),
  ]);
  return (
    <div className="space-y-4">
      <h1 className="h1">Übersicht</h1>
      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/coach/posteingang" className="card hover:border-brand-500">
          <p className="muted">Posteingang (offen)</p>
          <p className="text-3xl font-bold">{inboxCount ?? 0}</p>
        </Link>
        <Link href="/coach/kunden" className="card hover:border-brand-500">
          <p className="muted">Kunden</p>
          <p className="text-3xl font-bold">{clientCount ?? 0}</p>
        </Link>
      </div>
      <div className="card space-y-2">
        <h2 className="h2">Schnellzugriff</h2>
        <div className="flex flex-wrap gap-2">
          <Link href="/coach/kunden/neu" className="btn-secondary">
            Kunden anlegen
          </Link>
          <Link href="/coach/einrichtung" className="btn-secondary">
            Einrichtung & Strava-Webhook
          </Link>
        </div>
      </div>
    </div>
  );
}
