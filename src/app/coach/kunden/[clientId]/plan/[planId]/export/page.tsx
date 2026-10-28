import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonExport, PromptBuilder } from "@/components/export-panel";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loadPlanWithVersion } from "@/lib/data/plans";
import { loadKnowledgeForExport, loadProfileExport, loadPromptTemplate } from "@/lib/data/profile";
import { buildExportFile, exportFileName } from "@/lib/export/profile";
import { planJsonSchema } from "@/lib/plan/schema";

export default async function ExportPlanPage({ params, searchParams }: PageProps<"/coach/kunden/[clientId]/plan/[planId]/export">) {
  const { clientId, planId } = await params;
  const { klarnamen } = await searchParams;
  const realNames = klarnamen === "1";
  const supabase = await createSupabaseServerClient();
  const data = await loadPlanWithVersion(supabase, planId);
  const profile = await loadProfileExport(supabase, clientId, !realNames);
  if (!data || !profile || data.plan.client_id !== clientId) notFound();

  const knowledge = await loadKnowledgeForExport(supabase);
  const file = buildExportFile(profile, data.version.content, new Date(), { knowledge });
  const json = JSON.stringify(file, null, 2);
  const base = `/coach/kunden/${clientId}/plan/${planId}/export`;

  return (
    <div className="space-y-4">
      <h2 className="h2">Export (Plan + Kundenprofil)</h2>
      <div className="card space-y-2">
        <p className="text-sm">
          {realNames ? (
            <>
              <strong>Mit Klarnamen.</strong> Der Name des Kunden steht in der Datei.{" "}
              <Link className="text-brand-700 underline" href={base}>
                Pseudonymisiert exportieren
              </Link>
            </>
          ) : (
            <>
              <strong>Pseudonymisiert:</strong> Kürzel „{profile.label}“ statt Name, keine E-Mail.{" "}
              <Link className="text-brand-700 underline" href={`${base}?klarnamen=1`}>
                Mit Klarnamen exportieren
              </Link>
            </>
          )}
        </p>
        <p className="muted">
          Enthalten: Profil, Testwert-Historie (nur manuell eingetragene Werte), Nährstoffziele, Kalorienbedarf, deine Wissensbasis ({knowledge.length} Einträge „Wissen“, ohne FAQ) und der Plan
          (Version {data.version.version}). Keine Strava-Daten. Freitexte (Notizen) werden unverändert übernommen – bitte keine
          Namen hineinschreiben, wenn du pseudonymisiert exportierst.
        </p>
        <JsonExport json={json} fileName={exportFileName(file, "plan")} />
      </div>
      <div className="card space-y-2">
        <h3 className="h2">KI ohne API</h3>
        <p className="muted">
          Prompt kopieren, in eine KI deiner Wahl einfügen, die Antwort (JSON) kopieren und unter{" "}
          <Link className="text-brand-700 underline" href={`/coach/kunden/${clientId}/plan/${planId}/import`}>
            Import
          </Link>{" "}
          einfügen. Vorlage: docs/ki-prompt-vorlage.md.
        </p>
        <PromptBuilder template={loadPromptTemplate()} schema={JSON.stringify(planJsonSchema(), null, 2)} exportJson={json} />
      </div>
    </div>
  );
}
