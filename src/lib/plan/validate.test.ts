import { describe, expect, it } from "vitest";
import { samplePlan } from "./fixtures";
import { parsePlanImport, validatePlan } from "./validate";

describe("Plan-Validierung", () => {
  it("akzeptiert einen gültigen Plan", () => {
    expect(validatePlan(samplePlan()).ok).toBe(true);
  });

  it("meldet fehlende Pflichtfelder mit Fundstelle", () => {
    const plan = samplePlan() as unknown as { weeks: { days: { sessions: Record<string, unknown>[] }[] }[] };
    delete plan.weeks[0].days[0].sessions[0].title;
    const r = validatePlan(plan);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors).toContain("Woche 1 › Tag 1 › Einheit „w1d1-kraft“ › Titel („title“): Pflichtfeld fehlt");
  });

  it("meldet falsche Zahlen verständlich", () => {
    const plan = structuredClone(samplePlan()) as unknown as {
      weeks: { days: { sessions: { exercises: Record<string, unknown>[] }[] }[] }[];
    };
    plan.weeks[0].days[0].sessions[0].exercises[0].sets = 0;
    plan.weeks[0].days[0].sessions[0].exercises[0].reps = 5.5;
    const r = validatePlan(plan);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors).toContain(
        "Woche 1 › Tag 1 › Einheit „w1d1-kraft“ › Übung 1 „Kniebeuge“ › Sätze („sets“): muss mindestens 1 sein (gefunden: 0)",
      );
      expect(r.errors.some((e) => e.includes("Wiederholungen („reps“): muss vom Typ ganze Zahl sein"))).toBe(true);
    }
  });

  it("meldet unbekannte Felder und Typen", () => {
    const plan = structuredClone(samplePlan()) as unknown as Record<string, unknown> & {
      weeks: { days: { sessions: Record<string, unknown>[] }[] }[];
    };
    plan.titel = "Tippfehler";
    plan.weeks[0].days[1].sessions[0].type = "cardio";
    const r = validatePlan(plan);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors).toContain("Plan: unbekannte(s) Feld(er): „titel“ (Tippfehler? Nicht erlaubt.)");
      expect(r.errors.some((e) => e === 'Woche 1 › Tag 2 › Einheit „w1d2-lauf“ › Typ („type“): muss "strength", "wod" oder "endurance" sein (gefunden: "cardio")')).toBe(true);
    }
  });

  it("prüft Zusatzregeln: doppelte IDs und Ausdauer ohne Dauer/Distanz", () => {
    const plan = samplePlan();
    plan.weeks[1].days[0].sessions[0].id = "w1d1-kraft";
    const lauf = plan.weeks[0].days[1].sessions[0];
    if (lauf.type === "endurance") delete lauf.durationMinutes;
    const r = validatePlan(plan);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors).toContain("Woche 2 › Tag 3 › Einheit „w1d1-kraft“: ID ist nicht eindeutig (auch in Woche 1 › Tag 1).");
      expect(r.errors.some((e) => e.includes("w1d2-lauf“: Ausdauereinheit braucht Dauer"))).toBe(true);
    }
  });

  it("ungültiges Datum", () => {
    const r = validatePlan({ ...samplePlan(), startDate: "2026-02-30" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0]).toContain("Startdatum („startDate“): muss ein Datum im Format JJJJ-MM-TT sein");
  });
});

describe("Import-Text", () => {
  it("akzeptiert die Export-Datei und übernimmt nur den Plan", () => {
    const text = JSON.stringify({ format: "pt-coach-export", exportVersion: 1, client: { label: "K01" }, plan: samplePlan() });
    const r = parsePlanImport(text);
    expect(r.ok).toBe(true);
  });
  it("akzeptiert einen nackten Plan, auch in ```json-Blöcken", () => {
    expect(parsePlanImport("```json\n" + JSON.stringify(samplePlan()) + "\n```").ok).toBe(true);
  });
  it("meldet JSON-Syntaxfehler mit Zeile", () => {
    const r = parsePlanImport('{\n  "title": "x",\n}');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0]).toMatch(/^Kein gültiges JSON \(Zeile 3/);
  });
  it("leerer Text", () => {
    const r = parsePlanImport("  ");
    expect(r.ok).toBe(false);
  });
});
