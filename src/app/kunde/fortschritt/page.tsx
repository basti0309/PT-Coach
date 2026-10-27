import { ProgressSection } from "@/components/progress/progress-section";
import { requireClient } from "@/lib/auth";

export default async function KundeFortschritt() {
  const viewer = await requireClient();
  return (
    <div className="space-y-4">
      <h1 className="h1">Fortschritt</h1>
      <ProgressSection clientId={viewer.userId} viewerIsClient />
    </div>
  );
}
