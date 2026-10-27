# PT-Coach einrichten – Schritt für Schritt (ohne lokale Installation)

Du brauchst nur einen Browser und Konten bei **GitHub**, **Supabase**, **Vercel**, **Strava** und **Anthropic** (Claude API).
Plane etwa eine Stunde ein. Reihenfolge einhalten – spätere Schritte brauchen Werte aus früheren.

> Notiere dir unterwegs diese Werte (z. B. in einer Notiz-App), du brauchst sie in Schritt 4:
> Supabase-URL, Supabase-anon-Key, Supabase-service_role-Key, Strava Client ID, Strava Client Secret, Anthropic API Key.

---

## 1. Supabase-Projekt anlegen

1. Auf [supabase.com](https://supabase.com) anmelden → **New project**.
2. Name z. B. `pt-coach`, ein sicheres Datenbank-Passwort vergeben (wird später nicht gebraucht, aber gut aufbewahren), Region **Central EU (Frankfurt)** wählen → **Create new project**. Warten, bis das Projekt bereit ist (1–2 Minuten).

### 1a. Datenbank-Struktur anlegen (Migrationen)

1. Links im Menü **SQL Editor** öffnen → **New query**.
2. In GitHub die Datei `supabase/migrations/20261027000100_grundgeruest.sql` öffnen, auf **Raw** klicken, alles markieren und kopieren.
3. In den SQL-Editor einfügen → **Run** (unten rechts). Erwartet: „Success. No rows returned“.
4. Neue Query, genauso mit `supabase/migrations/20261027000200_standarddaten.sql` → **Run**.

Wichtig: Jede Migration nur **einmal** ausführen. Kommen später neue Dateien in `supabase/migrations/` dazu, führst du nur die neuen aus (in der Reihenfolge ihrer Namen).

### 1b. Optional: Demo-Daten

`supabase/seed.sql` genauso ausführen. Das legt einen Demo-Coach, zwei Demo-Kunden („Anna Demo“, „Ben Demo“) und einen Beispielplan an. Die Demo-Konten können sich nicht anmelden; du siehst sie als Coach in deiner Kundenliste. Wieder entfernen: `supabase/seed_entfernen.sql` ausführen.

### 1c. Rechte prüfen (empfohlen)

`supabase/tests/rls_test.sql` ausführen. Das Skript legt kurzzeitig Testkonten an, prüft 45 Zugriffsregeln (Kunde A sieht nichts von Kunde B, Coach sieht keine Strava-Werte, …) und löscht danach alles wieder. Die letzte Zeile der Ergebnistabelle muss lauten: **„ALLE TESTS BESTANDEN (45)“**.

### 1d. Werte für später notieren

**Project Settings → API** (bzw. **API Keys**):
- **Project URL** → wird `NEXT_PUBLIC_SUPABASE_URL`
- **anon / public** Key (oder „publishable“ Key) → wird `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **service_role** Key (oder „secret“ Key) → wird `SUPABASE_SERVICE_ROLE_KEY` – **geheim**, nirgends sonst eintragen!

---

## 2. Anmeldung per E-Mail einrichten (Supabase)

### 2a. E-Mail-Versand (SMTP) – wichtig

Der eingebaute E-Mail-Versand von Supabase schickt nur an Mitglieder deines Supabase-Teams und nur wenige Mails pro Stunde. Damit deine Kunden Anmelde-Mails bekommen, brauchst du einen eigenen Versanddienst:

1. Bei einem SMTP-Anbieter registrieren (z. B. Resend, Brevo, Postmark – alle haben kostenlose Einstiegstarife) und dort deine Absender-Domain bestätigen. Der Anbieter zeigt dir Host, Port, Benutzer und Passwort.
2. In Supabase: **Authentication → Emails → SMTP Settings** → **Enable custom SMTP**, die Werte eintragen, Absender z. B. `PT-Coach <coach@deine-domain.de>` → speichern.

### 2b. E-Mail-Vorlage für den Login

**Authentication → Emails → Templates → Magic Link** – Betreff z. B. „Dein Login für PT-Coach“, Inhalt ersetzen durch:

```html
<h2>Anmelden bei PT-Coach</h2>
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">Hier tippen, um dich anzumelden</a></p>
<p>Oder diesen Code in der App eingeben: <strong>{{ .Token }}</strong></p>
<p>Der Link und der Code gelten nur kurz und nur einmal.</p>
```

Der **Code** ist wichtig, wenn die App auf dem Handy als App installiert ist (dann öffnet sich der Link sonst im normalen Browser).

### 2c. Adressen und Registrierung

- **Authentication → URL Configuration**: **Site URL** = deine App-Adresse aus Schritt 4 (z. B. `https://pt-coach.vercel.app`). Unter **Redirect URLs** hinzufügen: `https://pt-coach.vercel.app/**`. (Diesen Schritt nach Schritt 4 erledigen bzw. die Adresse dann nachtragen.)
- **Authentication → Sign In / Providers**: **Email** aktiviert lassen. **„Allow new users to sign up“ ausschalten** – Konten legt nur die App an (dein Coach-Konto und die Kunden, die du anlegst).

### 2d. Realtime (Chat) prüfen

**Database → Publications → supabase_realtime**: Die Tabelle `messages` sollte eingeschaltet sein (macht die zweite Migration automatisch). Falls nicht: hier einschalten.

---

## 3. Strava-App anlegen

1. Mit deinem Strava-Konto auf [strava.com/settings/api](https://www.strava.com/settings/api) gehen und eine App anlegen:
   - **Application Name**: PT-Coach
   - **Category**: Training
   - **Website**: deine App-Adresse (z. B. `https://pt-coach.vercel.app`)
   - **Authorization Callback Domain**: nur der Domainname **ohne** `https://` und ohne Pfad, z. B. `pt-coach.vercel.app`
2. Notieren: **Client ID** → `STRAVA_CLIENT_ID`, **Client Secret** → `STRAVA_CLIENT_SECRET`.
3. Ein beliebiges langes Geheimwort ausdenken (z. B. 30 zufällige Buchstaben/Ziffern) → `STRAVA_WEBHOOK_VERIFY_TOKEN`.

Hinweis: Neue Strava-Apps dürfen anfangs oft nur sehr wenige Athleten verbinden, und Strava hat 2026 die Bedingungen seines Entwicklerprogramms geändert. Prüfe in den Strava-Entwicklerseiten, was für deine App gilt, und beantrage dort ggf. eine höhere Kapazität.

Die Strava-API-Adresse ändert sich 2027. Dann nur in Vercel `STRAVA_API_BASE` auf die neue Adresse ändern und neu deployen – Code-Änderungen sind dafür nicht nötig.

## 3b. Claude API

Auf [console.anthropic.com](https://console.anthropic.com) einen API-Key erstellen → `ANTHROPIC_API_KEY`. Etwas Guthaben aufladen. Jede Kundennachricht im Chat ist ein API-Aufruf.

---

## 4. App bei Vercel veröffentlichen

1. Auf [vercel.com](https://vercel.com) mit GitHub anmelden → **Add New → Project** → das Repository `PT-Coach` importieren.
2. Framework wird als **Next.js** erkannt. Unter **Environment Variables** alle Werte eintragen (Vorlage: `.env.example`):

| Variable | Wert |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/publishable Key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role/secret Key |
| `NEXT_PUBLIC_SITE_URL` | Adresse der App, z. B. `https://pt-coach.vercel.app` (ohne `/` am Ende) |
| `COACH_EMAIL` | **deine** E-Mail-Adresse – wer sich damit anmeldet, wird Coach |
| `ANTHROPIC_API_KEY` | Claude API Key |
| `STRAVA_CLIENT_ID` | aus Schritt 3 |
| `STRAVA_CLIENT_SECRET` | aus Schritt 3 |
| `STRAVA_WEBHOOK_VERIFY_TOKEN` | dein Geheimwort aus Schritt 3 |
| `STRAVA_API_BASE` | `https://www.strava.com/api/v3` |
| `APP_TIMEZONE` | optional, Standard `Europe/Berlin` |
| `ANTHROPIC_MODEL` | optional, Standard `claude-opus-5-5` |

3. **Deploy** klicken. Nach dem Deployment zeigt Vercel die Adresse an (z. B. `https://pt-coach.vercel.app`). Falls sie von deiner Annahme abweicht: `NEXT_PUBLIC_SITE_URL`, Supabase-URL-Konfiguration (2c) und die Strava-Callback-Domain (3) anpassen und unter **Deployments → … → Redeploy** neu veröffentlichen.

Hinweis: Vercel veröffentlicht standardmäßig den Haupt-Branch (`main`). Diese erste Version liegt auf dem Branch `claude/tender-fermat-dghaw1` – in GitHub per Pull Request nach `main` übernehmen oder in Vercel unter **Settings → Git** den Branch wählen.

Änderungen der Umgebungsvariablen wirken erst nach einem neuen Deployment (**Redeploy**).

---

## 5. Ersten Coach-Account anlegen

1. Die App-Adresse öffnen → deine `COACH_EMAIL` eingeben → **Anmeldelink senden**.
2. E-Mail öffnen → Link antippen oder Code eingeben. Du landest im **Coach-Bereich**.

Das Coach-Konto entsteht dabei automatisch. Ein anderes Konto kann nicht Coach werden.

---

## 6. Strava-Webhook registrieren (einmalig, per Button)

1. Im Coach-Bereich **Einrichtung** öffnen. Dort siehst du, ob alle Umgebungsvariablen gesetzt sind (✅/❌).
2. **„Strava-Webhook registrieren“** drücken. Die App meldet sich bei Strava an; Strava prüft dabei die Adresse `…/api/strava/webhook` mit deinem Geheimwort.
3. Status muss **„✓ aktiv (Abo-ID …)“** zeigen.

Falls eine Fehlermeldung kommt, dass schon ein Abo für eine andere Adresse besteht (z. B. nach Umzug der App-Adresse): **„Abo löschen“** und dann erneut registrieren.

---

## 7. Kunden anlegen und loslegen

Kunden kommen auf zwei Wegen in die App:

- **Du legst sie an:** **Kunden → + Kunde**: Name, E-Mail und Kürzel (für pseudonymisierte Exporte) eintragen. Dann dem Kunden die App-Adresse schicken; er meldet sich mit seiner E-Mail an (Link oder Code).
- **Selbstregistrierung mit Einladungscode:** Unter **Einrichtung → Selbstregistrierung** einen Code festlegen oder „Zufallscode erzeugen“. Interessenten öffnen `https://DEINE-APP/registrieren`, geben Name, E-Mail und Code ein und sind sofort Kunde. „Registrierung schließen“ macht den Code ungültig.

Danach:

1. Auf dem Handy installieren: iPhone/Safari → Teilen → **„Zum Home-Bildschirm“**; Android/Chrome → Menü → **„App installieren“**. In der installierten App beim Login den **Code** aus der E-Mail verwenden.
2. Kunde verbindet Strava unter **Profil → Mit Strava verbinden**.
3. Du legst unter **Kunden → (Name) → Plan** einen Plan an – im Editor oder per Export → KI → Import.
4. **Wissensbasis** und **Eskalationsregeln** befüllen, damit der KI-Vorfilter im Chat sinnvoll antworten kann.

---

## 8. Eskalations-Testset pflegen und prüfen

1. In GitHub `docs/eskalation-testset.json` öffnen → Stift-Symbol (Bearbeiten) → Fälle ergänzen:
   `{ "nachricht": "…", "erwartet": "escalate" }` oder `"answer"` → **Commit changes**.
2. Ausführen: In Claude Code (claude.ai/code) mit diesem Repository schreiben: *„Führe npm run test:eskalation aus und zeig mir die Trefferquote.“* Dafür muss in der Claude-Code-Umgebung `ANTHROPIC_API_KEY` als Umgebungsvariable hinterlegt sein (optional zusätzlich `NEXT_PUBLIC_SUPABASE_URL` und `SUPABASE_SERVICE_ROLE_KEY`, dann werden deine echten Regeln und deine Wissensbasis verwendet).

---

## Häufige Probleme

| Problem | Lösung |
|---|---|
| Keine Login-Mail | SMTP (2a) eingerichtet? Spam-Ordner? Ist die Adresse als Kunde angelegt bzw. = `COACH_EMAIL`? |
| Link führt zu „Anmeldung hat nicht geklappt“ | Link abgelaufen/schon benutzt → neu anfordern; Site URL und Redirect URLs (2c) prüfen |
| „Kein Zugang“ nach Login | Konto ist weder Coach noch angelegter/registrierter Kunde |
| Strava-Verbindung schlägt fehl | Callback Domain (3) muss exakt der App-Domain entsprechen |
| Strava-Aktivitäten kommen nicht an | Einrichtung → Webhook-Status prüfen; nur Aktivitäten **ab** Verbindung werden übernommen |
| Chat-Antworten erscheinen erst nach Neuladen | Realtime (2d) prüfen |
| KI antwortet nie, alles landet im Posteingang | `ANTHROPIC_API_KEY` in Vercel gesetzt und Guthaben vorhanden? Grund steht im Posteingang |
