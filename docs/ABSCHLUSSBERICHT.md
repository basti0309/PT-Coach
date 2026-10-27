# Abschlussbericht – Entwurf 1

Stand: 27.10.2026, Branch `claude/tender-fermat-dghaw1`.

## Was fertig ist

| Bereich | Umfang |
|---|---|
| Grundgerüst | Next.js 16 (App Router, TypeScript), Tailwind, PWA (Manifest, Icons, Service Worker), komplett deutsch, mobil zuerst |
| Konten & Rollen | Login per Magic Link **oder** 6-stelligem Code (für die installierte PWA); Coach über `COACH_EMAIL`; Kunden legt der Coach an **oder** sie registrieren sich selbst mit Einladungscode (`/registrieren`, Code unter „Einrichtung“) |
| Datenbank | 2 Migrationen mit 13 Tabellen, Audit-Feldern per Trigger („wer hat erfasst/geändert“), Grants und RLS; Seed (Demo-Coach, 2 Demo-Kunden, Beispielplan); RLS-Testskript mit 45 Prüfungen |
| 1 Pläne | Plan-Schema (Zod = Quelle, `docs/plan-schema.json` daraus erzeugt), Editor für Wochen/Tage/Kraft/WOD/Ausdauer, Versionen mit Diff und Wiederherstellen, Export Plan+Profil (pseudonymisiert/Klarnamen), KI-Prompt aus `docs/ki-prompt-vorlage.md`, Import (Einfügen/Upload) mit verständlichen Fehlern, Änderungsübersicht, Zeilendiff und Bestätigung |
| 2 Training | Kraft mit Satz-Abhaken und Vorbefüllung (gleiche Übungs-ID), Pausentimer mit Vibration, WODs mit Wiedererkennung (wodId oder normalisierte Bewegungsliste) und letztem Ergebnis, Ausdauer manuell, Abweichung zum Plan; Kunde und Coach erfassen gleichermaßen |
| Strava | OAuth (`activity:read_all`, state-Prüfung), Token-Refresh, `STRAVA_API_BASE`, Token im Authorization-Header, Webhook (Validierung, create/update/delete, Deautorisierung mit Gegenprüfung), Matching (gleicher Tag → Planwoche → ungeplant), Button „Strava-Webhook registrieren“ mit Status |
| Sichtbarkeit | Strava-Werte nur in `strava_activities` (RLS: nur Kunde); Coach sieht Dauer und Erledigt-Status (DB-Constraint), Strava nie im KI-Kontext oder Export |
| 3 Chat | Kundennachrichten nur über den Server → Claude API mit strukturierter Ausgabe; KI-Antworten gekennzeichnet; Eskalation in den Posteingang; Pflicht-Eskalation zusätzlich per Stichwortprüfung; Wissensbasis/FAQ und Regeln editierbar (Pflichtregeln per DB-Trigger geschützt); Realtime; Testroutine `npm run test:eskalation` + Vitest |
| 4 Profil | Alle Felder inkl. Geburtsdatum (Alter berechnet), Testwerte als Historie, Kalorienbedarf (Mifflin-St Jeor × PAL) mit Rechenweg, Nährstoffziele nur vom Coach, Profil-Export identisch zum Plan-Export |
| 5 Prognosen | Riegel für 5k/10k/HM/M aus jüngster Referenz, mit Formel, Datum und Unsicherheitshinweis; Strava-basierte Prognosen nur für den Kunden |
| 6 Graphen | Ausdauer je Woche/Monat und Sportart (Coach nur Zeit), Kraft-Volumen bzw. e1RM (Epley/Brzycki) mit Markierung > 10 Wdh. |
| Doku | `CLAUDE.md`, `docs/SPEC.md`, `docs/ANNAHMEN.md` (53 Annahmen), `README_SETUP.md`, `.env.example` |

## Was getestet ist

1. **Unit-Tests (Vitest, 114 Tests):** alle Berechnungen gegen von Hand nachgerechnete Beispiele (1RM, Volumen, Riegel, Mifflin-St Jeor, Alter, Matching, Abweichung, Vorbefüllung, WOD-Wiedererkennung, Aggregation, Schema-Validierung, Import-Parsing, Diff, Export/Pseudonymisierung, Prompt), Webhook-Handler mit Beispiel-Payloads (create/update/delete/Deautorisierung, gefälschte Ereignisse), Strava-API mit gemocktem `fetch` (Authorization-Header, Basis-URL, Refresh), KI-Vorfilter (Pflichtregel schlägt KI, Fehler → Eskalation), Testset-Format und Trefferquote.
2. **RLS-Tests (`supabase/tests/rls_test.sql`, 45 Prüfungen):** gegen ein lokales Postgres 16 mit Supabase-Attrappe (`npm run db:test`) **und** gegen das echte Supabase-Postgres 17 (lokaler Supabase-Stack). Gegenprobe: mit abgeschaltetem RLS schlagen die Tests fehl.
3. **End-to-End (`e2e/`, Playwright):** gegen einen lokalen Supabase-Stack (echtes Auth/GoTrue, PostgREST, Realtime, Mailpit für E-Mails) mit der gebauten App. Geprüft u. a.: Login per Code und per Link aus einem fremden Browser (mit der Mail-Vorlage aus README_SETUP.md), Selbstregistrierung, Coach-Webhook-Button, Kundenanlage, Import mit Fehlern und Diff, Export, Krafterfassung mit Timer und Vorbefüllung, WOD, Profil/Kalorien, Strava-OAuth und -Webhook mit Matching, Sichtbarkeit Coach vs. Kunde (inkl. Kontrolle, dass km/Puls nicht in der Coach-Ansicht und nicht im KI-Aufruf stehen), Chat mit KI-Antwort und Eskalation, Posteingang, Realtime-Zustellung, Versionen/Wiederherstellen, Zugriffsschutz Kunde → Coach-Bereich.
4. `npm run lint`, `npm run build`, `npm test` nach jedem Meilenstein grün.

## Was NICHT gegen die echten Dienste getestet wurde

- **Strava:** Die echte Strava-API war nicht erreichbar/kein Strava-Konto. OAuth, Token-Refresh, Aktivitätsabruf, Webhook-Registrierung und -Validierung liefen gegen einen Mock, der die dokumentierten Formate nachbildet. Unklar bleibt v. a.: exaktes Verhalten von Strava bei Deautorisierung (Fehlercodes für Refresh/`/athlete`) und die künftige Basis-URL 2027.
- **Claude API:** kein API-Key in dieser Umgebung. Der Aufruf (strukturierte Ausgabe über `messages.parse`) lief gegen einen Mock; die **Trefferquote des echten Vorfilters ist ungemessen** (`npm run test:eskalation` mit echtem Key ausführen).
- **Supabase in der Cloud:** nur lokal (gleiche Software). Nicht geprüft: Supabase-Dashboard-Schritte aus README_SETUP.md, eigener SMTP-Versand, Realtime in der Cloud.
- **Vercel:** nicht deployt. Insbesondere `after()` (Webhook-Verarbeitung nach der Antwort) und das Einlesen von `docs/ki-prompt-vorlage.md` im Deployment sind nur lokal mit `next start` geprüft.
- **Echte Handys:** PWA-Installation, Vibration (iPhone-Browser unterstützen sie nicht), Code-Login in der installierten App nur im Desktop-Chromium mit Handy-Viewport geprüft.

## Getroffene Annahmen

Siehe `docs/ANNAHMEN.md` (53 Punkte). Nach deiner Rückmeldung umgesetzt: Geburtsdatum statt Alter, Selbstregistrierung mit Einladungscode zusätzlich zur Anlage durch den Coach.

## Was offen ist

- Eskalations-Testset mit echten Nachrichten befüllen und die Trefferquote mit echtem API-Key messen.
- Einmalige Einrichtung nach README_SETUP.md (Supabase, SMTP, Strava-App, Vercel) und ein Durchlauf mit echten Konten.
- Strava-Entwicklerprogramm: Athleten-Kapazität und aktuelle Bedingungen klären.
- Name des Coach-Profils ist „Coach“ (es gibt keine Oberfläche zum Ändern des eigenen Namens).
