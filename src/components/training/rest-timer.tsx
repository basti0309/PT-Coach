"use client";

import { useEffect, useRef, useState } from "react";
import { formatDuration } from "@/lib/format";

export interface TimerState {
  endsAt: number;
  total: number;
  label: string;
}

/** Gut sichtbarer Pausentimer (unten fixiert). Vibriert am Ende, wo der Browser es kann. */
export function RestTimer({ timer, onChange }: { timer: TimerState | null; onChange: (t: TimerState | null) => void }) {
  const [now, setNow] = useState(() => Date.now());
  const [finished, setFinished] = useState(false);
  const firedFor = useRef<number | null>(null);

  useEffect(() => {
    if (!timer) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [timer]);

  // "now" kann beim Start noch vom letzten Intervall stammen → nie vor dem Startzeitpunkt rechnen.
  const current = timer ? Math.max(now, timer.endsAt - timer.total * 1000) : now;
  const remaining = timer ? Math.max(0, Math.ceil((timer.endsAt - current) / 1000)) : 0;

  useEffect(() => {
    if (!timer || remaining > 0 || firedFor.current === timer.endsAt) return;
    firedFor.current = timer.endsAt;
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate([400, 200, 400, 200, 400]);
    // Zustandswechsel nach Ablauf (externes Ereignis Zeit), danach automatisch ausblenden.
    const show = setTimeout(() => setFinished(true), 0);
    const hide = setTimeout(() => {
      setFinished(false);
      onChange(null);
    }, 4000);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, [remaining, timer, onChange]);

  if (!timer) return null;
  const progress = timer.total > 0 ? Math.min(1, (timer.total - remaining) / timer.total) : 1;
  return (
    <div
      role="timer"
      aria-live="polite"
      className={`fixed inset-x-0 bottom-16 z-40 mx-auto max-w-2xl px-3 pb-[env(safe-area-inset-bottom)] ${finished ? "animate-pulse" : ""}`}
    >
      <div className={`rounded-2xl p-3 text-white shadow-xl ${remaining === 0 ? "bg-green-600" : "bg-slate-900"}`}>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <p className="text-xs uppercase tracking-wide text-white/70">{remaining === 0 ? "Pause vorbei – los geht's!" : `Pause · ${timer.label}`}</p>
            <p className="font-mono text-5xl font-bold tabular-nums">{formatDuration(remaining)}</p>
          </div>
          <div className="flex flex-col gap-1">
            <button
              type="button"
              className="rounded-lg bg-white/15 px-3 py-2 text-sm font-semibold"
              onClick={() => onChange({ ...timer, endsAt: timer.endsAt + 15_000, total: timer.total + 15 })}
            >
              +15 s
            </button>
            <button type="button" className="rounded-lg bg-white/15 px-3 py-2 text-sm font-semibold" onClick={() => onChange(null)}>
              Fertig
            </button>
          </div>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/20">
          <div className="h-full bg-white" style={{ width: `${progress * 100}%` }} />
        </div>
      </div>
    </div>
  );
}
