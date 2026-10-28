// Drei durchgespielte Testprofile (docs/TESTPROFILE.md). Alle Werte außer den drei vorgegebenen
// Angaben im Profil „Coach“ (68 kg, 5 km in 21:00, Hyrox 70:53) sind ANNAHMEN zum Testen.
import type { DeriveInput } from "./derive";

export const TESTPROFILE_TODAY = "2026-10-28";

export interface TestProfile {
  key: string;
  title: string;
  given: string[];
  assumptions: string[];
  input: DeriveInput;
}

export const TESTPROFILES: TestProfile[] = [
  {
    key: "einsteigerin",
    title: "Tier-0-Einsteigerin, Ziel Abnehmen",
    given: ["Tier 0", "Ziel Abnehmen"],
    assumptions: [
      "weiblich, geboren 15.06.1981 (45 Jahre), 165 cm, 92 kg",
      "Büro (DGE „sitzend“), kein Sport 4–5×/Woche, eingestellter PAL 1,4",
      "kein Gym, 3 Trainingstage à max. 45 min",
      "letzte 4 Wochen je 2 × 30 min Spazierengehen, kein Krafttraining, keine Wettkämpfe",
      "Einwilligung erteilt; Schlaf Ø 6,5 h, keine gemessene HFmax, Zielgewicht 80 kg",
    ],
    input: {
      sex: "w",
      birthDate: "1981-06-15",
      heightCm: 165,
      weightKg: 92,
      gymAccess: false,
      trainingDaysPerWeek: 3,
      maxMinutesPerWorkout: 45,
      palFactor: 1.4,
      answers: {
        goal: "abnehmen",
        weekdays: [1, 3, 5],
        events: [],
        absences: [],
        workActivity: "sitzend",
        sportOften: false,
        volume: Array.from({ length: 4 }, () => ({ enduranceSessions: 2, enduranceMinutes: 60, vigorousMinutes: 0, runKm: 0, strengthSessions: 0 })),
        mainSport: "",
        competedLast12Months: false,
        competitionLevel: "keins",
        weightGoal: { targetKg: 80, byDate: null },
        diet: { style: "omnivor", intolerances: "" },
        enduranceSports: ["gehen", "radfahren"],
      },
      health: {
        complaints: [],
        sleepHours: 6.5,
        hrMax: null,
      },
      tests: [{ kind: "body_weight", date: "2026-10-27", value: 92, reps: null, rir: null }],
      today: TESTPROFILE_TODAY,
    },
  },
  {
    key: "laeufer",
    title: "Läufer an der Grenze Tier 1/2",
    given: ["Läufer", "Tier 1/2"],
    assumptions: [
      "männlich, geboren 10.03.1992 (34 Jahre), 182 cm, 75 kg",
      "Büro, kein Sport 4–5×/Woche (nur 3 Läufe), eingestellter PAL 1,6",
      "kein Gym, 3 Trainingstage à max. 75 min",
      "letzte 4 Wochen je 3 Läufe, 180 min (davon 30 min intensiv), 25 km, kein Krafttraining",
      "10 km in 48:30 am 20.09.2026 (Volkslauf), Halbmarathon am 11.04.2027 geplant",
      "Einwilligung erteilt; Schlaf Ø 7,5 h",
    ],
    input: {
      sex: "m",
      birthDate: "1992-03-10",
      heightCm: 182,
      weightKg: 75,
      gymAccess: false,
      trainingDaysPerWeek: 3,
      maxMinutesPerWorkout: 75,
      palFactor: 1.6,
      answers: {
        goal: "laufen",
        weekdays: [2, 4, 6],
        events: [{ date: "2027-04-11", name: "Halbmarathon", kind: "lauf", detail: "21,1 km" }],
        absences: [],
        workActivity: "sitzend",
        sportOften: false,
        volume: Array.from({ length: 4 }, () => ({ enduranceSessions: 3, enduranceMinutes: 180, vigorousMinutes: 30, runKm: 25, strengthSessions: 0 })),
        mainSport: "Laufen",
        competedLast12Months: true,
        competitionLevel: "lokal",
        laufen: {
          bests: [{ distanceM: 10000, seconds: 2910, date: "2026-09-20", race: true }],
          longestRunMinutes: 75,
          targetRace: { distanceM: 21097.5, date: "2027-04-11", targetSeconds: null },
        },
      },
      health: {
        complaints: [],
        sleepHours: 7.5,
        hrMax: null,
      },
      tests: [{ kind: "body_weight", date: "2026-10-27", value: 75, reps: null, rir: null }],
      today: TESTPROFILE_TODAY,
    },
  },
  {
    key: "coach",
    title: "Profil des Coachs (Hyrox)",
    given: ["68 kg", "5 km in 21:00", "Hyrox 70:53"],
    assumptions: [
      "männlich, geboren 01.05.1991 (35 Jahre), 178 cm",
      "5 km am 04.10.2026; Hyrox Men (Open) am 18.04.2026, davon Laufzeit 38:00",
      "Büro, Sport 4–5×/Woche, eingestellter PAL 1,7; Gym mit Schlitten, SkiErg, Rudergerät, Wall Ball",
      "5 Trainingstage à max. 90 min; letzte 4 Wochen je 3 Ausdauereinheiten (200 min, davon 40 intensiv, 30 km) + 1 Krafteinheit",
      "Kreuzheben 120 kg × 3 und Bankdrücken 70 kg × 5, jeweils bis RIR 0 (10.10.2026); 24 Monate Erfahrung je Übung",
      "nächster Hyrox am 20.03.2027; Einwilligung erteilt; Schlaf Ø 7 h; keine HFmax",
    ],
    input: {
      sex: "m",
      birthDate: "1991-05-01",
      heightCm: 178,
      weightKg: 68,
      gymAccess: true,
      trainingDaysPerWeek: 5,
      maxMinutesPerWorkout: 90,
      palFactor: 1.7,
      answers: {
        goal: "hyrox",
        weekdays: [1, 2, 3, 5, 6],
        events: [{ date: "2027-03-20", name: "Hyrox", kind: "hyrox", detail: "Men (Open)" }],
        absences: [],
        workActivity: "sitzend",
        sportOften: true,
        volume: Array.from({ length: 4 }, () => ({ enduranceSessions: 3, enduranceMinutes: 200, vigorousMinutes: 40, runKm: 30, strengthSessions: 1 })),
        mainSport: "Hyrox",
        competedLast12Months: true,
        competitionLevel: "lokal",
        hyrox: {
          division: "men",
          results: [{ date: "2026-04-18", division: "men", totalSeconds: 4253, runSeconds: 2280 }],
          equipment: { sled: true, skierg: true, rower: true, wallball: true },
        },
        liftExperienceMonths: { squat: 24, bench: 24, deadlift: 24 },
      },
      health: {
        complaints: [],
        sleepHours: 7,
        hrMax: null,
      },
      tests: [
        { kind: "body_weight", date: "2026-10-28", value: 68, reps: null, rir: null },
        { kind: "run_5k", date: "2026-10-04", value: 1260, reps: null, rir: null },
        { kind: "deadlift_reps", date: "2026-10-10", value: 120, reps: 3, rir: 0 },
        { kind: "bench_reps", date: "2026-10-10", value: 70, reps: 5, rir: 0 },
      ],
      today: TESTPROFILE_TODAY,
    },
  },
];
