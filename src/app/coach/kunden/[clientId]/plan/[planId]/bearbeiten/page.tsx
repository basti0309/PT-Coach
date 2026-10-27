import { notFound } from "next/navigation";
import { PlanEditor } from "@/components/plan-editor";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loadPlanWithVersion } from "@/lib/data/plans";
import { saveEditorVersion } from "../../actions";

export default async function EditPlanPage({ params }: PageProps<"/coach/kunden/[clientId]/plan/[planId]/bearbeiten">) {
  const { clientId, planId } = await params;
  const supabase = await createSupabaseServerClient();
  const data = await loadPlanWithVersion(supabase, planId);
  if (!data || data.plan.client_id !== clientId) notFound();
  return (
    <div className="space-y-3">
      <h2 className="h2">
        Plan bearbeiten <span className="muted">(aktuell Version {data.version.version})</span>
      </h2>
      <PlanEditor
        key={data.version.version}
        initial={data.version.content}
        save={saveEditorVersion.bind(null, clientId, planId)}
        backHref={`/coach/kunden/${clientId}/plan?plan=${planId}`}
      />
    </div>
  );
}
