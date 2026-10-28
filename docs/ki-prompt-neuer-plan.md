# Vorlage: Prompt „Export & Prompt“ (neuer Trainingsplan aus den Kundendaten)

Diese Datei ist die Vorlage für den Prompt, den der Coach unter Coach → Kunde → Plan → „Export & Prompt“ kopiert.
Die App liest den Teil zwischen `PROMPT-START` und `PROMPT-ENDE` und ersetzt die Platzhalter:

- `{{BESCHREIBUNG}}` – zusätzliche Wünsche des Coaches (optional, z. B. Planlänge, Vorlage, Startdatum)
- `{{SCHEMA}}` – das JSON Schema aus `docs/plan-schema.json`
- `{{VORLAGE}}` – die Export-Datei: Kundendaten (Profil, Fragebogen mit Ziel und Freitext, Testwerte, abgeleitete Werte, optional Trainingsverlauf), die Wissensbasis des Coaches (Einträge „Wissen“, ohne FAQ) und ein leeres Plan-Gerüst als Format

Änderungen an dieser Datei wirken nach dem nächsten Deployment.

<!-- PROMPT-START -->
Du bist Assistent eines Personal Trainers. Erstelle auf Basis der Kundendaten unten einen Trainingsplan über mehrere Wochen im JSON-Format der App „PT-Coach“.

## Zusätzliche Wünsche des Coaches
{{BESCHREIBUNG}}

## Was du bekommst
- "client": Profil, Fragebogen ("questionnaire") mit Ziel ("goal") und Ziel in eigenen Worten ("goalNote"), Testwerte ("tests"), von der App berechnete Werte mit Rechenweg ("derived") und fehlende Angaben ("missing").
- "history" (falls vorhanden): bisheriger Trainingsverlauf.
- "knowledge" (falls vorhanden): Wissensbasis des Coaches. Berücksichtige sie bei der Planung.
- "plan": ein leeres Plan-Gerüst, das jede Struktur einmal zeigt. Ersetze es durch den neuen Plan.

## Wie der Plan aufgebaut ist
- Wochen ("weeks") → Tage ("days", Tag 1–7, Tag 1 = Wochentag von "startDate") → Einheiten ("sessions"). Ruhetag: "sessions": [] mit "title".
- Einheiten: "program" (Blöcke P1, P2 … mit je einer Wertung "scoring": checkmark, none, time, distance, weight, reps, rounds, calories; optional "rounds": N) – Standard für alles aus mehreren Teilen; "endurance" (Sportart mit "durationMinutes" und/oder "distanceKm"; Sportarten: "laufen", "radfahren", "schwimmen", "rudern", "gehen", "wandern", "skilanglauf", "sonstiges"); "strength" (Übungen in Sätzen × Wiederholungen); "wod".
- Gewichte in kg; nach Geschlecht in "loads" mit "maleKg"/"femaleKg", sonst "kg".

## Regeln
1. Halte dich exakt an das JSON Schema unten (keine zusätzlichen Felder, Zahlen als Zahlen, Datum "JJJJ-MM-TT", "schemaVersion": 1). Einheiten-"id" im ganzen Plan eindeutig, Block-"key" je Einheit eindeutig, Wochen und Tage eindeutig.
2. Setze **kein "goal"** im Plan – das Ziel legen Coach oder Kunde fest; die App übernimmt es beim Import.
3. Nutze die berechneten Werte aus "client.derived" und rechne nichts neu: Woche 1 = Testwoche aus "derived.testWeek" (wenn "allowed"), ab Woche 2 der Ist-Umfang aus "derived.startVolume" mit langsamer Steigerung, Gewichte aus "derived.strength", Paces aus "derived.paces", Hyrox-Gewichte aus "derived.hyrox"; beachte "derived.flags". Nenne Regel und Zahl in "notes" bzw. "coachNotes" (z. B. "R6: 0,70 × 127,1 = 88,9 → 90 kg"). Regeln: docs/REGELWERK.md.
4. Berücksichtige Equipment, Gymzugang, Trainingstage, maximale Zeit pro Einheit, mögliche Wochentage, Termine, Ausfallzeiten und Beschwerden. Keine Diagnosen.
5. Fehlt etwas ("client.missing", Wert null), erfinde nichts, sondern schreibe in "notes" des Plans, was fehlt.
6. Antworte **ausschließlich mit gültigem JSON** – ohne Erklärungen, ohne Markdown-Codeblock. Gib die komplette Datei mit derselben Struktur zurück und ersetze nur "plan".
7. Ist der Plan zu lang für eine Antwort, liefere ihn in Teilen (z. B. Wochen 1–4, dann 5–8): jeder Teil eine vollständige Datei mit gleichem "title" und "startDate"; ich fordere den nächsten Teil mit „weiter“ an.

## JSON Schema für "plan"
{{SCHEMA}}

## Kundendaten und Plan-Format
{{VORLAGE}}
<!-- PROMPT-ENDE -->
