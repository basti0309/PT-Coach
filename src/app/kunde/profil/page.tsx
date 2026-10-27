import { ProfileSection } from "@/components/profile/profile-section";
import { StravaCard } from "@/components/strava-card";
import { requireClient } from "@/lib/auth";

export default async function KundeProfil({ searchParams }: PageProps<"/kunde/profil">) {
  const viewer = await requireClient();
  const { strava } = await searchParams;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="h1">Profil</h1>
        <form action="/auth/abmelden" method="post">
          <button className="btn-secondary btn-small">Abmelden</button>
        </form>
      </div>
      <StravaCard status={typeof strava === "string" ? strava : undefined} />
      <ProfileSection clientId={viewer.userId} isCoach={false} />
    </div>
  );
}
