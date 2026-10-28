# Regelwerk: vom Fragebogen zu Testwoche, Gewichten, Paces und Zeiten

**Wer macht was:**
- Die App rechnet alle Zahlen deterministisch (reine Funktionen mit Tests) und schreibt sie mit Regel-ID und Rechenweg in den Export (`client.derived`, siehe `src/lib/plan/derive.ts`).
- Die KI wendet die Regeln beim Planen an, rechnet nichts neu und nennt bei jedem Wert Regel und Zahl (R13).
- Der Coach prüft beide.

Kurzfassung für die KI: Regel 6 in [ki-prompt-vorlage.md](ki-prompt-vorlage.md) (Plan ändern) und Regel 12 in [ki-prompt-neuer-plan.md](ki-prompt-neuer-plan.md) (neuer Plan).
Durchgespielte Beispiele: [TESTPROFILE.md](TESTPROFILE.md).
Herkunft der Vorlagen-Angaben: [VORLAGEN-ANALYSE.md](VORLAGEN-ANALYSE.md).

**Kennzeichnung:**
- **Quelle**: aus einer Primärquelle (wörtliches Zitat oder Tabelle).
- **Vorlage**: aus den Excel-Vorlagen.
- **Festlegung**: Entscheidung ohne Literaturquelle; auch in [ANNAHMEN.md](ANNAHMEN.md) aufgeführt.

## Quellen

| Kürzel | Quelle | gelesen |
|---|---|---|
| McKay 2022 | McKay AKA, Stellingwerff T, Smith ES et al. Defining Training and Performance Caliber: A Participant Classification Framework. Int J Sports Physiol Perform 2022;17(2):317–331. doi:10.1123/ijspp.2021-0451 | Volltext (open access), Tabelle 1 |
| WHO 2020 | Bull FC et al. World Health Organization 2020 guidelines on physical activity and sedentary behaviour. Br J Sports Med 2020;54:1451–1462. doi:10.1136/bjsports-2020-102955 | Volltext |
| Brzycki 1993 | Brzycki M. Strength testing – predicting a one-rep max from reps-to-fatigue. JOPERD 1993;64(1):88–90 | Scan auf der Seite des Autors |
| Zourdos 2016 | Zourdos MC et al. Novel Resistance Training–Specific Rating of Perceived Exertion Scale Measuring Repetitions in Reserve. J Strength Cond Res 2016;30(1):267–275. doi:10.1519/JSC.0000000000001049 | Autorenmanuskript, Abb. 1 |
| Riegel 1981 | Riegel PS. Athletic Records and Human Endurance. American Scientist 1981;69(3):285–290 | Scan, Tabelle 1 |
| Mifflin 1990 | Mifflin MD, St Jeor ST et al. A new predictive equation for resting energy expenditure in healthy individuals. Am J Clin Nutr 1990;51(2):241–247. doi:10.1093/ajcn/51.2.241 | Abstract + Scan |
| DGE 2025 | DGE/ÖGE: Referenzwerte für die Nährstoffzufuhr, 3. Aufl. 2025; PAL-Tabelle auf dge.de (FAQ Energiezufuhr, Stand 10.09.2025) | Webseite der DGE (Buch nicht gelesen) |
| Foster 2001 | Foster C et al. A New Approach to Monitoring Exercise Training. J Strength Cond Res 2001;15(1):109–115 | Volltext |
| Foster 1998 | Foster C. Monitoring training in athletes with reference to overtraining syndrome. Med Sci Sports Exerc 1998;30(7):1164–1168 | nur zitierte Definition (Monotonie, Strain) |
| Haddad 2017 | Haddad M et al. Session-RPE Method for Training Load Monitoring. Front Neurosci 2017;11:612 | Wiedergabe der CR-10-Beschriftung (Sekundärquelle) |
| Riebe 2015 | Riebe D et al. Updating ACSM's Recommendations for Exercise Preparticipation Health Screening. Med Sci Sports Exerc 2015;47(11):2473–2479. doi:10.1249/MSS.0000000000000664 | Volltext |
| PAR-Q+ 2025 | PAR-Q+ Collaboration, eparmedx.com (Formular 2025; Warburton et al., Health Fit J Can 2011;4(2):3–23) | Formular + Nutzungsbedingungen |
| HYROX 26/27 | HYROX Rulebook Singles/Doubles 26/27, Stand 14.09.2026, maintain.hyrox.com/rulebooks/ | PDF, Kap. 4.1 und 8 |
| Watson 2015 | Watson NF et al. Recommended Amount of Sleep for a Healthy Adult. Sleep 2015;38(6):843–844. doi:10.5665/sleep.4716 | Volltext |

**Bewusst nicht verwendet:** VDOT (Daniels & Gilbert 1979, „Oxygen Power“) – die Primärquelle (Buch) war nicht verfügbar, die Formeln nur aus Sekundärquellen. Entscheidung der Betreiberin: Paces nur über Riegel und Vorlagen-Abstände.

---

## R1 Einstufung des Trainingszustands (`src/lib/calc/tier.ts`)

**Quelle (McKay 2022, Tab. 1):**
- Tier 0 „Do not meet minimum activity guidelines“.
- Tier 1 „Meet World Health Organization minimum activity guidelines: … at least 150 to 300 min moderate-intensity activity or 75–150 min of vigorous-intensity activity a week, plus muscle-strengthening activities 2 or more days a week“.
- Tier 2 „Local-level representation. Regularly training ∼3 times per week. Identify with a specific sport. Training with a purpose to compete.“ („No performance criteria or skill level is required“).
- Tier 3 „Competing at the national level … within ∼20% of world-record performance“.

**Rechnung** (Mittel der 4 Wochen aus `questionnaire.volume`):
1. Einheiten/Woche = Ø(Ausdauer-Einheiten + Kraft-Einheiten)
2. Ausdauer-Äquivalent = Ø(moderat) + 2 × Ø(intensiv) mit moderat = Ausdauer-Minuten − intensive Minuten.
   - **Quelle** WHO 2020: „150–300 min moderate … or 75–150 min vigorous … or an equivalent combination“.
   - Faktor 2 = 150/75.
3. Tier 2, wenn alle vier Bedingungen erfüllt sind:
   - Einheiten ≥ 3. Festlegung: „regularly ∼3 times“ als Mittelwert ≥ 3.
   - Sportart angegeben.
   - Wettkampf in den letzten 12 Monaten oder geplanter Wettkampf in `events`.
   - Wettkampfniveau mindestens „lokal“.
4. sonst Tier 1, wenn Äquivalent ≥ 150 min **und** Ø Krafteinheiten ≥ 2.
5. sonst Tier 0.
6. Tier 2 mit Niveau national/international: Hinweis „Tier 3+ möglich“. Automatisch vergibt die App höchstens Tier 2; Tier 3+ prüft der Coach (Weltbestleistungs-Kriterium).

**Beispiel:**
- 100 min moderat + 30 min intensiv: 100 + 2 · 30 = 160 ≥ 150.
- Mit 2 Krafteinheiten und ohne Wettkampf ergibt das Tier 1.

**Hinweis:** Wer viel läuft, aber kein Krafttraining macht und keinen Wettkampf plant, ist nach der strengen Lesart Tier 0. Siehe TESTPROFILE.md, Variante Läufer.

## R2 Startumfang und Skalierung

- **Vorgabe der Betreiberin:** Startumfang = aktueller Ist-Umfang.
- Woche 2 (nach der Testwoche) = Ø der 4 Wochen: Einheiten, Ausdauer-Minuten, Lauf-km, Krafteinheiten (`derived.startVolume`). Der lange Lauf startet mit `laufen.longestRunMinutes`.
- Obergrenze: Trainingstage × maximale Minuten pro Einheit. Liegt der Ist-Umfang darüber, setzt die App eine Markierung (`flags`).
- Danach steigt der Umfang so, wie es die gewählte Vorlage relativ von Woche zu Woche tut (**Vorlage**, Reihen in VORLAGEN-ANALYSE.md „Progressionen“). Die absoluten Umfänge der Vorlagen werden nicht übernommen.
- Wahl der Vorlage:
  - Hyrox: Base Builder für den Aufbau, Threshold Trainer vor dem Wettkampf.
  - Laufen: Tempo Runner.
  - Bei Kraft, Abnehmen und Fitness gibt es keine passende Vorlage. Dort übernimmt die KI nur die Testwoche und die Entlastungsmuster.
  - Die Wahl trifft der Coach in der Aufgabe an die KI.

## R3 Gesundheits-Screening (`src/lib/calc/screening.ts`)

**Quelle PAR-Q+ 2025:**
- „If you answered NO to all of the questions above, you are cleared for physical activity.“
- „If you answered YES to one or more … COMPLETE PAGES 2 AND 3.“
- Gültigkeit „valid for a maximum of 12 months“.

**Quelle Riebe 2015** (drei Faktoren: Aktivitätsniveau; Anzeichen/Symptome oder bekannte Herz-Kreislauf-, Stoffwechsel-, Nierenerkrankung; gewünschte Intensität):
- Aktiv, gesund: „may continue their usual exercise and progress gradually“.
- Aktiv mit Symptomen: „discontinue exercise and seek medical clearance before resuming exercise of any intensity“.
- Aktiv mit bekannter Erkrankung, ohne Symptome: leicht bis moderat ohne Freigabe, für hohe Intensität ärztliche Freigabe.
- Inaktiv, gesund: „may begin light- to moderate-intensity exercise without medical clearance“.
- Inaktiv mit Erkrankung oder Symptomen: „should seek medical clearance before starting an exercise program, regardless of the intensity“.

**Ablauf:**
1. Keine Einwilligung oder Angaben fehlen → Testwoche nur submaximal.
2. PAR-Q+ älter als 12 Monate → wie fehlend.
3. PAR-Q+ mit mind. einem Ja und keine ärztliche Abklärung in den letzten 12 Monaten → **keine Testwoche** (Vorgabe der Betreiberin).
4. ACSM-Fälle wie oben. Maximaltests gelten als hohe Intensität und sind nur bei „aktiv, gesund“ oder „aktiv mit Erkrankung/Symptomen + Freigabe“ erlaubt. Inaktive bekommen nie Maximaltests, auch nicht mit Freigabe, weil die Quelle zuerst eine schrittweise Steigerung verlangt.
5. Festlegung: Die ärztliche Freigabe gilt 12 Monate (angelehnt an Riebe „within the last 12 months“).

## R4 Testwoche je Ziel (`planTestWeek` in `src/lib/plan/derive.ts`)

**Festlegung der Betreiberin:**
- Zeit- und Ausdauertests maximal ab Tier 1.
- 3RM ab Tier 2 und mit ≥ 6 Monaten Erfahrung mit genau dieser Übung.
- Beides nur, wenn R3 Maximaltests erlaubt. Sonst gilt die submaximale Variante.

| Ziel | Tests (Vorlage) | maximal | submaximal |
|---|---|---|---|
| Hyrox | Woche 1 Base Builder/Threshold: 30-min-Lauf, 3RM Kreuzheben, 100 Wall Balls, 5 km Ski (sonst Rudern), 3RM Bankdrücken, 2 min Klimmzüge, 100 m Lunges, 5 min Burpees | wie Vorlage, Gewichte der Division (R8) | Lauf: 30 min gleichmäßig CR-10 ≤ 4 (`run_30min_submax`); Kraft: Satz 5–8 Wdh. bei RIR 2–3 (`*_reps`); übrige: ohne Zeitdruck CR-10 ≤ 4, kein Testwert |
| Laufen | 5-km-Zeitlauf (Tempo Runner Wo. 8/11); mit Gym 3RM Kreuzheben und Bankdrücken (Tempo Runner rechnet mit „% of max“) | wie Vorlage | wie oben |
| Kraft/Muskelaufbau | 3RM Kniebeuge, Bankdrücken, Kreuzheben, 2 min Klimmzüge | wie Vorlage | wie oben |
| Abnehmen, Fitness | 30 min gleichmäßig (Gehen oder Laufen), mit Gym Kraftsätze | – (Festlegung: Ziel braucht keinen Maximaltest) | wie oben |

**Zusätzlich:**
- Für alle Ziele gilt: Körpergewicht wird gemessen.
- Ohne Gym entfallen die Krafttests.
- Ohne SkiErg und Rudergerät entfällt der 5-km-Ergometertest.

**Quelle Zourdos 2016** (RIR-Skala):
- „RPE-10 = 0-RIR, RPE-9 = 1-RIR, and so forth“.
- Abb. 1: 8 = „2 repetitions remaining“, 7 = „3 repetitions remaining“.
- Ziel-RIR 2–3 entspricht also RPE 7–8.

**CR-10 ≤ 4** (Festlegung): „etwas schwer“ auf der Skala nach Foster 2001; das ist bewusst unterhalb von „schwer“ (5).

## R5 Geschätztes 1RM (`src/lib/calc/one-rep-max.ts`, `deriveStrength`)

**Quelle Brzycki 1993:**
- „PREDICTED 1-RM = Weight Lifted / (1.0278 − .0278X)“ (gleichwertig: w · 36 / (37 − X)).
- „only valid … when the number of reps-to-fatigue is less than 10“.

**Festlegung der Betreiberin:**
- e1RM **nur** aus Sätzen bis RIR 0 mit weniger als 10 Wdh. Ein 3RM-Test zählt als 3 Wdh. bis zur Erschöpfung.
- Sätze mit Reserve ergeben kein e1RM; die Gewichte laufen dann über Ziel-RIR.
- Es zählt der jüngste verwertbare Wert.

**Beispiel:** Kreuzheben 3RM 120 kg: 120 · 36 / 34 = 127,06 kg.

## R6 Gewichte

| Angabe in der Vorlage | Rechnung | Beispiel (e1RM 127,06 kg) |
|---|---|---|
| „around 70% of your deadlift max“ | 0,70 × e1RM | 88,94 → **90 kg** |
| „70-80% of max“ | 0,70 bzw. 0,80 × e1RM | 80 %: 101,65 → **102,5 kg** |
| „as if it were a 5 rep max effort“ (3×3) | Brzycki umgestellt: e1RM · (37 − 5) / 36 | 112,94 → **112,5 kg** |
| „2 reps shy of a max effort“ | Ziel-RIR 2 (Zourdos) | kein kg-Wert |
| „add 5-10 lb to your lift from last week“ | 5–10 × 0,45359237 kg | +2,27 bis +4,54 kg/Woche |

- Rundung auf 2,5 kg (Festlegung: kleinste übliche Scheibenpaar-Stufe).
- Ohne e1RM: Startlast = Last aus dem submaximalen Test, Steuerung über Ziel-RIR.

## R7 Paces und Zeiten (`src/lib/calc/paces.ts`, `src/lib/calc/riegel.ts`)

**Quelle Riegel 1981:**
- t = a·x^b, umgestellt T2 = T1 · (D2/D1)^b.
- Tabelle 1, Laufen, b:

| Gruppe | b | Datenbasis (Zeit) |
|---|---|---|
| Männer | 1,07732 | 3,5–129 min |
| Männer über 40 | 1,05352 | 3,9–131 min |
| Männer über 50 | 1,05374 | 4,2–145 min |
| Männer über 60 | 1,05603 | 4,9–168 min |
| Männer über 70 | 1,06370 | 5,4–189 min |
| Frauen | 1,08283 | 3,9–147 min |

- Für Frauen nennt die Tabelle keine Altersklassen. Ohne Geschlecht nutzt die App 1,08 (S. 287: „World-class runners, men and women, have an identical fatigue factor of 1.08“).
- Gültigkeit: Ausdauerbereich etwa 3,5–230 min. Die Distanzen der Tabelle reichen von 1,5 bis 42,2 km.
- **Markierungen:**
  - außerhalb 1,5–42,2 km oder 3,5–230 min → „außerhalb des Gültigkeitsbereichs“
  - über der Datenbasis der Tabelle → „Extrapolation, unsicher“
- Die bisherige App-Formel mit 1,06 stammt aus Riegels Runner's-World-Artikel von 1977 und wurde auf Wunsch der Betreiberin ersetzt; das gilt auch für die Prognosen unter „Fortschritt“.

**Referenzleistung:**
- Die jüngste von: 5-km-Test, 1-Meilen-Zeitlauf, 30-min-Test (gelaufene Meter in 1800 s), Bestzeit aus dem Fragebogen.
- Submaximale Tests zählen nie.

**Wettkampf-Äquivalente:** Meile (1609,344 m), 5 km, 10 km, Halbmarathon, Marathon.

**Trainings-Paces** (Vorlage; Abstand zur Wettkampf-Pace):

| Trainings-Pace | Basis | Abstand | Vorlage |
|---|---|---|---|
| locker | Pace der Referenzleistung | +120 bis +180 s/Meile | Base Builder: „Keep the pace 2-3 minutes above your time trial pace“ |
| locker | 10-km-Pace | +180 s/Meile | Tempo Runner: „3 minutes slower than 10k pace“ |
| Tempolauf | 10-km-Pace | +60 bis +90 s/Meile | Tempo Runner: „60-90 seconds slower than 10k pace“ |
| In and outs, langsam | 10-km-Pace | +90 bis +120 s/Meile | Tempo Runner: „90-120s slower than 10k pace“ |
| In and outs, schnell | 10-km-Pace | 0 | Tempo Runner: „1 mile run at 10k pace“ |
| 800-m-Intervalle | 5-km-Pace | 0 (oder schneller) | Tempo Runner: „hold 5k pace plus“ |

- Umrechnung s/Meile → s/km: × 1000/1609,344 = × 0,621371.
- **Annahme:** Wo die Vorlage keine Einheit nennt, gilt „pro Meile“, weil alle übrigen Pace-Angaben der Vorlagen in Meilen stehen („60s per mile“, „7 minute per mile pace“).

**Hyrox-Renn-Pace** („race pace“ in Threshold/Base Builder) = Laufzeit gesamt laut Ergebnisliste / 8 km (HYROX 26/27: „a 1 km run followed by 1 station, repeated 8 times“).
- Plausibilitätsprüfung (Festlegung): Ist die Hyrox-Laufpace schneller als die 10-km-Pace aus Riegel, markiert die App den Wert als unplausibel. 8 km im Wechsel mit Stationen sollten nicht schneller sein als ein 10-km-Lauf am Stück.

**Beispiel:**
- 5 km in 21:00, Mann unter 40: 10 km = 1260 · 2^1,07732 = 2658,7 s = 44:19 (4:26 min/km).
- Tempolauf = 265,87 + 60…90 · 0,621371 = 303,2…321,8 s/km = 5:03–5:22 min/km.

## R8 Hyrox-Gewichte (`src/lib/calc/hyrox.ts`)

**Quelle HYROX 26/27, Kap. 4.1 und 8:**

| Station | Women | Women Pro / Men | Men Pro |
|---|---|---|---|
| Sled Push 4 × 12,5 m (inkl. Schlitten) | 102 kg | 152 kg | 202 kg |
| Sled Pull 4 × 12,5 m (inkl. Schlitten) | 78 kg | 103 kg | 153 kg |
| Farmers Carry 200 m | 2 × 16 kg | 2 × 24 kg | 2 × 32 kg |
| Sandbag Lunges 100 m | 10 kg | 20 kg | 30 kg |
| Wall Balls 100 Wdh. | 4 kg | 6 kg | 9 kg |
| Wall-Ball-Ziel | 2,70 m | Women Pro 2,70 m / Men 3,00 m | 3,00 m |

- **Doubles:**
  - Doubles Women = Women.
  - Doubles Women Pro, Doubles Men und Doubles Mixed = mittlere Spalte.
  - Doubles Men Pro = Men Pro.
  - Zielhöhe je Person: Frauen 2,70 m, Männer 3,00 m.
- Relay ist nicht hinterlegt.
- SkiErg 1000 m, Rudern 1000 m und Burpee Broad Jumps 80 m sind in allen Divisionen gleich.
- In Testwoche und Training ersetzen diese Werte die lb-Angaben der Vorlagen für Hyrox-Stationen.

## R9 Herzfrequenz

- Die Vorlagen geben 60 / 70 / 80 / 85 / 87 / 90 % der maximalen Herzfrequenz an.
- Umgerechnet wird **nur mit gemessener HFmax** aus dem Fragebogen: Schläge = Prozent × HFmax, gerundet.
- Ohne gemessene HFmax bleibt die Vorlagen-Angabe als Text stehen, oder die KI nimmt Pace bzw. CR-10.
- Eine Schätzformel für die HFmax ist nicht vorgesehen (keine geprüfte Primärquelle im Regelwerk).

## R10 Kalorienbedarf (nur Abnehmen und Muskelaufbau)

**Quelle Mifflin 1990:**
- „REE (males) = 10 × weight (kg) + 6.25 × height (cm) − 5 × age (y) + 5“
- „REE (females) = … − 161“

**Gesamtbedarf** = Grundumsatz × palFactor (wie bisher in der App). Bei anderen Zielen ist `calorieNeed` im Export `null`.

**PAL-Vorschlag** (Quelle DGE 2025, Spannen 1,2–1,3 / 1,4–1,5 / 1,6–1,7 / 1,8–1,9 / 2,0–2,4):
- Vorschlag = Untergrenze der Spanne (Festlegung, eher vorsichtig).
- Zuschlag +0,3 bei Sport 4–5× pro Woche à 30–60 min (DGE: „kann zusätzlich pro Tag 0,3 PAL-Einheiten … hinzurechnen“).
- Obergrenze 2,5 (Datenbank).
- Weicht der eingestellte palFactor um ≥ 0,05 ab, setzt die App eine Markierung. Der Coach entscheidet.

**Beispiel:** Frau, 92 kg, 165 cm, 45 Jahre: 920 + 1031,25 − 225 − 161 = 1565,25 kcal; × 1,4 = 2191 kcal.

## R11 Entlastungswochen

**Vorlage:**
- Entlastung jede 4. bis 5. Woche (Tempo Runner Wo. 4/12, Threshold Wo. 5, Base Builder Wo. 8/13).
- Messbare Umfänge −33 bis −57 %, zwei Ruhetage.
- Ein kontrollierter Test mit ~90 % bleibt.

**Festlegung:** Reise- und Ausfallzeiten aus dem Fragebogen legt die KI bevorzugt in Entlastungswochen; für Zeiträume mit „Körpergewicht“ oder „Hotel-Gym“ plant sie passende Einheiten.

## R12 Rückmeldung per Session-RPE (`src/lib/calc/session-load.ts`)

**Quelle Foster 2001:**
- Skala „approximately 30 minutes following the conclusion of the training bout“, Frage „How was your workout?“.
- Last „by multiplying the duration of the exercise bout by the session RPE“.

**Quelle Foster 1998:**
- „monotony (daily mean/standard deviation), and strain (load * monotony)“.
- Tage ohne Einheit zählen mit 0. Die Standardabweichung ist die Populations-Standardabweichung über 7 Tage (Festlegung).

**Daten:**
- Nur manuell erfasste Einheiten (Entscheidung der Betreiberin, Strava-Constraint bleibt).
- Export: `trainingLoad.weeks` der letzten 4 Wochen.
- CR-10-Beschriftung laut Wiedergabe bei Haddad 2017 (die Abbildung bei Foster 2001 war nicht lesbar).

**Beispiel:** Mo 60 min × 6, Mi 50 × 6, Fr 70 × 6 → Last 1080; Monotonie 154,29 / 181,02 = 0,852; Strain 920,5.

## R13 Rechenweg

- Jeder Wert in `client.derived` hat `rule` und `steps` (Rechenweg in Worten und Zahlen).
- Die KI übernimmt die Zahlen und nennt sie mit Regel-ID:
  - in `notes` der Übung, z. B. „R6: 0,70 × 127,1 = 88,9 → 90 kg“
  - in `intensity` der Ausdauereinheit
  - in `notes` des Plans: Tier, Startumfang, Testwoche, Markierungen
- Fehlende Werte erfindet sie nicht, sondern nennt sie (`client.missing`).
