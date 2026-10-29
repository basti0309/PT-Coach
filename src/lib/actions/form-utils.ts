// Gemeinsame Bausteine der Profil-/Fragebogen-Actions (kein "use server": exportiert auch Schemas und Hilfsfunktionen).
import { z } from "zod";
import { parseDecimal } from "@/lib/format";

export function parsePayload(formData: FormData): unknown {
  try {
    return JSON.parse(String(formData.get("payload") ?? "{}"));
  } catch {
    return null;
  }
}

const optInt = (min: number, max: number) =>
  z.preprocess((v) => (v === "" || v == null ? null : Number(String(v).replace(",", "."))), z.number().int().min(min).max(max).nullable());
const optNum = (min: number, max: number) =>
  z.preprocess((v) => (v === "" || v == null ? null : parseDecimal(String(v))), z.number().min(min).max(max).nullable());

/** Stammdaten (client_profiles); Werte kommen als Formular-Strings. */
export const profileSchema = z.object({
  sex: z.preprocess((v) => (v === "" ? null : v), z.enum(["m", "w"]).nullable()),
  birth_date: z.preprocess((v) => (v === "" || v == null ? null : v), z.iso.date().refine((d) => d >= "1900-01-01" && d <= new Date().toISOString().slice(0, 10)).nullable()),
  height_cm: optNum(100, 250),
  equipment_home: z.string().max(2000),
  gym_access: z.preprocess((v) => (v === "ja" ? true : v === "nein" ? false : null), z.boolean().nullable()),
  training_days_per_week: optInt(1, 7),
  max_minutes_per_workout: optInt(10, 300),
  notes: z.string().max(5000),
  pal_factor: optNum(1, 2.5),
});

/** Nährstoffziele setzt nur der Coach (zusätzlich per Trigger in der Datenbank erzwungen). */
export const nutritionSchema = z.object({ protein_g: optInt(0, 1000), fat_g: optInt(0, 1000), carbs_g: optInt(0, 2000) });

const FIELD_LABELS: Record<string, string> = {
  sex: "Geschlecht",
  birth_date: "Geburtsdatum",
  height_cm: "Größe",
  equipment_home: "Equipment zu Hause (Freitext)",
  gym_access: "Gymzugang",
  training_days_per_week: "Trainingstage pro Woche",
  max_minutes_per_workout: "max. Zeit pro Einheit",
  notes: "Notizen",
  pal_factor: "Aktivitätsniveau (PAL)",
  goal: "Ziel",
  goalNote: "Ziel in eigenen Worten",
  weekdays: "Wochentage",
  events: "Termine",
  absences: "Ausfallzeiten",
  workActivity: "Beruf/Alltag",
  sportOften: "Sport 4–5×/Woche",
  volume: "Training der letzten 4 Wochen",
  mainSport: "Sportart",
  competedLast12Months: "Wettkampf letzte 12 Monate",
  competitionLevel: "Wettkampfniveau",
  hyrox: "Hyrox-Angaben",
  laufen: "Lauf-Angaben",
  equipment: "Equipment",
  liftExperienceMonths: "Erfahrung je Übung",
  weightGoal: "Zielgewicht",
  diet: "Ernährung",
  enduranceSports: "Ausdauersportarten",
  complaints: "Beschwerden",
  sleepHours: "Schlaf",
  hrMax: "maximale Herzfrequenz",
};

/** Fehlerstellen auf Deutsch: „Training der letzten 4 Wochen (Zeile 2)“ statt „volume.1.runKm“. */
export const issues = (paths: PropertyKey[][]) =>
  [
    ...new Set(
      paths.map((p) => {
        const head = FIELD_LABELS[String(p[0])] ?? String(p[0]);
        const row = p.find((x) => typeof x === "number");
        return row != null ? `${head} (Zeile ${Number(row) + 1})` : head;
      }),
    ),
  ].join(", ");
