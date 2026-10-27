import { ManualEndurance } from "@/components/training/manual-endurance";
import { requireClient } from "@/lib/auth";

export default async function KundeAusdauer({ searchParams }: PageProps<"/kunde/training/ausdauer">) {
  const viewer = await requireClient();
  const { log } = await searchParams;
  return <ManualEndurance clientId={viewer.userId} logId={typeof log === "string" ? log : undefined} base="/kunde/training" />;
}
