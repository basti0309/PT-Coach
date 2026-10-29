import { redirect } from "next/navigation";

// Fragebogen und Profil sind zusammengelegt; alte Links führen aufs Profil.
export default async function CoachFragebogen({ params }: PageProps<"/coach/kunden/[clientId]/fragebogen">) {
  const { clientId } = await params;
  redirect(`/coach/kunden/${clientId}/profil`);
}
