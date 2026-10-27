import { describe, expect, it } from "vitest";
import { detectMandatoryEscalation } from "./safety";

describe("Pflicht-Eskalation (Stichworte)", () => {
  it.each([
    ["Mein Knie tut weh seit dem Lauf gestern", "Schmerzen"],
    ["Mein linkes Knie tut seit dem Lauf gestern weh", "Schmerzen"],
    ["Ich habe Schmerzen im unteren Rücken", "Schmerzen"],
    ["Bin umgeknickt, der Knöchel ist dick", "Verletzungen"],
    ["Ich glaube ich habe mir was gezerrt", "Verletzungen"],
    ["Ich hab leichtes Fieber, soll ich trotzdem laufen?", "Krankheitssymptome"],
    ["Mir ist beim Training schwindelig geworden", "Krankheitssymptome"],
    ["Darf ich Ibuprofen vor dem Training nehmen?", "Medikamente"],
    ["Ich bin schwanger – was muss ich ändern?", "Schwangerschaft"],
  ])("%s → %s", (text, topic) => {
    expect(detectMandatoryEscalation(text)?.topic).toBe(topic);
  });

  it.each(["Wann ist mein nächstes Lauftraining?", "Kann ich die Kniebeuge auch mit Kurzhanteln machen?", "Wie viel Protein soll ich essen?", "Hast du ein Rezept für Protein-Pancakes?", "Trainingsabbruch wegen Regen – nachholen?"])(
    "keine Pflicht-Eskalation: %s",
    (text) => {
      expect(detectMandatoryEscalation(text)).toBeNull();
    },
  );
});
