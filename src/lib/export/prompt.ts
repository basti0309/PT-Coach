// KI-Prompt "KI ohne API": Vorlage aus docs/ki-prompt-vorlage.md mit Platzhaltern.

export const PROMPT_PLACEHOLDERS = ["{{AUFGABE}}", "{{SCHEMA}}", "{{EXPORT}}"] as const;

export function buildPrompt(template: string, values: { aufgabe: string; schema: string; exportJson: string }): string {
  const aufgabe = values.aufgabe.trim() || "(keine besondere Aufgabe – bitte den Plan sinnvoll fortschreiben)";
  // Funktions-Ersetzer, damit "$" im Inhalt nicht als Ersetzungsmuster gilt.
  return template
    .replaceAll("{{AUFGABE}}", () => aufgabe)
    .replaceAll("{{SCHEMA}}", () => values.schema)
    .replaceAll("{{EXPORT}}", () => values.exportJson);
}

/** Nur den eigentlichen Prompt-Teil der Markdown-Datei (zwischen den Markierungen) verwenden. */
export function extractTemplate(markdown: string): string {
  const start = markdown.indexOf("<!-- PROMPT-START -->");
  const end = markdown.indexOf("<!-- PROMPT-ENDE -->");
  if (start === -1 || end === -1 || end < start) return markdown.trim();
  return markdown.slice(start + "<!-- PROMPT-START -->".length, end).trim();
}
