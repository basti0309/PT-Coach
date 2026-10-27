import { describe, expect, it } from "vitest";
import { newSessionId, slugify } from "./ids";

describe("IDs", () => {
  it("slugify mit Umlauten", () => {
    expect(slugify("Rumänisches Kreuzheben")).toBe("rumaenisches-kreuzheben");
    expect(slugify("  Klimmzüge (Band) ")).toBe("klimmzuege-band");
  });
  it("eindeutige Einheiten-ID", () => {
    expect(newSessionId(new Set(), 2, 3, "lauf")).toBe("w2d3-lauf");
    expect(newSessionId(new Set(["w2d3-lauf", "w2d3-lauf-2"]), 2, 3, "lauf")).toBe("w2d3-lauf-3");
  });
});
