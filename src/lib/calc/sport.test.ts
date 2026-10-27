import { describe, expect, it } from "vitest";
import { mapStravaSport } from "./sport";

describe("Strava-Sportarten-Mapping", () => {
  it("Run/TrailRun/VirtualRun → laufen", () => {
    expect(mapStravaSport("Run")).toBe("laufen");
    expect(mapStravaSport("TrailRun")).toBe("laufen");
    expect(mapStravaSport("VirtualRun")).toBe("laufen");
  });
  it("Rad-Varianten → radfahren", () => {
    expect(mapStravaSport("GravelRide")).toBe("radfahren");
    expect(mapStravaSport("VirtualRide")).toBe("radfahren");
  });
  it("Unbekanntes → sonstiges", () => {
    expect(mapStravaSport("Yoga")).toBe("sonstiges");
  });
});
