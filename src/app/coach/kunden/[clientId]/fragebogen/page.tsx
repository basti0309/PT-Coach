import { QuestionnaireSection } from "@/components/questionnaire/questionnaire-section";

export default async function CoachFragebogen({ params }: PageProps<"/coach/kunden/[clientId]/fragebogen">) {
  const { clientId } = await params;
  return <QuestionnaireSection clientId={clientId} isCoach />;
}
