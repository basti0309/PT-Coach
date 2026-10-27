import { describe, expect, it } from "vitest";
import {
  addDays,
  daysBetween,
  formatDate,
  formatDuration,
  parseDecimal,
  parseDuration,
  suggestShortCode,
  todayIn,
} from "./format";

describe("Datumsfunktionen", () => {
  it("addDays über Monatsgrenze", () => {
    expect(addDays("2026-10-30", 3)).toBe("2026-11-02");
  });
  it("daysBetween", () => {
    expect(daysBetween("2026-10-26", "2026-11-02")).toBe(7);
  });
  it("formatDate mit Wochentag (27.10.2026 ist ein Dienstag)", () => {
    expect(formatDate("2026-10-27")).toBe("Di, 27.10.2026");
  });
  it("todayIn Zeitzone: 23:30 UTC ist in Berlin (Winterzeit, UTC+1) schon der nächste Tag", () => {
    expect(todayIn("Europe/Berlin", new Date("2026-11-01T23:30:00Z"))).toBe("2026-11-02");
  });
});

describe("Dauer", () => {
  it("formatiert Sekunden", () => {
    expect(formatDuration(1530)).toBe("25:30");
    expect(formatDuration(3909)).toBe("1:05:09");
  });
  it("parst mm:ss, h:mm:ss und reine Minuten", () => {
    expect(parseDuration("25:30")).toBe(1530);
    expect(parseDuration("1:05:09")).toBe(3909);
    expect(parseDuration("45")).toBe(2700);
    expect(parseDuration("12,5")).toBe(750);
    expect(parseDuration("1:75")).toBeNull();
    expect(parseDuration("abc")).toBeNull();
  });
});

describe("Zahlen", () => {
  it("akzeptiert Komma und Punkt", () => {
    expect(parseDecimal("57,5")).toBe(57.5);
    expect(parseDecimal("57.5")).toBe(57.5);
    expect(parseDecimal("")).toBeNull();
    expect(parseDecimal("5x")).toBeNull();
  });
  it("Kürzel aus Namen", () => {
    expect(suggestShortCode("Anna Beispiel")).toBe("AB");
    expect(suggestShortCode("Ömer Çelik")).toBe("OC");
  });
});
