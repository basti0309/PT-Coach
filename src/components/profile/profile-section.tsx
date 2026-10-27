import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loadProfileData } from "@/lib/data/profile";
import { authorLabel, loadNames } from "@/lib/data/names";
import { addTestResult, deleteTestResult, updateClientProfile } from "@/lib/actions/profile";
import { ageOn, calorieNeed } from "@/lib/calc/calories";
import { buildExportFile, buildProfileExport, exportFileName, latestTest, TEST_KIND_LABELS } from "@/lib/export/profile";
import { formatDate, formatDuration, formatNumber } from "@/lib/format";
import { appToday } from "@/lib/today";
import type { TestKind } from "@/lib/db-types";
import { JsonExport } from "@/components/export-panel";
import { ProfileForm } from "./profile-form";
import { TestForm } from "./test-form";

const KIND_ORDER: TestKind[] = ["run_5k", "squat_3rm", "bench_3rm", "deadlift_3rm", "body_weight", "mobility"];

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
  const exportFile = isCoach ? buildExportFile(buildProfileExport(data.profile, cp, tests, true, today), null) : null;

  return (
    <div className="space-y-4">
      <ProfileForm profile={cp} isCoach={isCoach} age={age} action={updateClientProfile.bind(null, clientId)} />

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

      <section className="card space-y-3">
        <h2 className="h2">Testwerte</h2>
        <TestForm action={addTestResult.bind(null, clientId)} today={today} />
        {KIND_ORDER.map((kind) => {
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
                      {t.kind === "run_5k" && t.value != null && formatDuration(t.value)}
                      {t.kind !== "run_5k" && t.kind !== "mobility" && t.value != null && `${formatNumber(t.value)} kg`}
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

      {exportFile && (
        <section className="card space-y-2">
          <h2 className="h2">Profil exportieren (JSON)</h2>
          <p className="muted">
            Pseudonymisiert (Kürzel statt Name), identisch zum Profil-Teil des Plan-Exports. Mit Klarnamen: über den Plan-Export.
          </p>
          <JsonExport json={JSON.stringify(exportFile, null, 2)} fileName={exportFileName(exportFile, "profil")} />
        </section>
      )}
    </div>
  );
}
