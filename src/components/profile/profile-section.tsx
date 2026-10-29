import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { extrasOf, loadProfileData } from "@/lib/data/profile";
import { authorLabel, loadNames } from "@/lib/data/names";
import { addTestResult, deleteTestResult, saveProfile } from "@/lib/actions/profile";
import { giveHealthConsent, saveHealth, withdrawHealthConsent } from "@/lib/actions/questionnaire";
import { ageOn, calorieNeed } from "@/lib/calc/calories";
import { buildExportFile, buildProfileExport, exportFileName, latestTest, TEST_KIND_LABELS } from "@/lib/export/profile";
import { env } from "@/lib/env";
import { formatDate, formatDateTime, formatDuration, formatNumber } from "@/lib/format";
import { appToday } from "@/lib/today";
import { TEST_KIND_META, TEST_KINDS } from "@/lib/plan/test-kinds";
import { JsonExport } from "@/components/export-panel";
import { ConsentCard } from "@/components/questionnaire/consent-card";
import { DerivedView } from "@/components/questionnaire/derived-view";
import { HealthForm } from "@/components/questionnaire/health-form";
import { ProfileForm } from "./profile-form";
import { TestForm } from "./test-form";

export async function ProfileSection({ clientId, isCoach }: { clientId: string; isCoach: boolean }) {
  const supabase = await createSupabaseServerClient();
  const data = await loadProfileData(supabase, clientId);
  if (!data) notFound();
  const { clientProfile: cp, tests } = data;
  const names = await loadNames(supabase, tests.map((t) => t.created_by));
  const weight = latestTest(tests, "body_weight");
  const today = appToday();
  const age = cp?.birth_date ? ageOn(cp.birth_date, today) : null;
  const calories =
    cp?.sex && age && cp.height_cm && weight?.value
      ? calorieNeed({ sex: cp.sex, weightKg: weight.value, heightCm: cp.height_cm, age, pal: cp.pal_factor })
      : null;
  const profileExport = buildProfileExport(data.profile, cp, tests, true, today, extrasOf(data));
  const exportFile = isCoach ? buildExportFile(profileExport, null) : null;

  return (
    <div className="space-y-4">
      <section className="card space-y-2">
        <h2 className="h2">Stand</h2>
        {profileExport.missing.length === 0 ? (
          <p className="text-sm text-green-700">✓ Alle Pflichtangaben vorhanden.</p>
        ) : (
          <>
            <p className="text-sm text-amber-700">{isCoach ? "Es fehlen noch:" : "Bitte ergänzen:"}</p>
            <ul className="list-disc pl-5 text-sm">
              {profileExport.missing.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </>
        )}
        {!isCoach && <p className="muted">Deine Angaben bestimmen Testwoche, Gewichte und Tempo in deinem Plan. Speichern geht jederzeit, auch unvollständig.</p>}
      </section>

      <ProfileForm profile={cp} answers={data.questionnaire?.answers ?? null} isCoach={isCoach} age={age} action={saveProfile.bind(null, clientId)} />

      <section className="card space-y-3">
        <h2 className="h2">Testwerte</h2>
        <p className="muted">
          Kraftwerte: ein Satz mit weniger als 10 Wiederholungen. RIR = wie viele Wiederholungen du noch geschafft hättest. Nur Sätze bis RIR 0 ergeben ein
          geschätztes Maximum; andere steuern die Gewichte über die Reserve.
        </p>
        <TestForm action={addTestResult.bind(null, clientId)} today={today} />
        {TEST_KINDS.map((kind) => {
          const list = tests.filter((t) => t.kind === kind);
          if (list.length === 0) return null;
          return (
            <div key={kind} className="space-y-1">
              <h3 className="text-sm font-semibold">{TEST_KIND_LABELS[kind]}</h3>
              <ul className="divide-y divide-slate-100 text-sm">
                {list.map((t) => (
                  <li key={t.id} className="flex flex-wrap items-center gap-2 py-1">
                    <span className="w-28 text-slate-500">{formatDate(t.tested_on, false)}</span>
                    <span className="font-semibold">
                      {t.value != null && TEST_KIND_META[t.kind].unit === "s" && formatDuration(t.value)}
                      {t.value != null && TEST_KIND_META[t.kind].unit === "kg" && `${formatNumber(t.value)} kg`}
                      {t.value != null && TEST_KIND_META[t.kind].unit === "m" && `${formatNumber(t.value, 0)} m`}
                      {t.value != null && TEST_KIND_META[t.kind].unit === "reps" && `${formatNumber(t.value, 0)} Wdh.`}
                      {t.reps != null && ` × ${t.reps} @ RIR ${t.rir}`}
                      {t.kind === "mobility" && t.scale != null && `Skala ${t.scale}/10`}
                    </span>
                    {t.note && <span className="text-slate-600">{t.note}</span>}
                    <span className="flex-1" />
                    <span className="text-xs text-slate-400">{authorLabel(names, t.created_by, "–")}</span>
                    <form action={deleteTestResult.bind(null, clientId, t.id)}>
                      <button className="text-xs text-red-700 underline">löschen</button>
                    </form>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
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

      <section className="card space-y-2">
        <h2 className="h2">Kalorienbedarf</h2>
        {calories ? (
          <>
            <p className="text-2xl font-bold">{formatNumber(Math.round(calories.total), 0)} kcal / Tag</p>
            <ol className="space-y-0.5 text-sm text-slate-600">
              {calories.steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
            <p className="muted">Gewicht vom {formatDate(weight!.tested_on)} (jüngster Eintrag).</p>
          </>
        ) : (
          <p className="muted">Für die Berechnung fehlen Geschlecht, Geburtsdatum, Größe oder ein Körpergewicht (Testwert).</p>
        )}
        {(cp?.protein_g != null || cp?.fat_g != null || cp?.carbs_g != null) && (
          <p className="text-sm">
            Nährstoffziele: Protein {cp?.protein_g ?? "–"} g · Fett {cp?.fat_g ?? "–"} g · Kohlenhydrate {cp?.carbs_g ?? "–"} g
          </p>
        )}
      </section>

      {isCoach && profileExport.derived && <DerivedView d={profileExport.derived} />}

      {exportFile && (
        <section className="card space-y-2">
          <h2 className="h2">Profil exportieren (JSON)</h2>
          <p className="muted">
            Pseudonymisiert (Kürzel statt Name), identisch zum Profil-Teil des Plan-Exports. Mit Klarnamen, Trainingsverlauf und Prompt:{" "}
            <Link href={`/coach/kunden/${clientId}/plan/neu`} className="text-brand-700 underline">
              Export & Prompt
            </Link>
            .
          </p>
          <JsonExport json={JSON.stringify(exportFile, null, 2)} fileName={exportFileName(exportFile, "profil")} />
        </section>
      )}
    </div>
  );
}
