# PT-Coach einrichten – ohne lokale Installation

**Erledigt:** Supabase-Projekt angelegt, Migrationen und (optional) Demo-Daten eingespielt, Rechte-Test ausgeführt (Schritte 1–1c im Anhang).

Was jetzt noch fehlt, ist zweigeteilt:

- **Teil A – nur du:** alles, wofür dein Login, deine Zahlungsdaten, dein Postfach oder deine Zustimmung zu Nutzungsbedingungen nötig sind.
- **Teil B – Claude:** alle Einstellungen in Supabase und Vercel, das Eintragen der Schlüssel und das Veröffentlichen. Dafür braucht Claude zwei Zugangsschlüssel (A1). Claude zeigt dir vor jedem Schritt, der etwas bei Supabase, Vercel oder GitHub ändert, was passiert, und wartet auf dein OK.

| Schritt | Du | Claude |
|---|---|---|
| Zugangsschlüssel für Supabase und Vercel erstellen und hinterlegen | ✔ (A1) | |
| E-Mail-Versand (SMTP) einrichten | ✔ (A2) | |
| Claude-API-Key erstellen | ✔ (A3) | |
| Supabase-URL und -Schlüssel notieren (alter Schritt 1d) | – entfällt | ✔ trägt sie direkt in Vercel ein |
| Migrationen und Realtime prüfen, ggf. nachholen | | ✔ (B1) |
| Login-Mailvorlage, Adressen, Registrierung abschalten (Supabase) | | ✔ (B2) |
| Code nach `main` übernehmen, Vercel-Projekt anlegen, Variablen setzen, veröffentlichen | Freigabe | ✔ (B3) |
| Strava-App anlegen | ✔ (A4) | nennt dir die Werte |
| Erster Login als Coach, Strava-Webhook per Button | ✔ (A5) | prüft danach |
| Eskalations-Testset befüllen | ✔ (A6) | führt den Test aus |

---

## Teil A – was nur du machen kannst

### A1. Zwei Zugangsschlüssel für Claude (ca. 5 Minuten)

1. **Supabase:** [supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens) → **Generate new token**, Name `claude-setup`, Ablauf z. B. 7 Tage.
2. **Vercel:** auf [vercel.com](https://vercel.com) mit GitHub anmelden (falls noch kein Konto). Dann [vercel.com/account/settings/tokens](https://vercel.com/account/settings/tokens) → **Create Token**, Name `claude-setup`, Ablauf z. B. 7 Tage.
   Vercel muss auf das GitHub-Repository `PT-Coach` zugreifen dürfen. Das fragt Vercel beim ersten Anmelden mit GitHub ab; sonst unter **Settings → Git** die GitHub-Verbindung prüfen.
3. **In Claude Code hinterlegen – nicht in den Chat kopieren:** In der Titelleiste der Sitzung das Umgebungs-Menü öffnen → **Bearbeiten**. Unter **Network secrets** (je nach App-Version „API credentials“ oder Umgebungsvariablen) eintragen:

   | Name | Wert |
   |---|---|
   | `SUPABASE_ACCESS_TOKEN` | Supabase-Token aus 1. |
   | `VERCEL_TOKEN` | Vercel-Token aus 2. |
   | `ANTHROPIC_API_KEY` | Claude-API-Key aus A3 |

4. Eine **neue Claude-Code-Sitzung** starten, denn erst eine neue Sitzung sieht die Schlüssel. Dort schreiben: *„Weiter mit Teil B aus README_SETUP.md.“*

Nach der Einrichtung kannst du beide Tokens bei Supabase und Vercel wieder löschen. Die App braucht sie nicht.

### A2. E-Mail-Versand (SMTP)

Der eingebaute Versand von Supabase schickt nur an Mitglieder deines Supabase-Teams und nur wenige Mails pro Stunde. Kunden bekämen also keine Login-Mails. Du brauchst einen Versanddienst, und das kann nur du einrichten, weil dafür ein Konto mit Passwort bzw. eine eigene Domain nötig ist:

- **Mit eigener Domain:** z. B. Resend, Brevo oder Postmark (kostenlose Einstiegstarife). Die Domain beim Anbieter bestätigen; der Anbieter zeigt dir Host, Port, Benutzer und Passwort.
- **Ohne eigene Domain:** Viele normale E-Mail-Postfächer bieten einen SMTP-Zugang (Host/Port stehen in der Hilfe des Anbieters; oft muss man den Zugang für externe Programme in den Postfach-Einstellungen erst erlauben). Das reicht für wenige Kunden.

Eintragen in Supabase: **Authentication → Emails → SMTP Settings → Enable custom SMTP**. Absender z. B. `PT-Coach <deine-adresse>` → speichern. Das Passwort trägst du dort selbst ein; Claude braucht es nicht.

### A3. Claude-API-Key

[console.anthropic.com](https://console.anthropic.com) → API-Key erstellen, etwas Guthaben aufladen. Den Key in A1 hinterlegen. Claude überträgt ihn nach Vercel und kann damit auch den Eskalationstest (A6) ausführen.

### A4. Strava-App anlegen (optional; nach B3, wenn die App-Adresse feststeht)

Strava ist optional. Solange `STRAVA_CLIENT_ID` und `STRAVA_CLIENT_SECRET` nicht gesetzt sind, blendet die App die Strava-Verbindung aus; Kunden tragen Läufe usw. von Hand ein.

1. Auf [strava.com/settings/api](https://www.strava.com/settings/api) eine App anlegen:
   - **Application Name:** PT-Coach · **Category:** Training
   - **Website:** die App-Adresse, die Claude dir nach B3 nennt
   - **Authorization Callback Domain:** nur der Domainname ohne `https://`, z. B. `pt-coach.vercel.app` (nennt Claude dir ebenfalls)
2. **Client ID** und **Client Secret** in Vercel eintragen: Projekt → **Settings → Environment Variables** → `STRAVA_CLIENT_ID` und `STRAVA_CLIENT_SECRET` → speichern. Dann Claude Bescheid geben; Claude veröffentlicht neu und prüft.

Hinweis: Neue Strava-Apps dürfen anfangs oft nur wenige Athleten verbinden, und Strava hat 2026 die Bedingungen seines Entwicklerprogramms geändert. Bitte dort prüfen, was für deine App gilt.

### A5. Erster Login und Strava-Webhook

1. Die App-Adresse öffnen → deine Coach-E-Mail eingeben → **Anmeldelink senden** → Link antippen oder Code eingeben. Das Coach-Konto entsteht dabei automatisch.
2. Im Coach-Bereich **Einrichtung** öffnen: alle Variablen ✅? Dann **„Strava-Webhook registrieren“** drücken. Der Status muss „✓ aktiv“ zeigen.
3. Optional: unter **Einrichtung → Selbstregistrierung** einen Einladungscode erzeugen.

### A6. Eskalations-Testset

In GitHub `docs/eskalation-testset.json` öffnen → Stift-Symbol → echte Beispiel-Nachrichten mit `"erwartet": "answer"` oder `"escalate"` ergänzen → **Commit changes**. Dann Claude bitten: *„Führe den Eskalationstest aus.“*

### Danach: Alltag

- **Kunden anlegen** (Kunden → + Kunde) oder per Einladungscode registrieren lassen (`https://DEINE-APP/registrieren`).
- Kunden installieren die App auf dem Handy: iPhone/Safari → Teilen → „Zum Home-Bildschirm“; Android/Chrome → Menü → „App installieren“. In der installierten App beim Login den **Code** aus der Mail verwenden.
- **Pläne** anlegen: Kunde → Plan → **Neuer Plan mit KI** (Plan beschreiben → Prompt kopieren → in Claude o. Ä. einfügen → Antwort hochladen), oder leer anlegen und im Editor füllen. Bestehende Pläne ändern: Export & KI-Prompt → Import.
- **Wissensbasis** und **Eskalationsregeln** befüllen.

---

## Teil B – was Claude übernimmt (nach A1)

Claude erledigt diese Schritte in einer neuen Sitzung mit den Schlüsseln aus A1 und fragt vor jeder Änderung nach deinem OK.

- **B1 Datenbank prüfen:**
  - Sind alle Migrationen eingespielt? Fehlende werden nachgeholt.
  - Ist Realtime für den Chat aktiv?
  - Der Rechte-Test wird erneut ausgeführt; erwartet sind „ALLE TESTS BESTANDEN (55)“.
- **B2 Supabase-Anmeldung einstellen:**
  - Login-Mailvorlage mit Link und Code (Text siehe Anhang).
  - Site URL und Redirect URLs auf die App-Adresse.
  - „Allow new users to sign up“ ausschalten; Konten legt nur die App an.
- **B3 Veröffentlichen:**
  - Den Code per Pull Request nach `main` übernehmen (mit deiner Freigabe).
  - Vercel-Projekt anlegen.
  - Variablen setzen: Supabase-URL und -Schlüssel (direkt aus Supabase abgerufen, du musst nichts notieren), `ANTHROPIC_API_KEY`, `NEXT_PUBLIC_SITE_URL`, `COACH_EMAIL` (Claude fragt dich nach der Adresse), ein zufälliges `STRAVA_WEBHOOK_VERIFY_TOKEN` und `STRAVA_API_BASE`.
  - Deployen und die Seite prüfen. Danach nennt Claude dir App-Adresse und Strava-Callback-Domain für A4.
- **B4 Nach A4:** neu deployen, Webhook-Erreichbarkeit prüfen und nach A5 kontrollieren, dass das Abo aktiv ist.
- **B5 Eskalationstest** (`npm run test:eskalation`) mit deinen echten Regeln und deiner Wissensbasis; Ergebnis ist die Trefferquote.

**Was Claude nicht kann:** Konten anlegen oder Bedingungen akzeptieren (Strava, SMTP-Anbieter, Anthropic), deine E-Mails lesen, sich in der App als du anmelden.

---

## Anhang: alles von Hand (ohne Schlüssel für Claude)

Falls du Teil B lieber selbst machst:

1. **Supabase-Werte:** Project Settings → API (bzw. API Keys): **Project URL**, **anon/publishable** Key, **service_role/secret** Key (geheim!).
2. **Login-Mailvorlage:** Authentication → Emails → Templates → **Magic Link**, Betreff „Dein Login für PT-Coach“, Inhalt:
   ```html
   <h2>Anmelden bei PT-Coach</h2>
   <p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">Hier tippen, um dich anzumelden</a></p>
   <p>Oder diesen Code in der App eingeben: <strong>{{ .Token }}</strong></p>
   <p>Der Link und der Code gelten nur kurz und nur einmal.</p>
   ```
3. **Adressen:** Authentication → URL Configuration: Site URL = App-Adresse, Redirect URLs: `https://DEINE-APP/**`. Authentication → Sign In / Providers: Email an, „Allow new users to sign up“ aus.
4. **Realtime:** Database → Publications → `supabase_realtime`: Tabelle `messages` an.
5. **Vercel:** Add New → Project → Repository `PT-Coach` importieren, Variablen eintragen (Vorlage `.env.example`):

   | Variable | Wert |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon/publishable Key |
   | `SUPABASE_SERVICE_ROLE_KEY` | service_role/secret Key |
   | `NEXT_PUBLIC_SITE_URL` | App-Adresse ohne `/` am Ende |
   | `COACH_EMAIL` | deine E-Mail – wer sich damit anmeldet, wird Coach |
   | `ANTHROPIC_API_KEY` | Claude-API-Key |
   | `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET` | aus der Strava-App |
   | `STRAVA_WEBHOOK_VERIFY_TOKEN` | beliebiges langes Geheimwort |
   | `STRAVA_API_BASE` | `https://www.strava.com/api/v3` (ab 2027 ggf. neue Adresse – dann nur diesen Wert ändern) |
   | `APP_TIMEZONE`, `ANTHROPIC_MODEL` | optional |

   Vercel veröffentlicht den Branch `main`. Der Code liegt noch auf `claude/tender-fermat-dghaw1` → per Pull Request nach `main` übernehmen. Änderungen an Variablen wirken erst nach **Redeploy**.

### Bereits erledigte Schritte (zur Referenz)

- **1 Projekt:** supabase.com → New project, Region Central EU (Frankfurt).
- **1a Migrationen:** SQL Editor → nacheinander `supabase/migrations/20261027000100_grundgeruest.sql`, `…000200_standarddaten.sql`, `…000300_absicherung.sql` und `20261028000100_programm_bloecke.sql` je einmal ausführen. Neue Migrationen später nur zusätzlich, in Namensreihenfolge.
- **1b Demo-Daten (optional):** `supabase/seed.sql`; entfernen mit `supabase/seed_entfernen.sql`.
- **1c Rechte-Test:** `supabase/tests/rls_test.sql` → letzte Zeile „ALLE TESTS BESTANDEN (55)“.

---

## Häufige Probleme

| Problem | Lösung |
|---|---|
| Keine Login-Mail | SMTP (A2) eingerichtet? Spam-Ordner? Ist die Adresse als Kunde angelegt bzw. die Coach-Adresse? |
| Link führt zu „Anmeldung hat nicht geklappt“ | Link abgelaufen/schon benutzt → neu anfordern; Site URL/Redirect URLs prüfen |
| „Kein Zugang“ nach Login | Konto ist weder Coach noch angelegter/registrierter Kunde |
| Strava-Verbindung schlägt fehl | Callback Domain (A4) muss exakt der App-Domain entsprechen |
| Strava-Aktivitäten kommen nicht an | Einrichtung → Webhook-Status prüfen; nur Aktivitäten **ab** Verbindung werden übernommen |
| Chat-Antworten erscheinen erst nach Neuladen | Realtime prüfen (Anhang 4) |
| KI antwortet nie, alles landet im Posteingang | `ANTHROPIC_API_KEY` in Vercel gesetzt und Guthaben vorhanden? Grund steht im Posteingang |
