import { describe, expect, it } from "vitest";
import { aggregateEndurance, isoWeek, weekStart } from "./aggregate";

describe("Ausdauer-Aggregation", () => {
  it("Wochenbeginn und ISO-Woche", () => {
    expect(weekStart("2026-11-01")).toBe("2026-10-26"); // So → Mo davor
    expect(weekStart("2026-10-26")).toBe("2026-10-26");
    expect(isoWeek("2026-10-27")).toEqual({ year: 2026, week: 44 });
    expect(isoWeek("2027-01-01")).toEqual({ year: 2026, week: 53 }); // Fr 1.1.2027 gehört zu KW 53/2026
  });

  const entries = [
    { date: "2026-10-27", sport: "laufen", durationSeconds: 2400, distanceM: 8000 },
    { date: "2026-11-01", sport: "radfahren", durationSeconds: 3600, distanceM: 30000 },
    { date: "2026-11-02", sport: "laufen", durationSeconds: 1800, distanceM: null },
  ];

  it("je Woche: Minuten und km summiert", () => {
    expect(aggregateEndurance(entries, "week")).toEqual([
      { key: "2026-10-26", label: "KW 44/26", minutes: 100, km: 38 },
      { key: "2026-11-02", label: "KW 45/26", minutes: 30, km: 0 },
    ]);
  });

  it("je Monat und nach Sportart gefiltert", () => {
    expect(aggregateEndurance(entries, "month", "laufen")).toEqual([
      { key: "2026-10", label: "10/26", minutes: 40, km: 8 },
      { key: "2026-11", label: "11/26", minutes: 30, km: 0 },
    ]);
  });
});
