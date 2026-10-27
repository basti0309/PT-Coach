import { ProfileSection } from "@/components/profile/profile-section";

export default async function CoachProfil({ params }: PageProps<"/coach/kunden/[clientId]/profil">) {
  const { clientId } = await params;
  return <ProfileSection clientId={clientId} isCoach />;
}
