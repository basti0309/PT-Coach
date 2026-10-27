import { StravaCard } from "@/components/strava-card";
import { requireClient } from "@/lib/auth";

export default async function KundeProfil({ searchParams }: PageProps<"/kunde/profil">) {
  await requireClient();
  const { strava } = await searchParams;
  return (
    <div className="space-y-4">
      <h1 className="h1">Profil</h1>
      <StravaCard status={typeof strava === "string" ? strava : undefined} />
    </div>
  );
}
