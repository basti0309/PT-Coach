import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";

export default async function ClientsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: clients } = await supabase
    .from("profiles")
    .select("id, full_name, short_code, email")
    .eq("role", "client")
    .order("full_name");
  const { data: lastLogs } = await supabase
    .from("workout_logs")
    .select("client_id, performed_on")
    .eq("completed", true)
    .order("performed_on", { ascending: false })
    .limit(500);
  const last = new Map<string, string>();
  for (const l of lastLogs ?? []) if (!last.has(l.client_id)) last.set(l.client_id, l.performed_on);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="h1">Kunden</h1>
        <Link href="/coach/kunden/neu" className="btn-primary">
          + Kunde
        </Link>
      </div>
      {(clients ?? []).length === 0 && <p className="muted">Noch keine Kunden angelegt.</p>}
      <ul className="grid gap-3 sm:grid-cols-2">
        {(clients ?? []).map((c) => (
          <li key={c.id}>
            <Link href={`/coach/kunden/${c.id}`} className="card block hover:border-brand-500">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{c.full_name}</span>
                <span className="badge bg-slate-100 text-slate-700">{c.short_code}</span>
              </div>
              <p className="muted">{c.email}</p>
              <p className="muted">
                Letztes Training: {last.has(c.id) ? formatDate(last.get(c.id)!) : "–"}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
