import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveMessage } from "@/lib/actions/chat";
import { formatDateTime } from "@/lib/format";
import { env } from "@/lib/env";
import type { MessageRow } from "@/lib/db-types";

export const metadata = { title: "Posteingang" };

export default async function Inbox() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("messages")
    .select("*")
    .eq("needs_coach", true)
    .is("resolved_at", null)
    .order("created_at", { ascending: true });
  const messages = (data ?? []) as MessageRow[];
  const { data: clients } = await supabase.from("profiles").select("id, full_name").in("id", [...new Set(messages.map((m) => m.client_id))]);
  const name = new Map((clients ?? []).map((c) => [c.id, c.full_name]));

  return (
    <div className="space-y-4">
      <h1 className="h1">Posteingang</h1>
      <p className="muted">Nachrichten, die der KI-Vorfilter an dich weitergeleitet hat. Antwortest du im Chat, gelten sie als erledigt.</p>
      {messages.length === 0 && <p className="card muted">Alles erledigt. 🎉</p>}
      <ul className="space-y-3">
        {messages.map((m) => (
          <li key={m.id} className="card space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">{name.get(m.client_id) ?? "Kunde"}</span>
              <span className="muted">{formatDateTime(m.created_at, env.timeZone())}</span>
            </div>
            <p className="whitespace-pre-wrap">{m.body}</p>
            <p className="text-xs text-slate-500">Grund: {m.ai_reason ?? "–"}</p>
            <div className="flex flex-wrap gap-2">
              <Link href={`/coach/kunden/${m.client_id}/chat`} className="btn-primary btn-small">
                Antworten
              </Link>
              <form action={resolveMessage.bind(null, m.id)}>
                <button className="btn-secondary btn-small">Erledigt ohne Antwort</button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
