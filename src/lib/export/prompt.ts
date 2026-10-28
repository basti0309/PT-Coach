// KI-Prompts "KI ohne API": Vorlagen aus docs/ki-prompt-vorlage.md (Plan ändern)
// und docs/ki-prompt-neuer-plan.md (neuer Plan) mit Platzhaltern.

export const PROMPT_PLACEHOLDERS = ["{{AUFGABE}}", "{{SCHEMA}}", "{{EXPORT}}"] as const;
export const NEW_PLAN_PLACEHOLDERS = ["{{BESCHREIBUNG}}", "{{SCHEMA}}", "{{VORLAGE}}"] as const;

/** Platzhalter {{NAME}} ersetzen. Funktions-Ersetzer, damit "$" im Inhalt nicht als Ersetzungsmuster gilt. */
export function fillTemplate(template: string, values: Record<string, string>): string {
  return Object.entries(values).reduce((text, [name, value]) => text.replaceAll(`{{${name}}}`, () => value), template);
}

export function buildPrompt(template: string, values: { aufgabe: string; schema: string; exportJson: string }): string {
  const aufgabe = values.aufgabe.trim() || "(keine besondere Aufgabe – bitte den Plan sinnvoll fortschreiben)";
  return fillTemplate(template, { AUFGABE: aufgabe, SCHEMA: values.schema, EXPORT: values.exportJson });
}

export function buildNewPlanPrompt(template: string, values: { beschreibung: string; schema: string; vorlage: string }): string {
  const beschreibung = values.beschreibung.trim() || "(keine Beschreibung angegeben – bitte nachfragen, bevor du einen Plan erstellst)";
  return fillTemplate(template, { BESCHREIBUNG: beschreibung, SCHEMA: values.schema, VORLAGE: values.vorlage });
}

/** Nur den eigentlichen Prompt-Teil der Markdown-Datei (zwischen den Markierungen) verwenden. */
export function extractTemplate(markdown: string): string {
  const start = markdown.indexOf("<!-- PROMPT-START -->");
  const end = markdown.indexOf("<!-- PROMPT-ENDE -->");
  if (start === -1 || end === -1 || end < start) return markdown.trim();
  return markdown.slice(start + "<!-- PROMPT-START -->".length, end).trim();
}
