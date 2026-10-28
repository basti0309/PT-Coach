import { describe, expect, it } from "vitest";
import { samplePlan, sampleProgramPlan } from "./fixtures";
import { nextMonday, planTemplate } from "./template";
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
      expect(r.errors.some((e) => e === 'Woche 1 › Tag 2 › Einheit „w1d2-lauf“ › Typ („type“): muss "strength", "wod", "endurance" oder "program" sein (gefunden: "cardio")')).toBe(true);
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

  it("Programm-Einheit mit Blöcken und Ruhetag ist gültig, ebenso die leere Vorlage", () => {
    expect(validatePlan(sampleProgramPlan()).ok).toBe(true);
    expect(validatePlan(planTemplate("2026-11-02")).ok).toBe(true);
  });

  it("Zusatzregeln für Programm-Einheiten und Ruhetage", () => {
    const plan = sampleProgramPlan();
    const s = plan.weeks[0].days[0].sessions[0];
    if (s.type !== "program") throw new Error("Testdaten");
    s.blocks[1].key = "p1";
    s.blocks[2].loads = [{ label: "Wall Ball" }];
    plan.weeks[0].days[1] = { day: 7, sessions: [] };
    const r = validatePlan(plan);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors).toEqual([
        "Woche 1 › Tag 1 › Einheit „w1d1-pm“: Block-Kennung „p1“ kommt mehrfach vor.",
        "Woche 1 › Tag 1 › Einheit „w1d1-pm“ › Block „p3“: Gewicht „Wall Ball“ braucht maleKg, femaleKg oder kg.",
        "Woche 1 › Tag 7: Tag ohne Einheiten (Ruhetag) braucht einen Titel („title“) oder Hinweis („notes“).",
      ]);
    }
  });

  it("unbekannte Wertung wird verständlich gemeldet", () => {
    const plan = sampleProgramPlan() as unknown as { weeks: { days: { sessions: { blocks: { scoring: { type: string } }[] }[] }[] }[] };
    plan.weeks[0].days[0].sessions[0].blocks[0].scoring.type = "Distance";
    const r = validatePlan(plan);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0]).toContain("Block 1 „2k row warm up“ › Wertung („scoring“) › Typ („type“): ungültiger Wert \"Distance\"");
  });

  it("Startdatum der Vorlage: nächster Montag", () => {
    // 27.10.2026 ist ein Dienstag → +6 Tage = Montag 02.11.2026
    expect(nextMonday("2026-10-27")).toBe("2026-11-02");
    // 26.10.2026 ist ein Montag → eine Woche später
    expect(nextMonday("2026-10-26")).toBe("2026-11-02");
    // 01.11.2026 ist ein Sonntag → +1 Tag
    expect(nextMonday("2026-11-01")).toBe("2026-11-02");
  });
});
