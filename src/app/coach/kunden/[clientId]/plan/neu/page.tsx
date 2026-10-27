import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonExport, NewPlanPromptBuilder } from "@/components/export-panel";
import { NewPlanImport } from "@/components/new-plan-import";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loadNewPlanPromptTemplate, loadProfileExport } from "@/lib/data/profile";
import { buildExportFile, exportFileName } from "@/lib/export/profile";
import { planJsonSchema } from "@/lib/plan/schema";
import { nextMonday, planTemplate } from "@/lib/plan/template";
import { appToday } from "@/lib/today";
import { createPlanFromImport } from "../actions";

export default async function NewPlanWithAiPage({ params, searchParams }: PageProps<"/coach/kunden/[clientId]/plan/neu">) {
  const { clientId } = await params;
  const { klarnamen } = await searchParams;
  const realNames = klarnamen === "1";
  const supabase = await createSupabaseServerClient();
  const profile = await loadProfileExport(supabase, clientId, !realNames);
  if (!profile) notFound();

  const today = appToday();
  const file = buildExportFile(profile, planTemplate(nextMonday(today)));
  const json = JSON.stringify(file, null, 2);
  const base = `/coach/kunden/${clientId}/plan`;

  return (
    <div className="space-y-4">
      <div>
        <Link href={base} className="text-sm text-brand-700">
          ← zurück zu den Plänen
        </Link>
        <h2 className="h2">Neuer Plan mit KI</h2>
        <p className="muted">
          1. Plan beschreiben und Prompt kopieren → 2. in eine KI deiner Wahl einfügen (z. B. Claude) → 3. Antwort (JSON) hier
          hochladen. Der neue Plan wird der aktive Plan des Kunden.
        </p>
      </div>

      <div className="card space-y-2">
        <h3 className="h2">1. Plan beschreiben</h3>
        <NewPlanPromptBuilder
          template={loadNewPlanPromptTemplate()}
          schema={JSON.stringify(planJsonSchema(), null, 2)}
          vorlage={json}
        />
        <p className="muted">Der Prompt enthält Regeln, das Plan-Schema und die leere Vorlage mit Kundenprofil. Vorlage: docs/ki-prompt-neuer-plan.md.</p>
      </div>

      <div className="card space-y-2">
        <h3 className="h2">Leere JSON-Vorlage</h3>
        <p className="text-sm">
          {realNames ? (
            <>
              <strong>Mit Klarnamen.</strong>{" "}
              <Link className="text-brand-700 underline" href={`${base}/neu`}>
                Pseudonymisiert
              </Link>
            </>
          ) : (
            <>
              <strong>Pseudonymisiert:</strong> Kürzel „{profile.label}“ statt Name, keine E-Mail.{" "}
              <Link className="text-brand-700 underline" href={`${base}/neu?klarnamen=1`}>
                Mit Klarnamen
              </Link>
            </>
          )}
        </p>
        <p className="muted">
          Kundenprofil und ein Plan-Gerüst, das jede Struktur einmal zeigt (Einheit mit Blöcken, Ausdauer, Ruhetag). Nur nötig, wenn du
          die Datei separat an die KI geben willst – im Prompt ist sie schon enthalten.
        </p>
        <JsonExport json={json} fileName={exportFileName(file, "vorlage")} />
      </div>

      <div className="card space-y-2">
        <h3 className="h2">2. Antwort der KI hochladen</h3>
        <NewPlanImport create={createPlanFromImport.bind(null, clientId)} planBaseHref={base} today={today} />
      </div>
    </div>
  );
}
