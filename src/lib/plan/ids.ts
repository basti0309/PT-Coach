// Erzeugung lesbarer IDs für Einheiten und Übungen.

/** "Rumänisches Kreuzheben" → "rumaenisches-kreuzheben" */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

/** Neue, im Plan eindeutige Einheiten-ID wie "w2d3-lauf", bei Kollision mit Zähler. */
export function newSessionId(existing: Set<string>, week: number, day: number, kind: string): string {
  const base = `w${week}d${day}-${kind}`;
  if (!existing.has(base)) return base;
  for (let i = 2; ; i++) {
    const candidate = `${base}-${i}`;
    if (!existing.has(candidate)) return candidate;
  }
}
