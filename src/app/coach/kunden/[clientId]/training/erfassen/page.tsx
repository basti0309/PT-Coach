import { notFound } from "next/navigation";
import { CaptureSession } from "@/components/training/capture";

export default async function CoachErfassen({ params, searchParams }: PageProps<"/coach/kunden/[clientId]/training/erfassen">) {
  const { clientId } = await params;
  const { plan, einheit } = await searchParams;
  if (typeof plan !== "string" || typeof einheit !== "string") notFound();
  return (
    <CaptureSession clientId={clientId} planId={plan} sessionId={einheit} backHref={`/coach/kunden/${clientId}/plan?plan=${plan}`} />
  );
}
