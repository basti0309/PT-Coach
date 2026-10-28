import Link from "next/link";
import { QuestionnaireSection } from "@/components/questionnaire/questionnaire-section";
import { requireClient } from "@/lib/auth";

export default async function KundeFragebogen() {
  const viewer = await requireClient();
  return (
    <div className="space-y-4">
      <div>
        <Link href="/kunde/profil" className="text-sm text-brand-700">
          ← Profil
        </Link>
        <h1 className="h1">Fragebogen</h1>
        <p className="muted">Deine Angaben bestimmen Testwoche, Gewichte und Tempo in deinem Plan. Speichern geht jederzeit, auch unvollständig.</p>
      </div>
      <QuestionnaireSection clientId={viewer.userId} isCoach={false} />
    </div>
  );
}
