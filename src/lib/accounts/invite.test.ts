import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { inviteCodeMatches } = await import("./invite");

describe("Einladungscode", () => {
  it("vergleicht ohne Groß/Klein und Leerzeichen", () => {
    expect(inviteCodeMatches("FIT2026X", " fit2026x ")).toBe(true);
    expect(inviteCodeMatches("FIT2026X", "FIT2026")).toBe(false);
    expect(inviteCodeMatches("FIT2026X", "FIT2026Y")).toBe(false);
  });
});
