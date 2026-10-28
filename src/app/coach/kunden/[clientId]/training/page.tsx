import Link from "next/link";
import { HistoryDelete } from "@/components/training/history-delete";
import { HistoryList } from "@/components/training/history-list";
import { deleteTrainingHistory } from "@/lib/actions/training";

export default async function CoachTraining({ params }: PageProps<"/coach/kunden/[clientId]/training">) {
  const { clientId } = await params;
  const base = `/coach/kunden/${clientId}/training`;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link href={`${base}/ausdauer`} className="btn-secondary btn-small">
          + Ausdauer (ungeplant) eintragen
        </Link>
        <Link href={`/coach/kunden/${clientId}/plan`} className="btn-secondary btn-small">
          Geplante Einheit eintragen (über den Plan)
        </Link>
      </div>
      <p className="muted">
        Von Strava-Einheiten siehst du nur Dauer und Erledigt-Status. Einträge zeigen, wer sie erfasst bzw. geändert hat.
      </p>
      <HistoryList clientId={clientId} base={base} />
      <HistoryDelete action={deleteTrainingHistory.bind(null, clientId)} />
    </div>
  );
}
