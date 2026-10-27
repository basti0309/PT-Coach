import { notFound } from "next/navigation";
import { PlanImport } from "@/components/plan-import";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loadPlanWithVersion } from "@/lib/data/plans";
import { saveImportedVersion } from "../../actions";

export default async function ImportPlanPage({ params }: PageProps<"/coach/kunden/[clientId]/plan/[planId]/import">) {
  const { clientId, planId } = await params;
  const supabase = await createSupabaseServerClient();
  const data = await loadPlanWithVersion(supabase, planId);
  if (!data || data.plan.client_id !== clientId) notFound();
  return (
    <div className="space-y-3">
      <h2 className="h2">Plan importieren</h2>
      <p className="muted">
        Der Text wird gegen das Plan-Schema geprüft. Erst nach deiner Bestätigung entsteht eine neue Version (aktuell: Version{" "}
        {data.version.version}); ältere Versionen bleiben wiederherstellbar.
      </p>
      <PlanImport
        current={data.version.content}
        save={saveImportedVersion.bind(null, clientId, planId)}
        doneHref={`/coach/kunden/${clientId}/plan?plan=${planId}`}
      />
    </div>
  );
}
