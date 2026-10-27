import Link from "next/link";
import { HistoryList } from "@/components/training/history-list";
import { requireClient } from "@/lib/auth";

export default async function KundeTraining() {
  const viewer = await requireClient();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="h1">Training</h1>
        <Link href="/kunde/training/ausdauer" className="btn-primary btn-small">
          + Ausdauer
        </Link>
      </div>
      <p className="muted">Geplante Einheiten trägst du über „Heute“ oder „Plan“ ein.</p>
      <HistoryList clientId={viewer.userId} base="/kunde/training" />
    </div>
  );
}
