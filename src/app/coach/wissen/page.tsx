import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { KnowledgeEntryRow } from "@/lib/db-types";
import { deleteKnowledgeEntry, saveKnowledgeEntry } from "./actions";

export const metadata = { title: "Wissensbasis" };

function EntryForm({ entry }: { entry?: KnowledgeEntryRow }) {
  return (
    <form action={saveKnowledgeEntry.bind(null, entry?.id ?? null)} className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-[10rem_1fr]">
        <select name="kind" className="input" defaultValue={entry?.kind ?? "faq"}>
          <option value="faq">FAQ</option>
          <option value="wissen">Wissen</option>
        </select>
        <input name="title" className="input" placeholder="Titel bzw. Frage" defaultValue={entry?.title} required />
      </div>
      <textarea name="content" className="input min-h-24" placeholder="Inhalt bzw. Antwort" defaultValue={entry?.content} required />
      <button className="btn-secondary btn-small">{entry ? "Speichern" : "Hinzufügen"}</button>
    </form>
  );
}

export default async function KnowledgePage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("knowledge_entries").select("*").order("kind").order("title");
  const entries = (data ?? []) as KnowledgeEntryRow[];
  return (
    <div className="space-y-4">
      <h1 className="h1">Wissensbasis & FAQ</h1>
      <p className="muted">
        Diese Einträge bekommt der KI-Vorfilter als Grundlage. Die KI beantwortet Kundenfragen nur, wenn die Antwort hier, im Plan oder
        im Profil eindeutig steht. Keine Strava-Daten, keine medizinischen Inhalte nötig – solche Fragen gehen immer an dich.
      </p>
      <section className="card space-y-2">
        <h2 className="h2">Neuer Eintrag</h2>
        <EntryForm />
      </section>
      {entries.map((e) => (
        <section key={e.id} className="card space-y-2">
          <EntryForm entry={e} />
          <form action={deleteKnowledgeEntry.bind(null, e.id)}>
            <button className="text-sm text-red-700 underline">Eintrag löschen</button>
          </form>
        </section>
      ))}
    </div>
  );
}
