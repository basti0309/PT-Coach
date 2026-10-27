// Leere Plan-Vorlage für "Neuer Plan mit KI": zeigt jede Struktur einmal, Inhalte sind Platzhalter.
import { addDays, parseIsoDate } from "@/lib/format";
import type { PlanContent } from "./schema";

/** Nächster Montag nach dem Datum (an einem Montag: eine Woche später) – Vorschlag für startDate. */
export function nextMonday(iso: string): string {
  const weekday = parseIsoDate(iso).getUTCDay(); // 0 = Sonntag, 1 = Montag
  return addDays(iso, ((8 - weekday) % 7) || 7);
}

export function planTemplate(startDate: string): PlanContent {
  return {
    schemaVersion: 1,
    title: "TITEL DES PLANS",
    startDate,
    goal: "ZIEL DES PLANS (optional)",
    notes: "ALLGEMEINE HINWEISE (optional)",
    weeks: [
      {
        week: 1,
        focus: "SCHWERPUNKT DER WOCHE (optional)",
        days: [
          {
            day: 1,
            title: "TITEL DES TAGES (optional)",
            notes: "HINWEIS ZUM TAG (optional)",
            sessions: [
              {
                id: "w1d1-am",
                type: "program",
                label: "AM",
                title: "TITEL DER EINHEIT",
                notes: "HINWEIS ZUR EINHEIT (optional)",
                blocks: [
                  {
                    key: "p1",
                    label: "P1",
                    name: "NAME DES BLOCKS",
                    details: "ABLAUF ZEILE 1\nABLAUF ZEILE 2",
                    coachNotes: "COACH-HINWEIS (optional)",
                    scoring: { type: "time" },
                  },
                  {
                    key: "p2",
                    label: "P2",
                    name: "NAME DES BLOCKS",
                    scoring: { type: "weight", rounds: 3 },
                    loads: [{ label: "WOFÜR DAS GEWICHT GILT", maleKg: 0, femaleKg: 0 }],
                  },
                ],
              },
              {
                id: "w1d1-pm",
                type: "endurance",
                label: "PM",
                sport: "laufen",
                durationMinutes: 30,
                intensity: "INTENSITÄT",
              },
            ],
          },
          { day: 7, title: "Ruhetag", notes: "HINWEIS ZUM RUHETAG (optional)", sessions: [] },
        ],
      },
    ],
  };
}
