"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireClientAccess } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { parseDecimal, parseDuration } from "@/lib/format";
import { answersSchema } from "@/lib/questionnaire/schema";
import { issues, nutritionSchema, parsePayload, profileSchema } from "./form-utils";
import { isRepsKind, TEST_KIND_META, TEST_KINDS } from "@/lib/plan/test-kinds";

export interface FormState {
  ok?: string;
  error?: string;
}

function revalidate() {
  revalidatePath("/kunde", "layout");
  revalidatePath("/coach/kunden", "layout");
}

/**
 * Speichert das gemeinsame Profil-Formular: Stammdaten (client_profiles) und Fragebogen (client_questionnaires).
 * payload = { profile: Formular-Strings, answers: Answers }. Zwei Upserts über den Nutzer-Client (RLS);
 * schlägt der zweite fehl, sind die Stammdaten schon gespeichert – die Meldung sagt das.
 */
export async function saveProfile(clientId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireClientAccess(clientId);
  const payload = parsePayload(formData) as { profile?: Record<string, unknown>; answers?: unknown } | null;
  const raw = payload?.profile ?? {};
  const profile = profileSchema.safeParse({ ...raw, equipment_home: raw.equipment_home ?? "", notes: raw.notes ?? "" });
  const answers = answersSchema.safeParse(payload?.answers ?? {});
  const bad = [...(profile.success ? [] : profile.error.issues), ...(answers.success ? [] : answers.error.issues)];
  if (!profile.success || !answers.success) return { error: `Bitte Eingaben prüfen: ${issues(bad.map((i) => i.path))}` };
  const values: Record<string, unknown> = { ...profile.data, pal_factor: profile.data.pal_factor ?? 1.5 };
  if (viewer.role === "coach") {
    const n = nutritionSchema.safeParse(raw);
    if (!n.success) return { error: "Nährstoffziele bitte als ganze Zahlen in Gramm." };
    Object.assign(values, n.data);
  }
  const supabase = await createSupabaseServerClient();
  const p = await supabase.from("client_profiles").upsert({ client_id: clientId, ...values }, { onConflict: "client_id" });
  if (p.error) return { error: `Speichern fehlgeschlagen: ${p.error.message}` };
  const q = await supabase
    .from("client_questionnaires")
    .upsert({ client_id: clientId, goal: answers.data.goal ?? null, answers: answers.data }, { onConflict: "client_id" });
  revalidate();
  if (q.error) return { error: `Stammdaten gespeichert, übrige Angaben nicht: ${q.error.message}` };
  return { ok: "Gespeichert." };
}

const testSchema = z.object({
  kind: z.enum(TEST_KINDS),
  tested_on: z.iso.date(),
});

export async function addTestResult(clientId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireClientAccess(clientId);
  const base = testSchema.safeParse({ kind: formData.get("kind"), tested_on: formData.get("tested_on") });
  if (!base.success) return { error: "Bitte Test und Datum angeben." };
  const { kind, tested_on } = base.data;
  const rawValue = String(formData.get("value") ?? "").trim();
  const note = String(formData.get("note") ?? "").slice(0, 1000);
  const unit = TEST_KIND_META[kind].unit;
  let value: number | null = null;
  let scale: number | null = null;
  let reps: number | null = null;
  let rir: number | null = null;
  if (kind === "mobility") {
    const s = String(formData.get("scale") ?? "").trim();
    scale = s ? Number(s) : null;
    if (scale != null && !(Number.isInteger(scale) && scale >= 1 && scale <= 10)) return { error: "Skala 1–10." };
    if (scale == null && !note) return { error: "Bitte Freitext oder Skalenwert eintragen." };
  } else if (unit === "s") {
    value = parseDuration(rawValue);
    const min = kind === "run_5k" ? 600 : 60;
    if (!value || value < min) return { error: "Zeit bitte als mm:ss oder h:mm:ss, z. B. 26:30." };
  } else if (unit === "m") {
    value = parseDecimal(rawValue);
    if (value == null || value < 100 || value > 20000) return { error: "Bitte die Strecke in Metern eingeben, z. B. 6200." };
  } else if (unit === "reps") {
    value = parseDecimal(rawValue);
    if (value == null || !Number.isInteger(value) || value < 1 || value > 1000) return { error: "Bitte die Anzahl Wiederholungen eingeben." };
  } else {
    value = parseDecimal(rawValue);
    if (value == null || value <= 0 || value > 500) return { error: "Bitte einen Wert in kg eingeben." };
  }
  if (isRepsKind(kind)) {
    reps = Number(formData.get("reps"));
    rir = Number(formData.get("rir"));
    if (!Number.isInteger(reps) || reps < 1 || reps > 30) return { error: "Wiederholungen 1–30." };
    if (!Number.isInteger(rir) || rir < 0 || rir > 10) return { error: "Bitte die Wiederholungen in Reserve (RIR) wählen." };
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("test_results").insert({ client_id: clientId, kind, tested_on, value, scale, reps, rir, note });
  if (error) return { error: error.message };
  revalidate();
  return { ok: "Testwert gespeichert." };
}

export async function deleteTestResult(clientId: string, id: string): Promise<void> {
  await requireClientAccess(clientId);
  const supabase = await createSupabaseServerClient();
  await supabase.from("test_results").delete().eq("id", z.uuid().parse(id)).eq("client_id", clientId);
  revalidate();
}
