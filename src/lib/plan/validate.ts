// Validierung eines Plans gegen das Zod-Schema plus Zusatzregeln,
// mit verständlichen deutschen Fehlermeldungen inkl. Fundstelle.
import type { z } from "zod";
import { PlanSchema, type PlanContent } from "./schema";

export type ValidationResult = { ok: true; plan: PlanContent } | { ok: false; errors: string[] };

const FIELD_LABELS: Record<string, string> = {
  schemaVersion: "Schema-Version",
  title: "Titel",
  startDate: "Startdatum",
  goal: "Ziel",
  notes: "Notizen",
  weeks: "Wochen",
  week: "Wochennummer",
  focus: "Schwerpunkt",
  days: "Tage",
  day: "Tag",
  sessions: "Einheiten",
  id: "ID",
  type: "Typ",
  exercises: "Übungen",
  exerciseId: "Übungs-ID",
  name: "Name",
  sets: "Sätze",
  reps: "Wiederholungen",
  targetWeightKg: "Zielgewicht (kg)",
  restSeconds: "Pause (Sekunden)",
  wodId: "WOD-ID",
  wodType: "WOD-Typ",
  timeCapMinutes: "Time Cap (Minuten)",
  durationMinutes: "Dauer (Minuten)",
  rounds: "Runden",
  movements: "Bewegungen",
  weightKg: "Gewicht (kg)",
  distanceM: "Distanz (m)",
  calories: "Kalorien",
  sport: "Sportart",
  distanceKm: "Distanz (km)",
  intensity: "Intensität",
  description: "Beschreibung",
};

type Path = PropertyKey[];

function get(obj: unknown, path: Path): unknown {
  let cur: unknown = obj;
  for (const key of path) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<PropertyKey, unknown>)[key];
  }
  return cur;
}

/** Pfad wie ["weeks",0,"days",1,"sessions",0,"reps"] → "Woche 1 › Tag 2 › Einheit „w1d2-lauf“ › Wiederholungen" */
export function describePath(input: unknown, path: Path): string {
  const parts: string[] = [];
  for (let i = 0; i < path.length; i++) {
    const key = path[i];
    const next = path[i + 1];
    const here = path.slice(0, i + 2);
    if (typeof next === "number") {
      const item = get(input, here) as Record<string, unknown> | undefined;
      const n = next + 1;
      if (key === "weeks") parts.push(`Woche ${typeof item?.week === "number" ? item.week : `(Eintrag ${n})`}`);
      else if (key === "days") parts.push(`Tag ${typeof item?.day === "number" ? item.day : `(Eintrag ${n})`}`);
      else if (key === "sessions") parts.push(typeof item?.id === "string" ? `Einheit „${item.id}“` : `Einheit ${n}`);
      else if (key === "exercises") parts.push(typeof item?.name === "string" ? `Übung ${n} „${item.name}“` : `Übung ${n}`);
      else if (key === "movements") parts.push(typeof item?.name === "string" ? `Bewegung ${n} „${item.name}“` : `Bewegung ${n}`);
      else parts.push(`${FIELD_LABELS[String(key)] ?? String(key)} ${n}`);
      i++;
    } else {
      parts.push(FIELD_LABELS[String(key)] ? `${FIELD_LABELS[String(key)]} („${String(key)}“)` : `„${String(key)}“`);
    }
  }
  return parts.length ? parts.join(" › ") : "Plan";
}

function typeName(expected: string): string {
  return (
    { string: "Text", number: "Zahl", int: "ganze Zahl", array: "Liste", object: "Objekt", boolean: "true/false" } as Record<
      string,
      string
    >
  )[expected] ?? expected;
}

function messageFor(issue: z.core.$ZodIssue, input: unknown): string {
  const value = get(input, issue.path);
  switch (issue.code) {
    case "invalid_type":
      if (value === undefined) return "Pflichtfeld fehlt";
      return `muss vom Typ ${typeName(issue.expected)} sein (gefunden: ${JSON.stringify(value)})`;
    case "too_small":
      if (issue.origin === "string") return "darf nicht leer sein";
      if (issue.origin === "array") return `braucht mindestens ${issue.minimum} Eintrag/Einträge`;
      return `muss mindestens ${issue.minimum} sein (gefunden: ${JSON.stringify(value)})`;
    case "too_big":
      if (issue.origin === "string") return `ist zu lang (höchstens ${issue.maximum} Zeichen)`;
      if (issue.origin === "array") return `hat zu viele Einträge (höchstens ${issue.maximum})`;
      return `darf höchstens ${issue.maximum} sein (gefunden: ${JSON.stringify(value)})`;
    case "invalid_format":
      if (issue.format === "date") return `muss ein Datum im Format JJJJ-MM-TT sein (gefunden: ${JSON.stringify(value)})`;
      if (issue.format === "regex")
        return `darf nur Kleinbuchstaben, Ziffern, „-“ und „_“ enthalten und muss mit Buchstabe/Ziffer beginnen (gefunden: ${JSON.stringify(value)})`;
      return `hat ein ungültiges Format (gefunden: ${JSON.stringify(value)})`;
    case "invalid_value":
      return `ungültiger Wert ${JSON.stringify(value)} – erlaubt: ${issue.values.map((v) => JSON.stringify(v)).join(", ")}`;
    case "unrecognized_keys":
      return `unbekannte(s) Feld(er): ${issue.keys.map((k) => `„${k}“`).join(", ")} (Tippfehler? Nicht erlaubt.)`;
    case "invalid_union": {
      const typePath = issue.path[issue.path.length - 1] === "type" ? issue.path : [...issue.path, "type"];
      return `muss "strength", "wod" oder "endurance" sein (gefunden: ${JSON.stringify(get(input, typePath)) ?? "nichts"})`;
    }
    default:
      return issue.message;
  }
}

/** Zusatzregeln, die das JSON Schema nicht ausdrücken kann. */
export function semanticErrors(plan: PlanContent): string[] {
  const errors: string[] = [];
  const weekNumbers = new Set<number>();
  const sessionIds = new Map<string, string>();
  for (const w of plan.weeks) {
    if (weekNumbers.has(w.week)) errors.push(`Woche ${w.week}: Wochennummer kommt mehrfach vor.`);
    weekNumbers.add(w.week);
    const dayNumbers = new Set<number>();
    for (const d of w.days) {
      if (dayNumbers.has(d.day)) errors.push(`Woche ${w.week} › Tag ${d.day}: Tag kommt in dieser Woche mehrfach vor.`);
      dayNumbers.add(d.day);
      for (const s of d.sessions) {
        const where = `Woche ${w.week} › Tag ${d.day}`;
        const prev = sessionIds.get(s.id);
        if (prev) errors.push(`${where} › Einheit „${s.id}“: ID ist nicht eindeutig (auch in ${prev}).`);
        else sessionIds.set(s.id, where);
        if (s.type === "endurance" && s.durationMinutes === undefined && s.distanceKm === undefined) {
          errors.push(`${where} › Einheit „${s.id}“: Ausdauereinheit braucht Dauer („durationMinutes“) und/oder Distanz („distanceKm“).`);
        }
      }
    }
  }
  return errors;
}

export function validatePlan(input: unknown): ValidationResult {
  const parsed = PlanSchema.safeParse(input);
  if (!parsed.success) {
    const errors = parsed.error.issues.map((issue) => `${describePath(input, issue.path)}: ${messageFor(issue, input)}`);
    return { ok: false, errors: [...new Set(errors)] };
  }
  const extra = semanticErrors(parsed.data);
  if (extra.length) return { ok: false, errors: extra };
  return { ok: true, plan: parsed.data };
}

/**
 * Text aus Einfügen/Upload → Plan. Akzeptiert die komplette Export-Datei
 * (dann wird nur "plan" übernommen) oder einen Plan direkt.
 */
export function parsePlanImport(text: string): ValidationResult {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  if (!trimmed) return { ok: false, errors: ["Es wurde kein Text eingefügt."] };
  let data: unknown;
  try {
    data = JSON.parse(trimmed);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const pos = /position (\d+)/.exec(msg);
    let where = "";
    if (pos) {
      const before = trimmed.slice(0, Number(pos[1]));
      const line = before.split("\n").length;
      const col = before.length - before.lastIndexOf("\n");
      where = ` (Zeile ${line}, Spalte ${col})`;
    }
    return {
      ok: false,
      errors: [`Kein gültiges JSON${where}. Häufige Ursachen: fehlendes Komma, Komma nach dem letzten Eintrag, Text vor oder nach dem JSON.`],
    };
  }
  if (data && typeof data === "object" && !Array.isArray(data) && "format" in data && "plan" in data) {
    const envelope = data as { format?: unknown; plan?: unknown };
    if (envelope.format !== "pt-coach-export") {
      return { ok: false, errors: ['Feld „format“ muss "pt-coach-export" sein.'] };
    }
    if (envelope.plan == null) return { ok: false, errors: ["Die Export-Datei enthält keinen Plan („plan“ ist leer)."] };
    return validatePlan(envelope.plan);
  }
  return validatePlan(data);
}
