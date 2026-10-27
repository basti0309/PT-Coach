import { ChatThread } from "@/components/chat-thread";
import { requireClient } from "@/lib/auth";
import { sendClientMessage } from "@/lib/actions/chat";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { MessageRow } from "@/lib/db-types";
import { env } from "@/lib/env";

export default async function KundeChat() {
  const viewer = await requireClient();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("messages")
    .select("id, client_id, sender, author_id, body, ai_action, ai_reason, needs_coach, resolved_at, created_at")
    .eq("client_id", viewer.userId)
    .order("created_at")
    .limit(300);
  return (
    <div className="space-y-3">
      <h1 className="h1">Chat mit deinem Coach</h1>
      <ChatThread key={(data ?? []).at(-1)?.id ?? "leer"} clientId={viewer.userId} initial={(data ?? []) as MessageRow[]} viewer="client" send={sendClientMessage} timeZone={env.timeZone()} />
    </div>
  );
}
