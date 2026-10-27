import { PlanView } from "@/components/plan-view";
import { requireClient } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loadActivePlan, loadSessionLogs } from "@/lib/data/plans";
import { appToday } from "@/lib/today";

export default async function KundePlan() {
  const viewer = await requireClient();
  const supabase = await createSupabaseServerClient();
  const active = await loadActivePlan(supabase, viewer.userId);
  if (!active) {
    return (
      <div className="space-y-2">
        <h1 className="h1">Plan</h1>
        <p className="muted">Dein Coach hat dir noch keinen Plan zugewiesen.</p>
      </div>
    );
  }
  const logs = await loadSessionLogs(supabase, viewer.userId, active.plan.id);
  return (
    <div className="space-y-4">
      <h1 className="h1">{active.version.content.title}</h1>
      <PlanView
        plan={active.version.content}
        statuses={new Map([...logs].map(([k, l]) => [k, { completed: l.completed, source: l.source }]))}
        today={appToday()}
        hrefFor={(item) => `/kunde/training/erfassen?plan=${active.plan.id}&einheit=${encodeURIComponent(item.session.id)}`}
      />
    </div>
  );
}
