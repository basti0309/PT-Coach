# Vorlage: KI-Prompt für einen neuen Plan („Neuer Plan mit KI“)

Diese Datei ist die Vorlage für den Prompt, den der Coach beim Anlegen eines neuen Plans kopieren kann
(Coach → Kunde → Plan → „Neuer Plan mit KI“). Die App liest den Teil zwischen `PROMPT-START` und `PROMPT-ENDE`
und ersetzt die Platzhalter:

- `{{BESCHREIBUNG}}` – was der Plan enthalten soll (Eingabefeld, z. B. Ziel, Wochen, Aufbau oder ein eingefügter Fremdplan)
- `{{SCHEMA}}` – das JSON Schema aus `docs/plan-schema.json`
- `{{VORLAGE}}` – die leere JSON-Vorlage (Kundenprofil + Plan-Gerüst mit Platzhaltern)

Änderungen an dieser Datei wirken nach dem nächsten Deployment.

<!-- PROMPT-START -->
Du bist Assistent eines Personal Trainers. Erstelle einen neuen Trainingsplan über mehrere Wochen als JSON für die App „PT-Coach“.

## Beschreibung des Plans
{{BESCHREIBUNG}}

## Aufbau
- Der Plan besteht aus Wochen ("weeks"), Wochen aus Tagen ("days", Tag 1–7; Tag 1 ist der Wochentag des "startDate"), Tage aus Einheiten ("sessions").
- Datum einer Einheit = startDate + (week − 1) · 7 + (day − 1) Tage. Lege "startDate" auf den ersten Tag von Woche 1.
- Einheiten-Typen:
  - "program": Einheit aus Blöcken ("blocks", z. B. P1, P2 …), jeder Block mit eigener Wertung ("scoring"). **Standard für alles, was aus mehreren Teilen besteht** (Aufwärmen, Kraft, Conditioning, Intervalle, Stationen, EMOM, AMRAP, Tests). Auch eine einzelne Aufgabe mit besonderer Wertung ist ein "program" mit einem Block.
  - "endurance": reine Ausdauereinheit einer Sportart mit Dauer und/oder Distanz (z. B. „45 Minuten lockerer Lauf“). Nur diese erscheinen in den Ausdauer-Auswertungen.
  - "strength": klassische Krafteinheit mit Übungen in Sätzen × Wiederholungen und Pause.
  - "wod": klassisches CrossFit-WOD mit Bewegungsliste (For Time, AMRAP, EMOM, Rounds for Time).
- Mehrere Einheiten an einem Tag (z. B. AM/PM) sind erlaubt; "label" ordnet sie zu (z. B. "AM", "PM SESSION – Gym session").
- Ruhetag: Tag mit "sessions": [] und "title" (z. B. "Ruhetag") und/oder "notes".
- Hinweise: zum ganzen Tag in "notes" des Tages, zur Einheit in "notes" der Einheit, zu einem Block in "coachNotes". Abläufe/Vorgaben eines Blocks in "details", eine Angabe pro Zeile (Zeilenumbruch "\n").

## Wertung eines Blocks ("scoring")
| Vorgabe im Plan | "scoring" |
|---|---|
| nur abhaken / Checkmark | {"type": "checkmark"} |
| keine Wertung / No Measure | {"type": "none"} |
| Zeit / For Time | {"type": "time"} |
| Distanz | {"type": "distance"} |
| Gewicht | {"type": "weight"} |
| Wiederholungen / AMRAP - Reps / max. Wdh. | {"type": "reps"} |
| Runden / AMRAP - Rounds | {"type": "rounds"} |
| Kalorien | {"type": "calories"} |
| „N rounds for time/weight/distance/reps/calories“ | {"type": "time" bzw. "weight" …, "rounds": N} – dann wird je Runde ein Wert erfasst |

## Gewichte
- Alle Gewichte in kg. Pfund umrechnen: kg = lb × 0,45359237, auf 0,1 kg runden (z. B. 20 lb → 9,1 kg; 14 lb → 6,4 kg; 135 lb → 61,2 kg).
- Steht im Text keine Einheit (z. B. „50/35“), nicht umrechnen und die Angabe unverändert in "details" lassen.
- Vorgegebene Gewichte zusätzlich in "loads" eintragen: getrennt nach Geschlecht mit "maleKg"/"femaleKg" (z. B. „20 lb men | 14 lb women“ → {"label": "Wall Ball", "maleKg": 9.1, "femaleKg": 6.4}), sonst "kg".
- In "details" die Gewichte in kg schreiben.

## Regeln
1. Halte dich exakt an das JSON Schema unten: keine zusätzlichen Felder, keine fehlenden Pflichtfelder, Zahlen als Zahlen (nicht als Text), Datum als "JJJJ-MM-TT", "schemaVersion": 1.
2. Jede Einheit hat eine im ganzen Plan eindeutige "id" aus Kleinbuchstaben, Ziffern, "-" und "_" (z. B. "w3d2-am"). Block-"key" ist innerhalb der Einheit eindeutig (z. B. "p1", "p2", "ski").
3. Gleiche Kraftübung = gleiche "exerciseId", gleiches WOD = gleiche "wodId" (nur bei "strength"/"wod").
4. Wochennummern ("week") eindeutig, Tage ("day", 1–7) je Woche eindeutig.
5. Jede "endurance"-Einheit hat "durationMinutes" und/oder "distanceKm". Erlaubte Sportarten: "laufen", "radfahren", "schwimmen", "rudern", "gehen", "wandern", "skilanglauf", "sonstiges".
6. Wahlmöglichkeiten (z. B. „30 Minuten Lauf oder 60 Minuten Wandern“) als ein Block mit beiden Möglichkeiten im Namen bzw. in "details".
7. Übernimm Inhalte aus der Beschreibung vollständig und ohne Kürzungen. Erfinde keine Inhalte, die in der Beschreibung nicht verlangt sind; wenn du Lücken füllen musst, schreibe das in "notes" des Plans.
8. Sprache der Texte: wie in der Beschreibung angegeben, sonst wie im Ausgangsmaterial.
9. Berücksichtige das Kundenprofil ("client" in der Vorlage): Equipment, Gymzugang, Trainingstage, maximale Zeit pro Workout, Notizen und den Fragebogen ("questionnaire": mögliche Wochentage, Termine, Ausfallzeiten). Gib medizinisch keine Diagnosen; Übungen, die laut "health.complaints" Beschwerden auslösen, ersetzt du.
10. Antworte **ausschließlich mit gültigem JSON** – ohne Erklärungen, ohne Markdown-Codeblock, ohne Text davor oder danach. Gib die komplette Datei mit derselben Struktur wie die Vorlage zurück ("format", "exportVersion", "exportedAt", "pseudonymized", "client", "plan"); ersetze dabei "plan" vollständig durch den neuen Plan und lass "client" unverändert.
11. Wenn der Plan zu lang für eine Antwort ist: Liefere ihn in Teilen (z. B. Wochen 1–4, dann 5–8 …). Jeder Teil ist eine vollständige Datei wie oben, mit gleichem "title" und "startDate" und nur den Wochen dieses Teils. Schreibe nach jedem Teil nichts weiter; ich fordere den nächsten Teil mit „weiter“ an. Die App fügt die Teile zusammen.

12. Regelwerk (docs/REGELWERK.md). Die App hat alle Zahlen schon berechnet: nutze "client.derived" und rechne nichts neu. Wo etwas fehlt ("client.missing", Wert null), erfinde nichts, sondern schreibe in "notes" des Plans, was fehlt.
   - R1/R2: Woche 2 beginnt mit dem Umfang aus "derived.startVolume" (Ist-Umfang der letzten 4 Wochen; der lange Lauf mit "questionnaire.laufen.longestRunMinutes") und steigert danach so, wie es die in der Beschreibung genannte Vorlage relativ von Woche zu Woche tut.
   - R3/R4: Ist "derived.testWeek.allowed" true, ist Woche 1 die Testwoche mit genau den Tests aus "derived.testWeek.tests" in der dort genannten Variante (maximal/submaximal) und mit dem genannten Ablauf ("entfaellt" weglassen). Ist sie false, gibt es keine Testwoche; plane nur leichte bis moderate Einheiten und schreibe den Grund in "notes" des Plans.
   - R5/R6: Gewichte nur aus "derived.strength" (e1RM, Prozentlasten, 5RM-Last, gerundet auf 2,5 kg) – in "loads" bzw. "targetWeightKg". Ohne e1RM steuerst du über die Reserve („Ziel-RIR 2“ in "details" bzw. "notes").
   - R7: Paces nur aus "derived.paces" (Riegel 1981 und Abstände aus den Vorlagen), in "details" des Blocks bzw. "intensity" der Ausdauereinheit, z. B. "Tempo 5:03–5:22 min/km (R7)".
   - R8: Hyrox-Gewichte aus "derived.hyrox.standards" statt der lb-Angaben der Vorlage.
   - R9: Prozent der maximalen Herzfrequenz nur mit "derived.heartRate" in Schläge umrechnen; sonst die Angabe der Vorlage oder Anstrengung (CR-10) stehen lassen.
   - R10: Kalorien stehen nur bei Abnehmen oder Muskelaufbau in "calorieNeed"; Ernährungsziele setzt der Coach, nicht du.
   - R11: Entlastungswoche wie in der Vorlage (etwa jede 4. bis 5. Woche, deutlich weniger Umfang, ein kontrollierter Test bleibt erlaubt). Ausfallzeiten aus "questionnaire.absences" bevorzugt als Entlastung oder mit Körpergewichts-/Hotel-Einheiten.
   - R13: Nenne bei jedem abgeleiteten Wert Regel und Zahl, z. B. in "coachNotes" des Blocks "R6: 0,70 × 127,1 = 88,9 → 90 kg", und in "notes" des Plans Tier, Startumfang, Testwoche und die Markierungen aus "derived.flags".

## JSON Schema für "plan"
{{SCHEMA}}

## Leere Vorlage
{{VORLAGE}}
<!-- PROMPT-ENDE -->
