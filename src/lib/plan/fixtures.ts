// Gemeinsame Test-Pläne (nur für Tests).
import type { PlanContent } from "./schema";

export function samplePlan(): PlanContent {
  return {
    schemaVersion: 1,
    title: "Testplan",
    startDate: "2026-10-26", // Montag
    weeks: [
      {
        week: 1,
        days: [
          {
            day: 1,
            sessions: [
              {
                id: "w1d1-kraft",
                type: "strength",
                title: "Kraft",
                exercises: [{ exerciseId: "kniebeuge", name: "Kniebeuge", sets: 3, reps: 5, targetWeightKg: 80, restSeconds: 120 }],
              },
            ],
          },
          { day: 2, sessions: [{ id: "w1d2-lauf", type: "endurance", sport: "laufen", durationMinutes: 40, intensity: "locker" }] },
          { day: 4, sessions: [{ id: "w1d4-lauf", type: "endurance", sport: "laufen", distanceKm: 8, intensity: "locker" }] },
          { day: 5, sessions: [{ id: "w1d5-rad", type: "endurance", sport: "radfahren", durationMinutes: 60, intensity: "locker" }] },
          { day: 6, sessions: [{ id: "w1d6-lauf", type: "endurance", sport: "laufen", durationMinutes: 60, distanceKm: 10, intensity: "ruhig" }] },
        ],
      },
      {
        week: 2,
        days: [
          {
            day: 3,
            sessions: [
              {
                id: "w2d3-wod",
                type: "wod",
                name: "Cindy",
                wodId: "cindy",
                wodType: "amrap",
                durationMinutes: 20,
                movements: [
                  { name: "Klimmzüge", reps: 5 },
                  { name: "Liegestütze", reps: 10 },
                  { name: "Air Squats", reps: 15 },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
}

/** Plan mit Programm-Einheit (Blöcke) und Ruhetag. */
export function sampleProgramPlan(): PlanContent {
  return {
    schemaVersion: 1,
    title: "HYROX-Test",
    startDate: "2026-10-26", // Montag
    weeks: [
      {
        week: 1,
        days: [
          {
            day: 1,
            title: "Week 1 - Day 1",
            sessions: [
              {
                id: "w1d1-pm",
                type: "program",
                label: "PM",
                title: "PM SESSION – gym session",
                blocks: [
                  { key: "p1", label: "P1", name: "2k row warm up", scoring: { type: "time" } },
                  { key: "p2", label: "P2", name: "3x3 deadlift", scoring: { type: "weight", rounds: 3 } },
                  {
                    key: "p3",
                    label: "P3",
                    name: "10 minute AMRAP",
                    details: "10 box jump\n20 wall balls",
                    scoring: { type: "rounds" },
                    loads: [{ label: "Wall Ball", maleKg: 9.1, femaleKg: 6.4 }],
                  },
                ],
              },
            ],
          },
          { day: 7, title: "Rest Day!", sessions: [] },
        ],
      },
    ],
  };
}
