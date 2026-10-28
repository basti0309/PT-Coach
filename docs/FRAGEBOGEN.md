# Kunden-Fragebogen

Der Kunde füllt den Fragebogen im Profil aus (`/kunde/profil/fragebogen`). Der Coach sieht ihn unter dem Reiter „Fragebogen“ des Kunden. Die App wird nicht gesperrt: Der Kunde sieht, was fehlt, und der Coach sieht den Status in der Kundenliste (`missingAnswers()` in `src/lib/questionnaire/completeness.ts`).

Grundsätze:
- Jede Frage steuert eine Planentscheidung; die Regel-IDs verweisen auf [REGELWERK.md](REGELWERK.md).
- Gefragt werden Rohdaten, keine Selbsteinschätzung.
- Der Kunde sieht nur die Fragen für sein Ziel.
- Stammdaten, die es schon gab, werden weiter genutzt und nicht doppelt abgefragt.

**Speicherorte:**
- `client_profiles`: Stammdaten (wie bisher)
- `test_results`: Gewicht, Tests, Kraftwerte
- `client_questionnaires.answers` (jsonb): Fragebogen; Validierung in `src/lib/questionnaire/schema.ts`
- `client_health.data` (jsonb): Gesundheitsangaben, nur mit Einwilligung
- `health_consents`: Einwilligung

**Export** (`client`, exportVersion 2): `questionnaire` = Antworten, `health` = Gesundheitsangaben (nur mit Einwilligung), `missing` = fehlende Pflichtangaben, `derived` = berechnete Werte mit Rechenweg, `trainingLoad` = Session-RPE.

## A. Stammdaten (vorhandene Felder)

| Frage | Feld (Export) | Typ | Pflicht | Steuert |
|---|---|---|---|---|
| Geschlecht | `sex` | `"m" \| "w"` | ja | R7 Riegel-Exponent, R8 Division, R10 Mifflin-Konstante |
| Geburtsdatum | `age` (nur Alter exportiert) | Datum → Jahre | ja | R7 Altersklasse (Männer 40+), R10 |
| Größe | `heightCm` | Zahl 100–250 | ja | R10 |
| Körpergewicht | `currentWeightKg` (jüngster Test `body_weight`) | kg | ja | R10, Ausgangswert Abnehmen |
| Equipment zu Hause | `equipmentHome` | Text | nein | Übungsauswahl zu Hause (KI, Regel 4 der Vorlage) |
| Gym-Zugang | `gymAccess` | ja/nein | ja | R4: Krafttests möglich; Kraftfragen bei Hyrox/Laufen |
| Trainingstage pro Woche | `trainingDaysPerWeek` | 1–7 | ja | R2 Obergrenze, Wochenaufteilung |
| Max. Zeit pro Einheit | `maxMinutesPerWorkout` | 10–300 min | ja | R2 Obergrenze, Länge der Einheiten |
| Aktivitätsfaktor | `palFactor` | 1,0–2,5 | (Standard 1,5) | R10 (die App schlägt einen Wert vor, s. u.) |

## B. Alle Ziele

| Frage | Feld `questionnaire.` | Typ | Pflicht | Steuert |
|---|---|---|---|---|
| Hauptziel | `goal` | `hyrox` \| `laufen` \| `kraft_muskelaufbau` \| `abnehmen` \| `fitness_gesundheit` | ja | Zweig, Vorlage, R4 Testwoche, R10 ja/nein |
| Mögliche Wochentage | `weekdays` | Liste 1–7 (Mo–So) | ja | Lage der Einheiten und Ruhetage |
| Termine/Wettkämpfe | `events[]` {date, kind, name, detail} | Liste | nein | Planende/Taper; „Training mit Wettkampfziel“ (R1 Tier 2) |
| Reisen/Ausfallzeiten | `absences[]` {from, to, option: keine/koerpergewicht/hotel_gym} | Liste | nein | R11 Lage der Entlastungswoche, Ersatzeinheiten |
| Beruf und Alltag | `workActivity` | 5 DGE-Stufen | ja | R10 PAL-Vorschlag |
| Sport 4–5× pro Woche à 30–60 min | `sportOften` | ja/nein | ja | R10 PAL +0,3 |
| Training je Woche, letzte 4 Wochen | `volume[4]` {enduranceSessions, enduranceMinutes, vigorousMinutes, runKm, strengthSessions} | Zahlen | ja | R1 (WHO-Richtwert, Einheiten/Woche), **R2 Startumfang = Mittel** |
| Gezielt betriebene Sportart | `mainSport` | Text (leer = keine) | nein | R1 Tier 2 („Identify with a specific sport“) |
| Wettkampf in den letzten 12 Monaten | `competedLast12Months` | ja/nein | ja | R1 Tier 2 („Training with a purpose to compete“) |
| Höchstes Wettkampfniveau | `competitionLevel` | keins/lokal/regional/national/international | ja | R1 Tier 2 (lokal) bzw. Hinweis Tier 3+ |

## C. Verzweigung nach Ziel

| Zweig | Frage | Feld `questionnaire.` | Pflicht | Steuert |
|---|---|---|---|---|
| Hyrox | Geplante Division | `hyrox.division` (9 Divisionen Singles/Doubles) | ja | R8 Stationsgewichte, R4 Testgewichte |
| Hyrox | Geräte (Schlitten, SkiErg, Rudergerät, Wall Ball) | `hyrox.equipment` | ja | R4 Ski- oder Rudertest; Ersatzübungen |
| Hyrox | Ergebnisse {Datum, Division, Gesamtzeit, Laufzeit gesamt} | `hyrox.results[]` | nein | R7 Hyrox-Renn-Pace (nur mit Laufzeit) |
| Laufen | Bestzeiten {Strecke, Zeit, Datum, Wettkampf/Training} | `laufen.bests[]` | mind. 1 | R7 Referenz für Riegel (jüngste Leistung) |
| Laufen | Längster Lauf der letzten 4 Wochen | `laufen.longestRunMinutes` | ja | Startdauer des langen Laufs |
| Laufen | Zielwettkampf {Strecke, Datum, Zielzeit} | `laufen.targetRace` | nein | Planende, Wettkampf-Pace |
| Kraft/Muskelaufbau; Hyrox/Laufen mit Gym | Monate Erfahrung je Übung (Kniebeuge, Bankdrücken, Kreuzheben) | `liftExperienceMonths` | ja | R4 3RM erlaubt (≥ 6 Monate) |
| Kraft/Muskelaufbau; Hyrox/Laufen mit Gym | Kraftwerte „Gewicht × Wdh. × RIR“, Datum | Tests `squat_reps`, `bench_reps`, `deadlift_reps` (`tests[]`: value, reps, rir) | nein | R5 e1RM (nur RIR 0, < 10 Wdh.), sonst Gewichte über Ziel-RIR |
| Abnehmen, Muskelaufbau | Ernährungsweise, Unverträglichkeiten | `diet` | ja | Ernährungsziele des Coaches (`nutritionTargets`) |
| Abnehmen, Muskelaufbau | Zielgewicht, bis wann | `weightGoal` | nein | Zeitrahmen der Ernährungsziele (Coach) |
| Abnehmen, Fitness | Bevorzugte Ausdauersportarten | `enduranceSports` (Werte aus `SPORTS`) | ja | Sportart der Ausdauereinheiten |

**Abweichung von der Vorgabe:** Die Ernährungsweise wird nur bei Abnehmen und Muskelaufbau abgefragt. Bei den anderen Zielen steuert sie keine Planentscheidung (Anforderung 1: Fragen ohne Entscheidung streichen).

**Nicht abgefragt, weil keine Regel sie nutzt:** Selbsteinschätzung des Fitnessniveaus, Taillenumfang, Lieblingsübungen, Export von Sportuhr oder Strava (auf Wunsch der Betreiberin gestrichen; Strava-Werte bleiben ohnehin aus dem Export, siehe CLAUDE.md).

## D. Gesundheit (nur mit Einwilligung)

| Frage | Feld `health.` | Pflicht | Steuert |
|---|---|---|---|
| PAR-Q+ ausgefüllt am / Ergebnis „alle Nein“ oder „mind. ein Ja“ | `parq` {date, result} | ja | R3: mind. ein Ja ohne Abklärung → keine Testwoche; älter als 12 Monate → neu |
| Ärztlich abgeklärt / freigegeben am | `medicalClearance` {date} | nein | R3 (gilt 12 Monate) |
| ACSM 1: seit ≥ 3 Monaten an ≥ 3 Tagen/Woche je ≥ 30 min moderat aktiv? | `acsm.regularlyActive` | ja | R3 |
| ACSM 2: bekannte Herz-Kreislauf-, Stoffwechsel- (Diabetes Typ 1/2) oder Nierenerkrankung? | `acsm.knownDisease` | ja | R3 |
| ACSM 3: Anzeichen oder Symptome (Liste nach Riebe et al. 2015)? | `acsm.symptoms` | ja | R3 |
| Beschwerden {Region, seit, Schmerz beim Training, abgeklärt, auslösende Übungen} | `complaints[]` | nein | Übungsausschluss/-ersatz (Hinweis in `derived.flags`) – keine Diagnose |
| Schlaf pro Nacht (Ø 4 Wochen) | `sleepHours` | ja | Hinweis bei < 7 h (Watson et al. 2015) für vorsichtige Progression |
| Gemessene maximale Herzfrequenz | `hrMax` | nein | R9: HF-Prozentangaben der Vorlagen in Schläge umrechnen |

**PAR-Q+:**
- Die App verlinkt nur das offizielle PDF (eparmedx.com, Version 2025) und erfasst Datum und Ergebnis.
- Laut Nutzungsbedingungen ist ohne schriftliche Erlaubnis der PAR-Q+ Collaboration kein Einbau in elektronische Formulare oder Apps erlaubt („may not be incorporated into electronic surveys … without the express written consent“).
- Die kostenlose Nutzung gilt laut Bedingungen für „eligible individual, clinical, educational, and non-commercial research purposes“. Ob die Nutzung im PT-Betrieb darunter fällt, muss die Betreiberin klären (Kontakt: eparmedx@gmail.com).

## E. Einwilligung (Art. 9 Abs. 2 lit. a DSGVO)

- **Eigener Schritt**, Kästchen nicht vorausgewählt (ErwG 32). Nur der Kunde selbst kann einwilligen; die Datenbank-Policy erlaubt dem Coach das nicht.
- Text in `CONSENT_TEXT`, gespeichert wird `consent_version` mit Zeitpunkt. So lässt sich nach Art. 7 Abs. 1 nachweisen, wer wann eingewilligt hat.
- Der Widerruf ist ebenso einfach wie die Einwilligung: ein Button im Fragebogen (Art. 7 Abs. 3). Ein Datenbank-Trigger löscht dabei sofort `client_health`.
- Ohne Einwilligung bleibt die App nutzbar (Art. 7 Abs. 4). Die Gesundheitsangaben werden dann nicht gespeichert, und Maximaltests sind nicht vorgesehen (R3).
- Gesundheitsangaben gehen nur in den Plan-/Profil-Export an die KI, **nie** in den Chat-Kontext.
- **Hinweis:** Den Einwilligungstext sollte jemand mit Datenschutz-Kenntnis prüfen. Er ersetzt keine Datenschutzerklärung.

## F. Session-RPE nach jeder Einheit

Feld `workout_logs.session_rpe` (0–10, CR-10 nach Foster 2001), optional:
- **Kraft/WOD:** Der Kunde trägt zusätzlich die Dauer in Minuten ein (sonst gibt es dort keine Dauer).
- **Nur bei manuell erfassten Einheiten:** Bei Strava-Einheiten verhindert die Datenbank den Eintrag (Entscheidung der Betreiberin).
- **Steuert:** R12, Grundlage für die Anpassungen durch den Coach.
