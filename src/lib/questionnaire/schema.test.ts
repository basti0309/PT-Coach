import { describe, expect, it } from "vitest";
import { answersSchema } from "./schema";

describe("Equipment im Fragebogen", () => {
  it("Listen zu Hause und im Gym werden angenommen", () => {
    const r = answersSchema.safeParse({ equipment: { home: ["kurzhanteln", "bikeerg_rolle"], gym: ["schlitten", "wallball_ziel"], gymNote: "2 Schlitten" } });
    expect(r.success).toBe(true);
  });
  it("Gym-Gerät in der Liste zu Hause und doppelte Einträge werden abgelehnt", () => {
    expect(answersSchema.safeParse({ equipment: { home: ["schlitten"], gym: [], gymNote: "" } }).success).toBe(false);
    expect(answersSchema.safeParse({ equipment: { home: ["skierg", "skierg"], gym: [], gymNote: "" } }).success).toBe(false);
  });
  it("alte Hyrox-Geräte (hyrox.equipment) gibt es nicht mehr", () => {
    const r = answersSchema.safeParse({ hyrox: { division: "men", results: [], equipment: { sled: true, skierg: true, rower: true, wallball: true } } });
    expect(r.success).toBe(false);
  });
});
