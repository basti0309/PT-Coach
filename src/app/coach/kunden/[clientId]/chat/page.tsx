import { ChatThread } from "@/components/chat-thread";
import { resolveMessage, sendCoachMessage } from "@/lib/actions/chat";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { MessageRow } from "@/lib/db-types";

export default async function CoachChat({ params }: PageProps<"/coach/kunden/[clientId]/chat">) {
  const { clientId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("messages").select("*").eq("client_id", clientId).order("created_at").limit(300);
  return (
    <ChatThread
      key={(data ?? []).at(-1)?.id ?? "leer"}
      clientId={clientId}
      initial={(data ?? []) as MessageRow[]}
      viewer="coach"
      send={sendCoachMessage.bind(null, clientId)}
      resolve={resolveMessage}
    />
  );
}
