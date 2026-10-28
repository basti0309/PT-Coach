import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonExport, NewPlanPromptBuilder } from "@/components/export-panel";
import { NewPlanImport } from "@/components/new-plan-import";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loadKnowledgeForExport, loadNewPlanPromptTemplate, loadProfileExport } from "@/lib/data/profile";
import { loadHistoryForExport } from "@/lib/data/training";
import { buildExportFile, exportFileName } from "@/lib/export/profile";
import { planJsonSchema } from "@/lib/plan/schema";
import { nextMonday, planTemplate } from "@/lib/plan/template";
import { appToday } from "@/lib/today";
import { createPlanFromImport } from "../actions";

/** Export & Prompt: Kundendaten (+ optional Trainingsverlauf) und Plan-Format exportieren, einfacher Prompt, Antwort hochladen. */
export default async function ExportPromptPage({ params, searchParams }: PageProps<"/coach/kunden/[clientId]/plan/neu">) {
  const { clientId } = await params;
  const { klarnamen, verlauf } = await searchParams;
  const realNames = klarnamen === "1";
  const withHistory = verlauf === "1";
  const supabase = await createSupabaseServerClient();
  const profile = await loadProfileExport(supabase, clientId, !realNames);
  if (!profile) notFound();
  const history = withHistory ? await loadHistoryForExport(supabase, clientId) : undefined;
  const knowledge = await loadKnowledgeForExport(supabase);

  const today = appToday();
  const file = buildExportFile(profile, planTemplate(nextMonday(today)), new Date(), { history, knowledge });
  const json = JSON.stringify(file, null, 2);
  const base = `/coach/kunden/${clientId}/plan`;
  const href = (k: boolean, v: boolean) => `${base}/neu?${new URLSearchParams({ ...(k ? { klarnamen: "1" } : {}), ...(v ? { verlauf: "1" } : {}) })}`;

  return (
    <div className="space-y-4">
      <div>
        <Link href={base} className="text-sm text-brand-700">
          ← zurück zu den Plänen
        </Link>
        <h2 className="h2">Export & Prompt</h2>
        <p className="muted">
          1. Daten wählen und Prompt kopieren → 2. in eine KI deiner Wahl einfügen → 3. Antwort (JSON) unten hochladen. Der neue Plan wird
          der aktive Plan des Kunden; sein Ziel übernimmt die App aus dem Fragebogen.
        </p>
      </div>

      <div className="card space-y-3">
        <h3 className="h2">1. Daten</h3>
        <p className="text-sm">
          Enthalten: Profil, Fragebogen (Ziel und Ziel in eigenen Worten), Testwerte, berechnete Werte mit Rechenweg, deine Wissensbasis ({knowledge.length} Einträge „Wissen“, ohne FAQ) und das Plan-Format.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link className={withHistory ? "btn-primary btn-small" : "btn-secondary btn-small"} href={href(realNames, !withHistory)}>
            {withHistory ? "✓ mit Trainingsverlauf" : "ohne Trainingsverlauf"}
          </Link>
          <Link className={realNames ? "btn-primary btn-small" : "btn-secondary btn-small"} href={href(!realNames, withHistory)}>
            {realNames ? "✓ mit Klarnamen" : `pseudonymisiert („${profile.label}“)`}
          </Link>
        </div>
        <p className="muted">
          Antippen schaltet um. Trainingsverlauf: {withHistory ? `${history?.length ?? 0} Einheiten` : "nicht enthalten"}; von Strava-Einheiten
          nur Datum, Sportart, Dauer und Erledigt-Status. Gesundheitsangaben nur mit Einwilligung des Kunden. Freitexte werden unverändert
          übernommen.
        </p>
        <JsonExport json={json} fileName={exportFileName(file, "export")} />
      </div>

      <div className="card space-y-2">
        <h3 className="h2">2. Prompt</h3>
        <NewPlanPromptBuilder template={loadNewPlanPromptTemplate()} schema={JSON.stringify(planJsonSchema(), null, 2)} vorlage={json} />
        <p className="muted">Der Prompt enthält die Daten oben, das Plan-Format und kurze Regeln. Vorlage: docs/ki-prompt-neuer-plan.md.</p>
      </div>

      <div className="card space-y-2">
        <h3 className="h2">3. Antwort hochladen</h3>
        <NewPlanImport create={createPlanFromImport.bind(null, clientId)} planBaseHref={base} today={today} />
      </div>
    </div>
  );
}
