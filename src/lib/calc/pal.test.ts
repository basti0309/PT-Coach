import { describe, expect, it } from "vitest";
import { suggestPal } from "./pal";

describe("PAL-Vorschlag nach DGE", () => {
  it("Büro ohne Sport: Untergrenze 1,4", () => {
    expect(suggestPal("sitzend", false).pal).toBe(1.4);
  });
  it("Büro mit Sport 4–5×/Woche: 1,4 + 0,3 = 1,7", () => {
    expect(suggestPal("sitzend", true).pal).toBe(1.7);
  });
  it("körperlich schwer mit Sport: 2,0 + 0,3 = 2,3", () => {
    expect(suggestPal("schwer", true).pal).toBe(2.3);
  });
});
