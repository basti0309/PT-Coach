import { ManualEndurance } from "@/components/training/manual-endurance";

export default async function CoachAusdauer({ params, searchParams }: PageProps<"/coach/kunden/[clientId]/training/ausdauer">) {
  const { clientId } = await params;
  const { log } = await searchParams;
  return (
    <ManualEndurance
      clientId={clientId}
      logId={typeof log === "string" ? log : undefined}
      base={`/coach/kunden/${clientId}/training`}
    />
  );
}
