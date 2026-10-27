"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { lineDiff, planToText, summarizePlanChanges } from "@/lib/plan/diff";
import type { PlanContent } from "@/lib/plan/schema";
import { parsePlanImport } from "@/lib/plan/validate";

type SaveFn = (content: PlanContent, note: string) => Promise<{ ok: true; version: number } | { ok: false; errors: string[] }>;

export function PlanImport({ current, save, doneHref }: { current: PlanContent; save: SaveFn; doneHref: string }) {
  const [text, setText] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [candidate, setCandidate] = useState<PlanContent | null>(null);
  const [note, setNote] = useState("Import (KI)");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const check = (value: string) => {
    const result = parsePlanImport(value);
    if (result.ok) {
      setErrors([]);
      setCandidate(result.plan);
    } else {
      setErrors(result.errors);
      setCandidate(null);
    }
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const content = await file.text();
    setText(content);
    check(content);
  };

  const apply = () => {
    if (!candidate) return;
    startTransition(async () => {
      const result = await save(candidate, note);
      if (result.ok) {
        router.push(doneHref);
        router.refresh();
      } else {
        setErrors(result.errors);
        setCandidate(null);
      }
    });
  };

  const diff = candidate ? lineDiff(planToText(current), planToText(candidate)) : [];
  const summary = candidate ? summarizePlanChanges(current, candidate) : null;
  const unchanged = summary && !summary.metaChanged && !summary.added.length && !summary.removed.length && !summary.changed.length;

  return (
    <div className="space-y-4">
      <div className="card space-y-3">
        <label className="label" htmlFor="json">
          JSON einfügen (komplette Export-Datei oder nur der Plan)
        </label>
        <textarea
          id="json"
          className="input min-h-48 font-mono text-xs"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setCandidate(null);
          }}
          placeholder='{"format": "pt-coach-export", ...}'
        />
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="btn-primary" onClick={() => check(text)}>
            Prüfen
          </button>
          <label className="btn-secondary cursor-pointer">
            Datei hochladen
            <input type="file" accept="application/json,.json,.txt" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
          </label>
        </div>
        {errors.length > 0 && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
            <p className="font-semibold">Der Plan kann so nicht übernommen werden ({errors.length} Problem{errors.length > 1 ? "e" : ""}):</p>
            <ul className="list-disc pl-5">
              {errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {candidate && summary && (
        <div className="card space-y-3">
          <h3 className="h2">Änderungen prüfen</h3>
          {unchanged ? (
            <p className="muted">Keine Änderungen gegenüber der aktuellen Version.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {summary.metaChanged && <li>• Titel, Startdatum, Ziel, Notizen oder Wochen-Schwerpunkte geändert</li>}
              {summary.added.map((s) => (
                <li key={"a" + s} className="text-green-700">
                  + neu: {s}
                </li>
              ))}
              {summary.changed.map((s) => (
                <li key={"c" + s} className="text-amber-700">
                  ~ geändert: {s}
                </li>
              ))}
              {summary.removed.map((s) => (
                <li key={"r" + s} className="text-red-700">
                  − entfernt: {s}
                </li>
              ))}
            </ul>
          )}
          <details>
            <summary className="cursor-pointer text-sm font-medium">Zeilenweise Ansicht alt/neu</summary>
            <pre className="mt-2 max-h-[60vh] overflow-auto rounded-lg bg-slate-50 p-2 text-xs leading-5">
              {diff.map((l, i) => (
                <div
                  key={i}
                  className={l.type === "add" ? "bg-green-100 text-green-900" : l.type === "del" ? "bg-red-100 text-red-900" : "text-slate-500"}
                >
                  {l.type === "add" ? "+ " : l.type === "del" ? "− " : "  "}
                  {l.text}
                </div>
              ))}
            </pre>
          </details>
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Notiz zur Version" />
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-primary" onClick={apply} disabled={pending || Boolean(unchanged)}>
              {pending ? "Übernehme …" : "Bestätigen und als neue Version übernehmen"}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setCandidate(null)}>
              Verwerfen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
