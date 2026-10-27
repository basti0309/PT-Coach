"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireClientAccess } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { parseDecimal, parseDuration } from "@/lib/format";

export interface FormState {
  ok?: string;
  error?: string;
}

function revalidate() {
  revalidatePath("/kunde", "layout");
  revalidatePath("/coach/kunden", "layout");
}

const optInt = (min: number, max: number) =>
  z.preprocess((v) => (v === "" || v == null ? null : Number(String(v).replace(",", "."))), z.number().int().min(min).max(max).nullable());
const optNum = (min: number, max: number) =>
  z.preprocess((v) => (v === "" || v == null ? null : parseDecimal(String(v))), z.number().min(min).max(max).nullable());

const profileSchema = z.object({
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

const nutritionSchema = z.object({ protein_g: optInt(0, 1000), fat_g: optInt(0, 1000), carbs_g: optInt(0, 2000) });

export async function updateClientProfile(clientId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireClientAccess(clientId);
  const raw = Object.fromEntries(formData.entries());
  const parsed = profileSchema.safeParse({ ...raw, equipment_home: raw.equipment_home ?? "", notes: raw.notes ?? "" });
  if (!parsed.success) return { error: `Bitte Eingaben prüfen: ${parsed.error.issues.map((i) => i.path.join(".")).join(", ")}` };
  const values: Record<string, unknown> = { ...parsed.data, pal_factor: parsed.data.pal_factor ?? 1.5 };
  if (viewer.role === "coach") {
    const n = nutritionSchema.safeParse(raw);
    if (!n.success) return { error: "Nährstoffziele bitte als ganze Zahlen in Gramm." };
    Object.assign(values, n.data);
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("client_profiles").upsert({ client_id: clientId, ...values }, { onConflict: "client_id" });
  if (error) return { error: `Speichern fehlgeschlagen: ${error.message}` };
  revalidate();
  return { ok: "Gespeichert." };
}

const testSchema = z.object({
  kind: z.enum(["run_5k", "bench_3rm", "deadlift_3rm", "squat_3rm", "mobility", "body_weight"]),
  tested_on: z.iso.date(),
});

export async function addTestResult(clientId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireClientAccess(clientId);
  const base = testSchema.safeParse({ kind: formData.get("kind"), tested_on: formData.get("tested_on") });
  if (!base.success) return { error: "Bitte Test und Datum angeben." };
  const { kind, tested_on } = base.data;
  const rawValue = String(formData.get("value") ?? "").trim();
  const note = String(formData.get("note") ?? "").slice(0, 1000);
  let value: number | null = null;
  let scale: number | null = null;
  if (kind === "run_5k") {
    value = parseDuration(rawValue);
    if (!value || value < 600) return { error: "5-km-Zeit bitte als mm:ss oder h:mm:ss, z. B. 26:30." };
  } else if (kind === "mobility") {
    const s = String(formData.get("scale") ?? "").trim();
    scale = s ? Number(s) : null;
    if (scale != null && !(Number.isInteger(scale) && scale >= 1 && scale <= 10)) return { error: "Skala 1–10." };
    if (scale == null && !note) return { error: "Bitte Freitext oder Skalenwert eintragen." };
  } else {
    value = parseDecimal(rawValue);
    if (value == null || value <= 0 || value > 500) return { error: "Bitte einen Wert in kg eingeben." };
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("test_results").insert({ client_id: clientId, kind, tested_on, value, scale, note });
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
