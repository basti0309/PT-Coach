import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { authorLabel, loadNames } from "@/lib/data/names";
import { lineDiff, planToText } from "@/lib/plan/diff";
import { formatDateTime } from "@/lib/format";
import { env } from "@/lib/env";
import type { PlanVersionRow } from "@/lib/db-types";
import { restorePlanVersion } from "../../actions";

const SOURCE_LABEL = { editor: "Editor", import: "Import", restore: "Wiederherstellung", seed: "Beispiel" } as const;

export default async function VersionsPage({ params, searchParams }: PageProps<"/coach/kunden/[clientId]/plan/[planId]/versionen">) {
  const { clientId, planId } = await params;
  const { v } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: plan } = await supabase.from("plans").select("*").eq("id", planId).maybeSingle();
  if (!plan || plan.client_id !== clientId) notFound();
  const { data } = await supabase.from("plan_versions").select("*").eq("plan_id", planId).order("version", { ascending: false });
  const versions = (data ?? []) as PlanVersionRow[];
  const names = await loadNames(supabase, versions.map((x) => x.created_by));
  const current = versions.find((x) => x.version === plan.current_version);
  const selected = versions.find((x) => String(x.version) === v);
  const base = `/coach/kunden/${clientId}/plan/${planId}/versionen`;

  return (
    <div className="space-y-4">
      <h2 className="h2">Versionen von „{plan.title}“</h2>
      <ul className="card divide-y divide-slate-100 p-0">
        {versions.map((ver) => (
          <li key={ver.id} className="flex flex-wrap items-center gap-2 p-3">
            <span className="font-semibold">Version {ver.version}</span>
            {ver.version === plan.current_version && <span className="badge bg-green-100 text-green-800">aktuell</span>}
            <span className="badge bg-slate-100 text-slate-700">{SOURCE_LABEL[ver.source]}</span>
            <span className="muted">
              {formatDateTime(ver.created_at, env.timeZone())} · {authorLabel(names, ver.created_by, "System")}
            </span>
            {ver.change_note && <span className="w-full text-sm text-slate-600">{ver.change_note}</span>}
            <span className="flex-1" />
            {ver.version !== plan.current_version && (
              <>
                <Link className="btn-secondary btn-small" href={`${base}?v=${ver.version}`}>
                  Unterschied ansehen
                </Link>
                <form action={restorePlanVersion.bind(null, clientId, planId, ver.version)}>
                  <button className="btn-secondary btn-small">Wiederherstellen</button>
                </form>
              </>
            )}
          </li>
        ))}
      </ul>
      {selected && current && (
        <div className="card space-y-2">
          <h3 className="h2">
            Version {selected.version} → aktuelle Version {current.version}
          </h3>
          <pre className="max-h-[60vh] overflow-auto rounded-lg bg-slate-50 p-2 text-xs leading-5">
            {lineDiff(planToText(selected.content), planToText(current.content)).map((l, i) => (
              <div
                key={i}
                className={l.type === "add" ? "bg-green-100 text-green-900" : l.type === "del" ? "bg-red-100 text-red-900" : "text-slate-500"}
              >
                {l.type === "add" ? "+ " : l.type === "del" ? "− " : "  "}
                {l.text}
              </div>
            ))}
          </pre>
          <p className="muted">Wiederherstellen legt eine neue Version mit dem alten Inhalt an – nichts geht verloren.</p>
        </div>
      )}
    </div>
  );
}
