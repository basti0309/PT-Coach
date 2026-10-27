import { z } from "zod";
import { SPORTS } from "@/lib/calc/sport";

// Einzige Quelle der Wahrheit für das Plan-Format.
// docs/plan-schema.json wird daraus erzeugt (npm run schema:generate) – ein Test prüft die Gleichheit.

const id = z
  .string()
  .regex(/^[a-z0-9][a-z0-9_-]*$/)
  .max(64)
  .describe("Kennung aus Kleinbuchstaben, Ziffern, '-' oder '_' (z. B. 'w1d1-kraft').");

const text = (max: number) => z.string().min(1).max(max);

export const StrengthExerciseSchema = z
  .object({
    exerciseId: id.describe(
      "Übungs-ID. Gleiche Übung = gleiche ID über alle Pläne hinweg (z. B. 'kniebeuge'); daran werden die Werte vom letzten Mal erkannt.",
    ),
    name: text(120).describe("Anzeigename der Übung"),
    sets: z.int().min(1).max(20).describe("Anzahl Sätze"),
    reps: z.int().min(1).max(100).describe("Wiederholungen pro Satz"),
    targetWeightKg: z.number().min(0).max(1000).optional().describe("Zielgewicht in kg"),
    restSeconds: z.int().min(0).max(900).describe("Pause nach jedem Satz in Sekunden"),
    notes: z.string().max(500).optional(),
  })
  .strict();

export const StrengthSessionSchema = z
  .object({
    id: id.describe("Eindeutige ID der Einheit im ganzen Plan"),
    type: z.literal("strength"),
    title: text(120),
    notes: z.string().max(1000).optional(),
    exercises: z.array(StrengthExerciseSchema).min(1).max(30),
  })
  .strict()
  .describe("Krafteinheit");

export const WOD_TYPES = ["for_time", "amrap", "emom", "rft"] as const;

export const WodMovementSchema = z
  .object({
    name: text(120).describe("Bewegung, z. B. 'Burpees'"),
    reps: z.int().min(1).max(1000).optional(),
    weightKg: z.number().min(0).max(500).optional(),
    distanceM: z.number().min(0).max(100000).optional(),
    calories: z.int().min(1).max(1000).optional(),
    notes: z.string().max(300).optional(),
  })
  .strict();

export const WodSessionSchema = z
  .object({
    id: id.describe("Eindeutige ID der Einheit im ganzen Plan"),
    type: z.literal("wod"),
    wodId: id
      .optional()
      .describe("Optionale WOD-Kennung (z. B. 'cindy'). Gleiches WOD = gleiche wodId; daran wird das letzte Ergebnis erkannt."),
    name: text(120),
    wodType: z.enum(WOD_TYPES).describe("for_time = For Time, amrap = AMRAP, emom = EMOM, rft = Rounds for Time"),
    timeCapMinutes: z.number().min(1).max(180).optional(),
    durationMinutes: z.number().min(1).max(180).optional().describe("Dauer bei AMRAP/EMOM"),
    rounds: z.int().min(1).max(100).optional().describe("Runden bei Rounds for Time / EMOM"),
    movements: z.array(WodMovementSchema).min(1).max(30),
    notes: z.string().max(1000).optional().describe("Vorgaben, Skalierung"),
  })
  .strict()
  .describe("WOD");

export const EnduranceSessionSchema = z
  .object({
    id: id.describe("Eindeutige ID der Einheit im ganzen Plan"),
    type: z.literal("endurance"),
    sport: z.enum(SPORTS),
    durationMinutes: z.number().min(1).max(1440).optional(),
    distanceKm: z.number().min(0.1).max(1000).optional(),
    intensity: text(200).describe("z. B. 'locker (Zone 2)' oder '6 × 3 min zügig'"),
    description: z.string().max(1000).optional(),
  })
  .strict()
  .describe("Ausdauereinheit. Mindestens eines von durationMinutes oder distanceKm ist anzugeben.");

export const SessionSchema = z.discriminatedUnion("type", [
  StrengthSessionSchema,
  WodSessionSchema,
  EnduranceSessionSchema,
]);

export const PlanDaySchema = z
  .object({
    day: z.int().min(1).max(7).describe("Tag 1–7 der Planwoche (Tag 1 = Wochentag des startDate). Je Woche eindeutig."),
    title: z.string().max(120).optional(),
    sessions: z.array(SessionSchema).min(1).max(10),
  })
  .strict();

export const PlanWeekSchema = z
  .object({
    week: z.int().min(1).max(104).describe("Wochennummer ab 1, eindeutig"),
    focus: z.string().max(200).optional(),
    days: z.array(PlanDaySchema).max(7),
  })
  .strict();

export const PlanSchema = z
  .object({
    schemaVersion: z.literal(1),
    title: text(120),
    startDate: z.iso.date().describe("Erster Tag von Woche 1 (YYYY-MM-DD)"),
    goal: z.string().max(500).optional(),
    notes: z.string().max(2000).optional(),
    weeks: z.array(PlanWeekSchema).min(1).max(104),
  })
  .strict()
  .describe(
    "Trainingsplan PT-Coach. Zusatzregeln: Einheiten-IDs im ganzen Plan eindeutig, Wochennummern eindeutig, Tage je Woche eindeutig, Ausdauereinheiten mit Dauer und/oder Distanz.",
  );

export type PlanContent = z.infer<typeof PlanSchema>;
export type PlanWeek = z.infer<typeof PlanWeekSchema>;
export type PlanDay = z.infer<typeof PlanDaySchema>;
export type PlanSession = z.infer<typeof SessionSchema>;
export type StrengthSession = z.infer<typeof StrengthSessionSchema>;
export type StrengthExercise = z.infer<typeof StrengthExerciseSchema>;
export type WodSession = z.infer<typeof WodSessionSchema>;
export type WodMovement = z.infer<typeof WodMovementSchema>;
export type EnduranceSession = z.infer<typeof EnduranceSessionSchema>;
export type WodType = (typeof WOD_TYPES)[number];

export const WOD_TYPE_LABELS: Record<WodType, string> = {
  for_time: "For Time",
  amrap: "AMRAP",
  emom: "EMOM",
  rft: "Rounds for Time",
};

/** JSON Schema (Draft 2020-12) – Grundlage für docs/plan-schema.json. */
export function planJsonSchema() {
  return {
    $id: "https://pt-coach.app/schemas/plan-schema.json",
    title: "PT-Coach Trainingsplan",
    ...z.toJSONSchema(PlanSchema, { target: "draft-2020-12" }),
  };
}
