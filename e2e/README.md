# End-to-End-Tests (nur Entwicklung)

`bash e2e/run.sh` startet ein lokales Supabase (Docker, Supabase-CLI), spielt Migrationen und Seed ein, startet einen Mock für die Strava-API und die Claude API (`mock.mjs`) sowie die gebaute App und führt vier Playwright-Szenarien aus:

- **A – Coach:** Login per Code, Webhook-Button, Einladungscode, Kunde anlegen, Plan-Import mit Fehlern/Diff, Export (pseudonymisiert/Klarnamen), KI-Prompt
- **B – Kunde:** Selbstregistrierung mit Einladungscode, Login per Link in fremdem Browser, Krafterfassung mit Pausentimer und Vorbefüllung, WOD-Wiedererkennung, Profil/Geburtsdatum/Kalorien
- **C – Strava & Chat:** OAuth (state, Scope), Webhook create/delete/Deautorisierung inkl. Gegenprüfung, Matching, Sichtbarkeit Coach vs. Kunde, Graphen/Prognosen, KI-Vorfilter, Posteingang, Realtime
- **D – Plan & Versionen:** Editor, Validierungsfehler, Versionen/Diff/Wiederherstellen, Erfassung durch den Coach, Wissensbasis, Regeln, Zugriffsschutz

Voraussetzungen: Docker läuft, Playwright mit Chromium ist installiert. Die echten Dienste Strava und Claude werden dabei **nicht** angesprochen.
Die Szenarien bauen aufeinander auf (A vor B vor C vor D) und erwarten eine frisch gestartete Datenbank.
