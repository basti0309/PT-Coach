import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { extrasOf, loadProfileData } from "@/lib/data/profile";
import { addTestResult } from "@/lib/actions/profile";
import { giveHealthConsent, saveHealth, saveQuestionnaire, withdrawHealthConsent } from "@/lib/actions/questionnaire";
import { buildProfileExport } from "@/lib/export/profile";
import { formatDateTime } from "@/lib/format";
import { env } from "@/lib/env";
import { REPS_KINDS } from "@/lib/plan/test-kinds";
import { appToday } from "@/lib/today";
import { TestForm } from "@/components/profile/test-form";
import { ConsentCard } from "./consent-card";
import { DerivedView } from "./derived-view";
import { HealthForm } from "./health-form";
import { QuestionnaireForm } from "./questionnaire-form";

export async function QuestionnaireSection({ clientId, isCoach }: { clientId: string; isCoach: boolean }) {
  const supabase = await createSupabaseServerClient();
  const data = await loadProfileData(supabase, clientId);
  if (!data) notFound();
  const today = appToday();
  const exp = buildProfileExport(data.profile, data.clientProfile, data.tests, true, today, extrasOf(data));
  const answers = data.questionnaire?.answers ?? null;

  return (
    <div className="space-y-4">
      <section className="card space-y-2">
        <h2 className="h2">Stand</h2>
        {exp.missing.length === 0 ? (
          <p className="text-sm text-green-700">✓ Alle Pflichtangaben vorhanden.</p>
        ) : (
          <>
            <p className="text-sm text-amber-700">Es fehlen noch:</p>
            <ul className="list-disc pl-5 text-sm">
              {exp.missing.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </>
        )}
        <p className="muted">Stammdaten (Geschlecht, Geburtsdatum, Größe, Gym, Trainingstage, max. Zeit) und das Körpergewicht trägst du im Profil ein.</p>
      </section>

      <QuestionnaireForm initial={answers} gymAccess={data.clientProfile?.gym_access ?? null} action={saveQuestionnaire.bind(null, clientId)} />

      <section className="card space-y-3">
        <h2 className="h2">Kraftwerte (Gewicht × Wiederholungen)</h2>
        <p className="muted">
          Ein Satz mit weniger als 10 Wiederholungen. RIR = wie viele Wiederholungen du noch geschafft hättest. Nur Sätze bis RIR 0 ergeben ein
          geschätztes Maximum; andere steuern die Gewichte über die Reserve.
        </p>
        <TestForm action={addTestResult.bind(null, clientId)} today={today} kinds={REPS_KINDS} />
      </section>

      {data.consent ? (
        <>
          <section className="card space-y-2">
            <h2 className="h2">Einwilligung Gesundheitsdaten</h2>
            <p className="text-sm">
              ✓ Erteilt am {formatDateTime(data.consent.given_at, env.timeZone())} (Textversion {data.consent.consent_version}).
            </p>
            {!isCoach && (
              <form action={withdrawHealthConsent.bind(null, clientId)}>
                <button className="btn-danger btn-small">Einwilligung widerrufen und Gesundheitsangaben löschen</button>
              </form>
            )}
          </section>
          <HealthForm initial={data.health?.data ?? null} action={saveHealth.bind(null, clientId)} />
        </>
      ) : isCoach ? (
        <section className="card space-y-2">
          <h2 className="h2">Gesundheitsangaben</h2>
          <p className="muted">Keine Einwilligung des Kunden – Beschwerden, Schlaf und HFmax werden nicht gespeichert.</p>
        </section>
      ) : (
        <ConsentCard action={giveHealthConsent.bind(null, clientId)} />
      )}

      {isCoach && exp.derived && <DerivedView d={exp.derived} />}
    </div>
  );
}
