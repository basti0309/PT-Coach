"use server";

import { revalidatePath } from "next/cache";
import { requireClientAccess, requireViewer } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { answersSchema, CONSENT_VERSION, healthSchema } from "@/lib/questionnaire/schema";
import type { FormState } from "./profile";

// Alle Schreibzugriffe über den Nutzer-Client → RLS prüft zusätzlich.
// Gesundheitsangaben lassen sich nur mit aktiver Einwilligung speichern (Policy in der Datenbank).

function revalidate() {
  revalidatePath("/kunde", "layout");
  revalidatePath("/coach/kunden", "layout");
}

function parsePayload(formData: FormData): unknown {
  try {
    return JSON.parse(String(formData.get("payload") ?? "{}"));
  } catch {
    return null;
  }
}

const FIELD_LABELS: Record<string, string> = {
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
  liftExperienceMonths: "Erfahrung je Übung",
  weightGoal: "Zielgewicht",
  diet: "Ernährung",
  enduranceSports: "Ausdauersportarten",
  complaints: "Beschwerden",
  sleepHours: "Schlaf",
  hrMax: "maximale Herzfrequenz",
};

/** Fehlerstellen auf Deutsch: „Training der letzten 4 Wochen (Zeile 2)“ statt „volume.1.runKm“. */
const issues = (paths: PropertyKey[][]) =>
  [
    ...new Set(
      paths.map((p) => {
        const head = FIELD_LABELS[String(p[0])] ?? String(p[0]);
        const row = p.find((x) => typeof x === "number");
        return row != null ? `${head} (Zeile ${Number(row) + 1})` : head;
      }),
    ),
  ].join(", ");

export async function saveQuestionnaire(clientId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireClientAccess(clientId);
  const parsed = answersSchema.safeParse(parsePayload(formData));
  if (!parsed.success) return { error: `Bitte Eingaben prüfen: ${issues(parsed.error.issues.map((i) => i.path))}` };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("client_questionnaires")
    .upsert({ client_id: clientId, goal: parsed.data.goal ?? null, answers: parsed.data }, { onConflict: "client_id" });
  if (error) return { error: error.message };
  revalidate();
  return { ok: "Fragebogen gespeichert." };
}

export async function saveHealth(clientId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireClientAccess(clientId);
  const parsed = healthSchema.safeParse(parsePayload(formData));
  if (!parsed.success) return { error: `Bitte Eingaben prüfen: ${issues(parsed.error.issues.map((i) => i.path))}` };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("client_health").upsert({ client_id: clientId, data: parsed.data }, { onConflict: "client_id" });
  if (error) return { error: "Speichern nicht möglich – liegt die Einwilligung vor?" };
  revalidate();
  return { ok: "Gesundheitsangaben gespeichert." };
}

/** Nur der Kunde selbst kann einwilligen (auch die Datenbank lässt nur ihn zu). */
export async function giveHealthConsent(clientId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireViewer();
  if (viewer.userId !== clientId) return { error: "Nur der Kunde selbst kann einwilligen." };
  if (formData.get("confirm") !== "ja") return { error: "Bitte das Kästchen ankreuzen, um einzuwilligen." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("health_consents").insert({ client_id: clientId, consent_version: CONSENT_VERSION });
  if (error) return { error: error.message };
  revalidate();
  return { ok: "Einwilligung gespeichert." };
}

/** Widerruf: die Datenbank löscht dabei die Gesundheitsangaben (Trigger). */
export async function withdrawHealthConsent(clientId: string): Promise<void> {
  const viewer = await requireViewer();
  if (viewer.userId !== clientId) throw new Error("Nur der Kunde selbst kann widerrufen.");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("health_consents")
    .update({ withdrawn_at: new Date().toISOString() })
    .eq("client_id", clientId)
    .is("withdrawn_at", null);
  if (error) throw new Error(error.message);
  revalidate();
}
