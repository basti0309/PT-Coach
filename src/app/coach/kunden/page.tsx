import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import type { ClientHealthRow, ClientProfileRow, QuestionnaireRow, TestKind } from "@/lib/db-types";
import { missingAnswers } from "@/lib/questionnaire/completeness";

export default async function ClientsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: clients } = await supabase
    .from("profiles")
    .select("id, full_name, short_code, email")
    .eq("role", "client")
    .order("full_name");
  const { data: lastLogs } = await supabase
    .from("workout_logs")
    .select("client_id, performed_on")
    .eq("completed", true)
    .order("performed_on", { ascending: false })
    .limit(500);
  const last = new Map<string, string>();
  for (const l of lastLogs ?? []) if (!last.has(l.client_id)) last.set(l.client_id, l.performed_on);

  // Fragebogen-Status: wenige Sammelabfragen statt einer je Kunde
  const [{ data: cps }, { data: qs }, { data: consents }, { data: healths }, { data: kinds }] = await Promise.all([
    supabase.from("client_profiles").select("*"),
    supabase.from("client_questionnaires").select("*"),
    supabase.from("health_consents").select("client_id").is("withdrawn_at", null),
    supabase.from("client_health").select("*"),
    supabase.from("test_results").select("client_id, kind"),
  ]);
  const missing = new Map<string, string[]>();
  for (const c of clients ?? []) {
    const cp = ((cps ?? []) as ClientProfileRow[]).find((x) => x.client_id === c.id) ?? null;
    const q = ((qs ?? []) as QuestionnaireRow[]).find((x) => x.client_id === c.id) ?? null;
    const consent = (consents ?? []).some((x) => x.client_id === c.id);
    const health = consent ? (((healths ?? []) as ClientHealthRow[]).find((x) => x.client_id === c.id)?.data ?? null) : null;
    missing.set(
      c.id,
      missingAnswers({
        sex: cp?.sex ?? null,
        birthDate: cp?.birth_date ?? null,
        heightCm: cp?.height_cm ?? null,
        gymAccess: cp?.gym_access ?? null,
        trainingDaysPerWeek: cp?.training_days_per_week ?? null,
        maxMinutesPerWorkout: cp?.max_minutes_per_workout ?? null,
        testKinds: (kinds ?? []).filter((k) => k.client_id === c.id).map((k) => k.kind as TestKind),
        answers: q?.answers ?? null,
        hasConsent: consent,
        health,
      }),
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="h1">Kunden</h1>
        <Link href="/coach/kunden/neu" className="btn-primary">
          + Kunde
        </Link>
      </div>
      {(clients ?? []).length === 0 && <p className="muted">Noch keine Kunden angelegt.</p>}
      <ul className="grid gap-3 sm:grid-cols-2">
        {(clients ?? []).map((c) => (
          <li key={c.id}>
            <Link href={`/coach/kunden/${c.id}`} className="card block hover:border-brand-500">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{c.full_name}</span>
                <span className="badge bg-slate-100 text-slate-700">{c.short_code}</span>
              </div>
              <p className="muted">{c.email}</p>
              <p className="muted">
                Letztes Training: {last.has(c.id) ? formatDate(last.get(c.id)!) : "–"}
              </p>
              {missing.get(c.id)!.length === 0 ? (
                <p className="text-sm text-green-700">✓ Fragebogen vollständig</p>
              ) : (
                <p className="text-sm text-amber-700">Fragebogen: {missing.get(c.id)!.length} Angaben fehlen</p>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
