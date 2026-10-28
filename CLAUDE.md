# PT-Coach – Konventionen für die Arbeit an diesem Repo

Coach-Interface für Personal Training: ein Coach, viele Kunden. Kunden nutzen die App mobil (PWA) im Gym.
Fachliche Spezifikation: `docs/SPEC.md`. Getroffene Annahmen: `docs/ANNAHMEN.md`. Setup für die Betreiberin: `README_SETUP.md`.

Siehe auch `AGENTS.md` (Hinweis von Next.js: Version 16.4 weicht von älterem Wissen ab – Doku unter `node_modules/next/dist/docs/`).

## Stack
- Next.js 16 (App Router, `src/app`), TypeScript strict, Tailwind CSS 4, React 19
- Supabase: Postgres + Auth (Magic Link / Code) + Row Level Security + Realtime (Chat)
- Zod 4 (Validierung, einzige Quelle der Wahrheit für das Plan-Schema), Recharts (Graphen), Vitest (Tests)
- Claude API über `@anthropic-ai/sdk` (nur serverseitig, `ANTHROPIC_API_KEY`)
- `cacheComponents` ist bewusst **nicht** aktiviert (klassisches dynamisches Rendering).

## Grundregeln
- **Keine lokale Installation bei der Betreiberin voraussetzen.** Alles Einmalige bekommt einen Button im Coach-Bereich (`/coach/einrichtung`) oder eine Anleitung im Supabase-/Vercel-Dashboard (`README_SETUP.md`).
- **Oberfläche komplett auf Deutsch.** Code, Bezeichner und DB-Spalten auf Englisch; fachliche Enum-Werte (z. B. Sportarten `laufen`) auf Deutsch, wo sie der Coach im JSON sieht.
- **Mobil zuerst:** große Tap-Flächen (min. 44 px), Zahlenfelder mit `inputMode="decimal"`, keine Hover-only-Bedienung.
- **Sicherheit in der Datenbank, nicht im Frontend.** Jede Tabelle hat RLS. Der Browser-/User-Client (`createSupabaseServerClient`) ist der Normalfall; der Service-Role-Client (`createSupabaseAdminClient`) nur für: Konto-/Profilanlage, Strava-Tokens/Webhook, Einfügen von Kundennachrichten + KI-Antworten. Jede Nutzung des Admin-Clients prüft vorher selbst die Berechtigung.
- **Strava-Werte** (Distanz, Herzfrequenz, Abweichungen, darauf basierende Graphen/Prognosen) liegen ausschließlich in `strava_activities` (RLS: nur der Kunde selbst). In `workout_logs` stehen für Strava-Einheiten nur Dauer, Datum, Sportart-Kategorie, Erledigt-Status (DB-Constraint erzwingt das, auch: keine Session-RPE). Strava-Werte nie in KI-Kontext oder JSON-Export.
- **Gesundheitsdaten** (Beschwerden, Schlaf, HFmax) nur in `client_health`, lesbar/schreibbar nur bei aktiver Einwilligung in `health_consents` (RLS). Einwilligen/Widerrufen kann nur der Kunde selbst; der Widerruf löscht die Daten (Trigger). Gesundheitsdaten nie in den Chat-Kontext, nur in den Plan-/Profil-Export.
- **Kein „KI“ im Kundenkonto** – einzige Ausnahme ist die Kennzeichnung automatischer Antworten im Chat (Transparenz). `src/lib/no-ki-client.test.ts` prüft das.
- **Löschen:** Pläne löscht der Coach (Versionen per Cascade, Trainings bleiben ohne Plan-Bezug). Den Trainingsverlauf (auch Strava-Einträge) löscht der Coach nur über die Datenbankfunktion `delete_training_history` (prüft die Rolle selbst), nie über den Admin-Client.
- **Plan-Ziel:** `plan.goal` setzt nie die KI; beim Import übernimmt die App das Ziel aus dem Fragebogen (`src/lib/plan/goal.ts`).
- **Fragebogen und Regelwerk:** `docs/FRAGEBOGEN.md`, `docs/REGELWERK.md`. Jede Frage steuert eine Planentscheidung; jede Rechenregel hat eine Quelle oder steht als Festlegung in `docs/ANNAHMEN.md`. `docs/TESTPROFILE.md` nach Änderungen an Regeln mit `npm run testprofile:generate` neu erzeugen.
- **Berechnungen sind reine Funktionen** unter `src/lib/calc/` bzw. `src/lib/plan/` mit Vitest-Tests gegen von Hand nachgerechnete Beispiele (Rechenweg als Kommentar im Test).
- Keine Features über `docs/SPEC.md` hinaus.

## Struktur
- `src/app/login` Login, `src/app/auth/*` Bestätigungs-Routen
- `src/app/kunde/*` Kundenbereich, `src/app/coach/*` Coach-Bereich, `src/app/api/strava/*` OAuth + Webhook
- `src/lib/supabase/*` Clients, `src/lib/auth.ts` Rollenprüfung
- `src/lib/plan/*` Plan-Schema (Zod), Validierung, Datumslogik, Diff, Export, Testarten, abgeleitete Werte für die KI (`derive.ts`)
- `src/lib/questionnaire/*` Fragebogen-Schema (Zod) und Vollständigkeit
- `src/lib/calc/*` reine Rechenfunktionen, `src/lib/strava/*` Strava-API + Webhook-Logik, `src/lib/chat/*` KI-Vorfilter
- `src/components/*` UI-Bausteine
- `supabase/migrations/*.sql` Migrationen (in Reihenfolge im SQL-Editor ausführbar), `supabase/seed.sql`, `supabase/tests/rls_test.sql`
- `docs/plan-schema.json` wird aus dem Zod-Schema erzeugt (`npm run schema:generate`); ein Test stellt Gleichheit sicher.

## Vor jedem Commit
`npm run lint && npm run build && npm test` müssen grün sein. Datenbank-Änderungen zusätzlich mit `npm run db:test` gegen ein lokales Postgres mit Supabase-Attrappe prüfen (nur in der Claude-Code-Umgebung, nicht bei der Betreiberin nötig).

## Migrationen
- Neue Änderungen immer als **neue** Datei `supabase/migrations/<timestamp>_<name>.sql`, bestehende nie nachträglich ändern, sobald sie ausgerollt sind.
- Jede neue Tabelle: `enable row level security`, explizite `grant`s an `authenticated`, keine an `anon`, Audit-Trigger (`created_by`/`updated_by`).
- `supabase/tests/rls_test.sql` erweitern, wenn sich Rechte ändern.
