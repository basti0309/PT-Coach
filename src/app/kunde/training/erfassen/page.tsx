import { notFound } from "next/navigation";
import { CaptureSession } from "@/components/training/capture";
import { requireClient } from "@/lib/auth";

export default async function KundeErfassen({ searchParams }: PageProps<"/kunde/training/erfassen">) {
  const viewer = await requireClient();
  const { plan, einheit } = await searchParams;
  if (typeof plan !== "string" || typeof einheit !== "string") notFound();
  return <CaptureSession clientId={viewer.userId} planId={plan} sessionId={einheit} backHref="/kunde" />;
}
