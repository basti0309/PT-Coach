"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { MessageRow } from "@/lib/db-types";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type SendFn = (text: string) => Promise<{ ok: boolean; error?: string }>;

function time(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat("de-DE", { timeZone, day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

export function ChatThread({
  clientId,
  initial,
  viewer,
  send,
  resolve,
  timeZone,
}: {
  clientId: string;
  timeZone: string;
  initial: MessageRow[];
  viewer: "client" | "coach";
  send: SendFn;
  resolve?: (id: string) => Promise<void>;
}) {
  const [messages, setMessages] = useState(initial);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const bottom = useRef<HTMLDivElement>(null);

  // Live-Updates über Supabase Realtime (RLS gilt auch hier).
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`messages-${clientId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `client_id=eq.${clientId}` }, (payload) => {
        const row = payload.new as MessageRow;
        if (!row?.id) return;
        setMessages((prev) => {
          const i = prev.findIndex((m) => m.id === row.id);
          if (i === -1) return [...prev, row].sort((a, b) => a.created_at.localeCompare(b.created_at));
          const copy = [...prev];
          copy[i] = row;
          return copy;
        });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientId]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const submit = () => {
    if (!text.trim()) return;
    setError("");
    const value = text;
    startTransition(async () => {
      const r = await send(value);
      if (r.ok) {
        setText("");
        router.refresh();
      } else setError(r.error ?? "Senden fehlgeschlagen");
    });
  };

  const mine = (m: MessageRow) => m.sender === viewer;

  return (
    <div className="flex flex-col gap-3">
      <div className="space-y-2">
        {messages.length === 0 && <p className="muted text-center">Noch keine Nachrichten.</p>}
        {messages.map((m) => {
          if (m.sender === "system") {
            return (
              <p key={m.id} className="mx-auto max-w-md rounded-xl bg-slate-100 px-3 py-2 text-center text-xs text-slate-600">
                {m.body}
              </p>
            );
          }
          const label = m.sender === "ai" ? "🤖 KI-Antwort (automatisch)" : m.sender === "coach" ? "Coach" : viewer === "coach" ? "Kunde" : "Du";
          return (
            <div key={m.id} className={`flex ${mine(m) ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 ${
                  m.sender === "ai"
                    ? "border border-dashed border-violet-300 bg-violet-50"
                    : mine(m)
                      ? "bg-brand-600 text-white"
                      : "border border-slate-200 bg-white"
                }`}
              >
                <p className={`text-[11px] font-semibold ${mine(m) ? "text-white/80" : m.sender === "ai" ? "text-violet-700" : "text-slate-500"}`}>
                  {label} · {time(m.created_at, timeZone)}
                </p>
                <p className="whitespace-pre-wrap">{m.body}</p>
                {viewer === "coach" && m.sender === "client" && m.ai_action && (
                  <div className="mt-1 space-y-1 border-t border-slate-200 pt-1 text-xs text-slate-500">
                    <p>
                      Vorfilter: <strong>{m.ai_action === "escalate" ? "an dich weitergeleitet" : "von KI beantwortet"}</strong> – {m.ai_reason}
                    </p>
                    {m.needs_coach && !m.resolved_at && resolve && (
                      <button type="button" className="btn-secondary btn-small" onClick={() => startTransition(() => resolve(m.id))}>
                        Als erledigt markieren
                      </button>
                    )}
                    {m.needs_coach && m.resolved_at && <p className="text-green-700">✓ erledigt</p>}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>
      <div className="sticky bottom-16 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm md:bottom-2">
        {error && <p className="px-1 pb-1 text-sm text-red-700">{error}</p>}
        <div className="flex items-end gap-2">
          <textarea
            className="input min-h-11 flex-1 resize-none"
            rows={2}
            placeholder={viewer === "client" ? "Nachricht an deinen Coach …" : "Antwort an den Kunden …"}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button type="button" className="btn-primary" disabled={pending || !text.trim()} onClick={submit}>
            {pending ? (viewer === "client" ? "Prüfe …" : "Sende …") : "Senden"}
          </button>
        </div>
        {viewer === "client" && (
          <p className="px-1 pt-1 text-[11px] text-slate-500">
            Nachrichten prüft zuerst eine KI: einfache Fragen beantwortet sie (gekennzeichnet), alles andere geht an deinen Coach.
            Bei Schmerzen, Verletzungen, Krankheit, Medikamenten oder Schwangerschaft antwortet immer dein Coach.
          </p>
        )}
      </div>
    </div>
  );
}
