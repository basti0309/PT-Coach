"use client";

import { useState } from "react";
import { buildNewPlanPrompt, buildPrompt } from "@/lib/export/prompt";

function download(name: string, content: string, type = "application/json") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn-secondary"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? "✓ Kopiert" : label}
    </button>
  );
}

export function JsonExport({ json, fileName }: { json: string; fileName: string }) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-primary" onClick={() => download(fileName, json)}>
          JSON herunterladen
        </button>
        <CopyButton text={json} label="JSON kopieren" />
      </div>
      <details>
        <summary className="cursor-pointer text-sm font-medium">Vorschau</summary>
        <pre className="mt-2 max-h-96 overflow-auto rounded-lg bg-slate-50 p-2 text-xs">{json}</pre>
      </details>
    </div>
  );
}

export function PromptBuilder({ template, schema, exportJson }: { template: string; schema: string; exportJson: string }) {
  const [aufgabe, setAufgabe] = useState("");
  const prompt = buildPrompt(template, { aufgabe, schema, exportJson });
  return (
    <div className="space-y-2">
      <label className="label" htmlFor="aufgabe">
        Aufgabe für die KI
      </label>
      <textarea
        id="aufgabe"
        className="input min-h-24"
        placeholder="z. B. Ergänze Woche 3 und 4 mit leichter Steigerung, Laufumfang +10 %, Kraft 2× pro Woche."
        value={aufgabe}
        onChange={(e) => setAufgabe(e.target.value)}
      />
      <div className="flex flex-wrap gap-2">
        <CopyButton text={prompt} label="Prompt kopieren" />
      </div>
      <details>
        <summary className="cursor-pointer text-sm font-medium">Prompt ansehen ({prompt.length.toLocaleString("de-DE")} Zeichen)</summary>
        <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-2 text-xs">{prompt}</pre>
      </details>
    </div>
  );
}

export function NewPlanPromptBuilder({ template, schema, vorlage }: { template: string; schema: string; vorlage: string }) {
  const [beschreibung, setBeschreibung] = useState("");
  const prompt = buildNewPlanPrompt(template, { beschreibung, schema, vorlage });
  return (
    <div className="space-y-2">
      <label className="label" htmlFor="beschreibung">
        Zusätzliche Wünsche (optional)
      </label>
      <textarea
        id="beschreibung"
        className="input min-h-24"
        placeholder="z. B. 12 Wochen ab Montag, Vorlage Base Builder, Sonntag Ruhetag"
        value={beschreibung}
        onChange={(e) => setBeschreibung(e.target.value)}
      />
      <div className="flex flex-wrap gap-2">
        <CopyButton text={prompt} label="Prompt kopieren" />
        <button type="button" className="btn-secondary" onClick={() => download("prompt-trainingsplan.txt", prompt, "text/plain")}>
          Prompt herunterladen
        </button>
      </div>
      <details>
        <summary className="cursor-pointer text-sm font-medium">Prompt ansehen ({prompt.length.toLocaleString("de-DE")} Zeichen)</summary>
        <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-2 text-xs">{prompt}</pre>
      </details>
    </div>
  );
}
