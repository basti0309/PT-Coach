import { ProgressSection } from "@/components/progress/progress-section";

export default async function CoachFortschritt({ params }: PageProps<"/coach/kunden/[clientId]/fortschritt">) {
  const { clientId } = await params;
  return <ProgressSection clientId={clientId} viewerIsClient={false} />;
}
