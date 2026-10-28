// Kunden-Fragebogen: einzige Quelle der Wahrheit für die gespeicherten Antworten
// (client_questionnaires.answers) und die Gesundheitsangaben (client_health.data).
// Jede Frage steuert eine Planentscheidung – siehe docs/FRAGEBOGEN.md.
import { z } from "zod";
import { SPORTS } from "@/lib/calc/sport";

export const GOALS = ["hyrox", "laufen", "kraft_muskelaufbau", "abnehmen", "fitness_gesundheit"] as const;
export type Goal = (typeof GOALS)[number];
export const GOAL_LABELS: Record<Goal, string> = {
  hyrox: "Hyrox",
  laufen: "Laufen",
  kraft_muskelaufbau: "Kraft / Muskelaufbau",
  abnehmen: "Abnehmen",
  fitness_gesundheit: "Allgemeine Fitness / Gesundheit",
};

export const COMPETITION_LEVELS = ["keins", "lokal", "regional", "national", "international"] as const;
export type CompetitionLevel = (typeof COMPETITION_LEVELS)[number];
export const COMPETITION_LEVEL_LABELS: Record<CompetitionLevel, string> = {
  keins: "kein Wettkampf",
  lokal: "lokal (z. B. Stadtlauf, Hyrox als Hobby-Starter)",
  regional: "regional / Landesebene",
  national: "national (Deutsche Meisterschaft, Bundesliga)",
  international: "international",
};

/** Berufliche/alltägliche Aktivität nach DGE-Tabelle (siehe src/lib/calc/pal.ts). */
export const WORK_ACTIVITIES = ["liegend", "sitzend", "sitzend_gehend", "gehend_stehend", "schwer"] as const;
export type WorkActivity = (typeof WORK_ACTIVITIES)[number];

export const HYROX_DIVISIONS = [
  "women",
  "women_pro",
  "men",
  "men_pro",
  "doubles_women",
  "doubles_women_pro",
  "doubles_men",
  "doubles_men_pro",
  "doubles_mixed",
] as const;
export type HyroxDivision = (typeof HYROX_DIVISIONS)[number];

export const LIFTS = ["squat", "bench", "deadlift"] as const;
export type Lift = (typeof LIFTS)[number];
export const LIFT_LABELS: Record<Lift, string> = { squat: "Kniebeuge", bench: "Bankdrücken", deadlift: "Kreuzheben" };

export const DIET_STYLES = ["omnivor", "vegetarisch", "vegan", "sonstiges"] as const;
export const ABSENCE_OPTIONS = ["keine", "koerpergewicht", "hotel_gym"] as const;
export const EVENT_KINDS = ["hyrox", "lauf", "sonstiges"] as const;
export const BODY_REGIONS = [
  "nacken",
  "schulter",
  "ellenbogen",
  "hand",
  "oberer_ruecken",
  "unterer_ruecken",
  "huefte",
  "knie",
  "sprunggelenk_fuss",
  "sonstiges",
] as const;
export const BODY_REGION_LABELS: Record<(typeof BODY_REGIONS)[number], string> = {
  nacken: "Nacken",
  schulter: "Schulter",
  ellenbogen: "Ellenbogen",
  hand: "Hand/Handgelenk",
  oberer_ruecken: "oberer Rücken",
  unterer_ruecken: "unterer Rücken",
  huefte: "Hüfte",
  knie: "Knie",
  sprunggelenk_fuss: "Sprunggelenk/Fuß",
  sonstiges: "Sonstiges",
};

const isoDate = z.iso.date();
const int = (min: number, max: number) => z.number().int().min(min).max(max);

export const weekVolumeSchema = z
  .object({
    /** Ausdauer-/Bewegungseinheiten mit mindestens mittlerer Anstrengung */
    enduranceSessions: int(0, 21),
    enduranceMinutes: int(0, 3000),
    /** davon Minuten mit hoher Anstrengung (Sprechen nur noch in Wortfetzen) */
    vigorousMinutes: int(0, 3000),
    runKm: z.number().min(0).max(500),
    strengthSessions: int(0, 14),
  })
  .strict()
  .refine((w) => w.vigorousMinutes <= w.enduranceMinutes, { message: "hohe Anstrengung > Gesamtminuten", path: ["vigorousMinutes"] });
export type WeekVolume = z.infer<typeof weekVolumeSchema>;

export const raceResultSchema = z
  .object({ distanceM: z.number().min(400).max(100000), seconds: z.number().min(60).max(86400), date: isoDate, race: z.boolean() })
  .strict();

export const hyroxResultSchema = z
  .object({
    date: isoDate,
    division: z.enum(HYROX_DIVISIONS),
    totalSeconds: z.number().min(1800).max(14400),
    /** Summe der 8 Laufabschnitte laut Ergebnisliste, optional */
    runSeconds: z.number().min(600).max(10800).nullable(),
  })
  .strict();

export const answersSchema = z
  .object({
    goal: z.enum(GOALS),
    /** mögliche Trainingstage, 1 = Montag … 7 = Sonntag */
    weekdays: z.array(int(1, 7)).max(7),
    events: z
      .array(z.object({ date: isoDate, name: z.string().max(100), kind: z.enum(EVENT_KINDS), detail: z.string().max(100) }).strict())
      .max(10),
    absences: z.array(z.object({ from: isoDate, to: isoDate, option: z.enum(ABSENCE_OPTIONS) }).strict()).max(20),
    workActivity: z.enum(WORK_ACTIVITIES),
    /** Sport oder anstrengende Freizeitaktivität 4–5× pro Woche à 30–60 min (DGE-Zuschlag) */
    sportOften: z.boolean(),
    /** letzte 4 Wochen, Index 0 = letzte Woche */
    volume: z.array(weekVolumeSchema).length(4),
    mainSport: z.string().max(60),
    competedLast12Months: z.boolean(),
    competitionLevel: z.enum(COMPETITION_LEVELS),
    hyrox: z
      .object({
        division: z.enum(HYROX_DIVISIONS),
        results: z.array(hyroxResultSchema).max(10),
        equipment: z.object({ sled: z.boolean(), skierg: z.boolean(), rower: z.boolean(), wallball: z.boolean() }).strict(),
      })
      .strict(),
    laufen: z
      .object({
        bests: z.array(raceResultSchema).max(10),
        longestRunMinutes: int(0, 600),
        targetRace: z
          .object({ distanceM: z.number().min(400).max(100000), date: isoDate, targetSeconds: z.number().min(60).max(86400).nullable() })
          .strict()
          .nullable(),
      })
      .strict(),
    /** Monate regelmäßiger Erfahrung je Übung (für die 3RM-Freigabe) */
    liftExperienceMonths: z.object({ squat: int(0, 600), bench: int(0, 600), deadlift: int(0, 600) }).strict(),
    weightGoal: z.object({ targetKg: z.number().min(30).max(300).nullable(), byDate: isoDate.nullable() }).strict(),
    diet: z.object({ style: z.enum(DIET_STYLES), intolerances: z.string().max(300) }).strict(),
    enduranceSports: z.array(z.enum(SPORTS)).max(SPORTS.length),
  })
  .partial()
  .strict();
export type Answers = z.infer<typeof answersSchema>;

export const healthSchema = z
  .object({
    /** Ergebnis des offiziellen PAR-Q+ (nur verlinkt, nicht nachgebaut) */
    parq: z.object({ date: isoDate, result: z.enum(["alle_nein", "mind_ein_ja"]) }).strict().nullable(),
    /** Datum der ärztlichen Abklärung / Freigabe */
    medicalClearance: z.object({ date: isoDate }).strict().nullable(),
    /** ACSM-Screening nach Riebe et al. 2015 */
    acsm: z.object({ regularlyActive: z.boolean(), knownDisease: z.boolean(), symptoms: z.boolean() }).strict().nullable(),
    complaints: z
      .array(
        z
          .object({
            region: z.enum(BODY_REGIONS),
            since: z.string().max(40),
            painInTraining: z.boolean(),
            clarified: z.boolean(),
            triggers: z.string().max(200),
          })
          .strict(),
      )
      .max(10),
    sleepHours: z.number().min(2).max(14).nullable(),
    /** gemessene maximale Herzfrequenz (keine Schätzformel) */
    hrMax: int(100, 230).nullable(),
  })
  .partial()
  .strict();
export type Health = z.infer<typeof healthSchema>;

/** Version des Einwilligungstexts; wird mit jeder Einwilligung gespeichert (Nachweis nach Art. 7 Abs. 1 DSGVO). Bei Textänderung erhöhen. */
export const CONSENT_VERSION = "2026-10-28";
export const CONSENT_TEXT = [
  "Ich willige ausdrücklich ein, dass meine Gesundheitsangaben aus diesem Fragebogen (PAR-Q+-Ergebnis, ärztliche Abklärung, Vorerkrankungen und Symptome nach dem ACSM-Screening, Beschwerden, Schlaf, maximale Herzfrequenz) gespeichert und für meine Trainingsplanung verarbeitet werden (Art. 9 Abs. 2 lit. a DSGVO).",
  "Mein Coach sieht diese Angaben. Für die Planerstellung können sie ohne meinen Namen (mit Kürzel) an einen KI-Dienst übergeben werden. Im Chat mit der KI werden sie nicht verwendet.",
  "Die Einwilligung ist freiwillig. Ohne sie nutze ich die App weiter; mein Coach plant dann ohne Gesundheitsangaben und ohne Maximaltests.",
  "Ich kann die Einwilligung jederzeit hier im Profil widerrufen. Dann werden die Gesundheitsangaben gelöscht; die Verarbeitung bis zum Widerruf bleibt rechtmäßig.",
];
