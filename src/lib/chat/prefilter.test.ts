import { describe, expect, it } from "vitest";
import { buildSystemPrompt, runPrefilter, type Classifier, type PrefilterContext } from "./prefilter";

const ctx: PrefilterContext = {
  rules: ["Wunsch nach Planänderung → an den Coach."],
  knowledge: [{ kind: "faq", title: "Pausen", content: "Pausen stehen im Plan." }],
  profileJson: '{"label":"K01"}',
  planJson: '{"title":"Plan"}',
  history: [],
};

const answering: Classifier = async () => ({ action: "answer", answer: "Die Pause steht im Plan: 120 s.", reason: "FAQ" });
const escalating: Classifier = async () => ({ action: "escalate", answer: "", reason: "Planänderung" });

describe("KI-Vorfilter", () => {
  it("übernimmt die KI-Antwort", async () => {
    const d = await runPrefilter("Wie lange Pause bei Kniebeugen?", ctx, answering);
    expect(d).toEqual({ action: "answer", answer: "Die Pause steht im Plan: 120 s.", reason: "FAQ", source: "ki" });
  });

  it("übernimmt die KI-Eskalation", async () => {
    expect((await runPrefilter("Kannst du den Plan ändern?", ctx, escalating)).action).toBe("escalate");
  });

  it("Pflichtregel schlägt die KI: Schmerzen werden immer eskaliert", async () => {
    const d = await runPrefilter("Mein Knie tut weh, ist das schlimm?", ctx, answering);
    expect(d.action).toBe("escalate");
    expect(d.answer).toBe("");
    expect(d.source).toBe("pflichtregel");
    expect(d.reason).toContain("Schmerzen");
  });

  it("KI-Fehler oder Ablehnung → eskalieren", async () => {
    const failing: Classifier = async () => {
      throw new Error("Netzwerk");
    };
    const d = await runPrefilter("Was ist ein EMOM?", ctx, failing);
    expect(d).toMatchObject({ action: "escalate", source: "fehler" });
  });

  it("ungültige KI-Ausgabe → eskalieren", async () => {
    const broken = (async () => ({ action: "vielleicht" })) as unknown as Classifier;
    expect((await runPrefilter("Hallo", ctx, broken)).action).toBe("escalate");
  });

  it("leere Antwort trotz answer → eskalieren", async () => {
    const empty: Classifier = async () => ({ action: "answer", answer: " ", reason: "?" });
    expect((await runPrefilter("Hallo", ctx, empty)).action).toBe("escalate");
  });

  it("System-Prompt enthält Pflichtregeln, editierbare Regeln, Wissensbasis, Profil und Plan", () => {
    const p = buildSystemPrompt(ctx);
    for (const s of ["Schmerzen", "Verletzungen", "Krankheitssymptome", "Medikamente", "Schwangerschaft", "Planänderung", "Pausen stehen im Plan", '{"label":"K01"}', '{"title":"Plan"}']) {
      expect(p).toContain(s);
    }
  });
});
