# Testprofile – durchgespielt

Erzeugt mit `npm run testprofile:generate` aus `src/lib/plan/testprofile-fixtures.ts` und denselben Funktionen wie die App (`src/lib/plan/derive.ts`). Stichtag 2026-10-28. Die Zahlen prüft zusätzlich `src/lib/plan/derive.test.ts`.

**Alle mit „Annahme“ markierten Werte sind frei angenommen, damit sich die Regeln durchspielen lassen.**

## Tier-0-Einsteigerin, Ziel Abnehmen

Vorgegeben: Tier 0, Ziel Abnehmen

Annahmen:
- Annahme: weiblich, geboren 15.06.1981 (45 Jahre), 165 cm, 92 kg
- Annahme: Büro (DGE „sitzend“), kein Sport 4–5×/Woche, eingestellter PAL 1,4
- Annahme: kein Gym, 3 Trainingstage à max. 45 min
- Annahme: letzte 4 Wochen je 2 × 30 min Spazierengehen, kein Krafttraining, keine Wettkämpfe
- Annahme: PAR-Q+ am 20.10.2026 alle Nein; ACSM: nicht regelmäßig aktiv, keine Erkrankung, keine Symptome
- Annahme: Schlaf Ø 6,5 h, keine gemessene HFmax, Zielgewicht 80 kg

**R1 Einstufung:** Tier 0
   - Mittel der letzten 4 Wochen: 2 Einheiten/Woche (Ausdauer 2 + Kraft 0)
   - Ausdauer-Äquivalent (WHO): moderat 60 min + 2 × intensiv 0 min = 60 min
   - Tier 2 (Trained/Developmental): ≥ 3 Einheiten/Woche ✗, gezielte Sportart ✗, Training mit Wettkampfziel ✗, mindestens lokales Wettkampfniveau ✗
   - Tier 1 (Recreationally Active, WHO-Mindestempfehlung): ≥ 150 min Ausdauer-Äquivalent ✗, ≥ 2 Krafteinheiten/Woche ✗
   - → Tier 0 (Sedentary: WHO-Mindestempfehlung nicht erfüllt)
**R2 Startumfang:** 2 Einheiten, 60 min Ausdauer, 0 km, 0 × Kraft pro Woche
   - Startumfang = Mittel der letzten 4 Wochen: 2 Einheiten, 60 min Ausdauer, 0 km Laufen, 0 Krafteinheiten pro Woche
   - Obergrenze aus Trainingstagen × max. Minuten: 3 × 45 = 135 min/Woche
**R3 Screening:** Testwoche erlaubt, Maximaltests nicht erlaubt
   - PAR-Q+ vom 2026-10-20: alle Fragen mit Nein beantwortet; ärztliche Abklärung in den letzten 12 Monaten: nein
   - ACSM (Riebe 2015): regelmäßig aktiv nein, bekannte Herz-Kreislauf-/Stoffwechsel-/Nierenerkrankung nein, Anzeichen/Symptome nein
   - Inaktiv, gesund: „may begin light- to moderate-intensity exercise without medical clearance“, hohe Intensität erst nach schrittweiser Steigerung → nur submaximale Tests.
**R4 Testwoche:** 
   - Zeit-/Ausdauertests maximal: Screening ✗ und Tier ≥ 1 (0) ✗ → submaximal
   - Abnehmen/Fitness: Ausgangswerte ohne Maximaltest (Festlegung).

| Test | Variante | Ablauf | Grund |
|---|---|---|---|
| 30 min gleichmäßig (submaximal) | submaximal | 30 min gleichmäßig (Gehen oder Laufen), CR-10 ≤ 4; Meter notieren | Ziel braucht keinen Maximaltest |
| 3RM Kniebeuge | entfällt | – | kein Gym-Zugang |
| 3RM Bankdrücken | entfällt | – | kein Gym-Zugang |
| 3RM Kreuzheben | entfällt | – | kein Gym-Zugang |
| Körpergewicht | maximal | morgens nüchtern wiegen | Ausgangsgewicht |

**R5/R6 Kraft:**
- Kniebeuge: kein verwertbarer Kraftwert.
- Bankdrücken: kein verwertbarer Kraftwert.
- Kreuzheben: kein verwertbarer Kraftwert.
**R7 Paces:** keine Laufleistung als Referenz → nicht ableitbar.
**R9 Herzfrequenz:** keine gemessene HFmax → HF-Angaben der Vorlagen werden nicht in Schläge umgerechnet.
**R10 Kalorien:** 2191 kcal/Tag (Grundumsatz 1565 kcal)
   - Grundumsatz (Mifflin-St Jeor, Frauen) = 10 × Gewicht + 6,25 × Größe − 5 × Alter − 161
   - = 10 × 92 kg + 6,25 × 165 cm − 5 × 45 Jahre − 161
   - = 920 + 1.031,25 − 225 − 161 = 1.565,25 kcal
   - Gesamtbedarf = Grundumsatz × PAL = 1.565,25 × 1,4 = 2.191,35 kcal
   - PAL-Vorschlag: DGE-Spanne „ausschließlich sitzende Tätigkeit, wenig oder keine anstrengende Freizeitaktivität (z. B. Büro)“: 1,4–1,5; Vorschlag = Untergrenze 1,4
   - PAL-Vorschlag: kein Sportzuschlag
**Markierungen (unplausibel/prüfen):** 
- ⚠ Schlaf Ø 6,5 h < 7 h (AASM/SRS 2015) – Progression vorsichtig wählen (Coach-Entscheidung).

## Läufer an der Grenze Tier 1/2

Vorgegeben: Läufer, Tier 1/2

Annahmen:
- Annahme: männlich, geboren 10.03.1992 (34 Jahre), 182 cm, 75 kg
- Annahme: Büro, kein Sport 4–5×/Woche (nur 3 Läufe), eingestellter PAL 1,6
- Annahme: kein Gym, 3 Trainingstage à max. 75 min
- Annahme: letzte 4 Wochen je 3 Läufe, 180 min (davon 30 min intensiv), 25 km, kein Krafttraining
- Annahme: 10 km in 48:30 am 20.09.2026 (Volkslauf), Halbmarathon am 11.04.2027 geplant
- Annahme: PAR-Q+ am 15.10.2026 alle Nein; ACSM: regelmäßig aktiv, keine Erkrankung, keine Symptome; Schlaf Ø 7,5 h

**R1 Einstufung:** Tier 2
   - Mittel der letzten 4 Wochen: 3 Einheiten/Woche (Ausdauer 3 + Kraft 0)
   - Ausdauer-Äquivalent (WHO): moderat 150 min + 2 × intensiv 30 min = 210 min
   - Tier 2 (Trained/Developmental): ≥ 3 Einheiten/Woche ✓, gezielte Sportart ✓, Training mit Wettkampfziel ✓, mindestens lokales Wettkampfniveau ✓
   - → Tier 2
**R2 Startumfang:** 3 Einheiten, 180 min Ausdauer, 25 km, 0 × Kraft pro Woche
   - Startumfang = Mittel der letzten 4 Wochen: 3 Einheiten, 180 min Ausdauer, 25 km Laufen, 0 Krafteinheiten pro Woche
   - Obergrenze aus Trainingstagen × max. Minuten: 3 × 75 = 225 min/Woche
**R3 Screening:** Testwoche erlaubt, Maximaltests erlaubt
   - PAR-Q+ vom 2026-10-15: alle Fragen mit Nein beantwortet; ärztliche Abklärung in den letzten 12 Monaten: nein
   - ACSM (Riebe 2015): regelmäßig aktiv ja, bekannte Herz-Kreislauf-/Stoffwechsel-/Nierenerkrankung nein, Anzeichen/Symptome nein
   - Aktiv, gesund: „may continue their usual exercise and progress gradually“ → Maximaltests erlaubt.
**R4 Testwoche:** 
   - Zeit-/Ausdauertests maximal: Screening ✓ und Tier ≥ 1 (2) ✓ → maximal
   - Vorlage: Tempo Runner (5-km-Test/-Zeitlauf Wo. 8/11); Kraftwerte für „70 % of your deadlift max“.

| Test | Variante | Ablauf | Grund |
|---|---|---|---|
| 5-km-Testzeit | maximal | 15 min Einlaufen mit Steigerung bis Renntempo, 5–10 min Pause, 5 km gleichmäßig oder negativ gesplittet, 20–30 min Auslaufen/Gehen | Zeitlauf erlaubt |
| 3RM Kreuzheben | entfällt | – | kein Gym-Zugang |
| 3RM Bankdrücken | entfällt | – | kein Gym-Zugang |
| Körpergewicht | maximal | morgens nüchtern wiegen | Ausgangsgewicht |

**R5/R6 Kraft:**
- Kniebeuge: kein verwertbarer Kraftwert.
- Bankdrücken: kein verwertbarer Kraftwert.
- Kreuzheben: kein verwertbarer Kraftwert.
**R7 Paces (Riegel 1981):**

| Strecke | Zeit | Pace | im Gültigkeitsbereich |
|---|---|---|---|
| 1 Meile | 6:47 | 4:13 min/km | ja |
| 5 km | 22:59 | 4:36 min/km | ja |
| 10 km | 48:30 | 4:51 min/km | ja |
| Halbmarathon | 1:48:24 | 5:08 min/km | ja |
| Marathon | 3:48:45 | 5:25 min/km | ja |

| Trainings-Pace | Bereich | Einheit „pro Meile“ angenommen |
|---|---|---|
| locker (2–3 min langsamer als die Pace der Referenzleistung) | 6:06 min/km – 6:43 min/km | ja |
| locker (3 min langsamer als 10-km-Pace) | 6:43 min/km | ja |
| Tempolauf (60–90 s langsamer als 10-km-Pace) | 5:28 min/km – 5:47 min/km | ja |
| In and outs, langsame Meile (90–120 s langsamer als 10-km-Pace) | 5:47 min/km – 6:06 min/km | ja |
| In and outs, schnelle Meile (10-km-Pace) | 4:51 min/km | nein |
| 800-m-Intervalle (5-km-Pace oder schneller) | 4:36 min/km | nein |

   - Referenz: Bestzeit 10 km (Wettkampf) vom 2026-09-20 – 10 km in 48:30 (4:51 min/km)
   - Riegel 1981, Tabelle 1 (Männer): T2 = T1 · (D2/D1)^1,07732
   - 1 Meile: 48:30 · (1.609,3 / 10.000)^1,07732 = 6:47 → 4:13 min/km
   - 5 km: 48:30 · (5.000 / 10.000)^1,07732 = 22:59 → 4:36 min/km
   - 10 km: 48:30 · (10.000 / 10.000)^1,07732 = 48:30 → 4:51 min/km
   - Halbmarathon: 48:30 · (21.097,5 / 10.000)^1,07732 = 1:48:24 → 5:08 min/km
   - Marathon: 48:30 · (42.195 / 10.000)^1,07732 = 3:48:45 → 5:25 min/km
   - locker (2–3 min langsamer als die Pace der Referenzleistung): 4:51 min/km + 120–180 s/Meile × 0,62137 = 6:06 min/km bis 6:43 min/km (Einheit „pro Meile“ angenommen)
   - locker (3 min langsamer als 10-km-Pace): 4:51 min/km + 180 s/Meile × 0,62137 = 6:43 min/km (Einheit „pro Meile“ angenommen)
   - Tempolauf (60–90 s langsamer als 10-km-Pace): 4:51 min/km + 60–90 s/Meile × 0,62137 = 5:28 min/km bis 5:47 min/km (Einheit „pro Meile“ angenommen)
   - In and outs, langsame Meile (90–120 s langsamer als 10-km-Pace): 4:51 min/km + 90–120 s/Meile × 0,62137 = 5:47 min/km bis 6:06 min/km (Einheit „pro Meile“ angenommen)
   - In and outs, schnelle Meile (10-km-Pace): 4:51 min/km + 0 s/Meile × 0,62137 = 4:51 min/km
   - 800-m-Intervalle (5-km-Pace oder schneller): 4:36 min/km + 0 s/Meile × 0,62137 = 4:36 min/km
**R9 Herzfrequenz:** keine gemessene HFmax → HF-Angaben der Vorlagen werden nicht in Schläge umgerechnet.
**R10 Kalorien:** nicht berechnet (Ziel weder Abnehmen noch Muskelaufbau)
**Markierungen (unplausibel/prüfen):** 
- ⚠ R7: Marathon 3:48:45 liegt über der Datenbasis von Riegels Tabelle 1 (bis 129 min) – Extrapolation, unsicher.

### Variante: derselbe Läufer ohne Wettkampf

Ohne geplanten oder vergangenen Wettkampf: **Tier 0**. Die WHO-Ausdauerempfehlung ist erfüllt, aber ohne 2 Krafteinheiten pro Woche nicht die vollständige Mindestempfehlung (McKay Tier 1 verlangt beides). Folge: kein 5-km-Zeitlauf, nur submaximaler 30-min-Lauf.

## Profil des Coachs (Hyrox)

Vorgegeben: 68 kg, 5 km in 21:00, Hyrox 70:53

Annahmen:
- Annahme: männlich, geboren 01.05.1991 (35 Jahre), 178 cm
- Annahme: 5 km am 04.10.2026; Hyrox Men (Open) am 18.04.2026, davon Laufzeit 38:00
- Annahme: Büro, Sport 4–5×/Woche, eingestellter PAL 1,7; Gym mit Schlitten, SkiErg, Rudergerät, Wall Ball
- Annahme: 5 Trainingstage à max. 90 min; letzte 4 Wochen je 3 Ausdauereinheiten (200 min, davon 40 intensiv, 30 km) + 1 Krafteinheit
- Annahme: Kreuzheben 120 kg × 3 und Bankdrücken 70 kg × 5, jeweils bis RIR 0 (10.10.2026); 24 Monate Erfahrung je Übung
- Annahme: nächster Hyrox am 20.03.2027; PAR-Q+ am 15.10.2026 alle Nein; ACSM: aktiv, gesund; Schlaf Ø 7 h; keine HFmax

**R1 Einstufung:** Tier 2
   - Mittel der letzten 4 Wochen: 4 Einheiten/Woche (Ausdauer 3 + Kraft 1)
   - Ausdauer-Äquivalent (WHO): moderat 160 min + 2 × intensiv 40 min = 240 min
   - Tier 2 (Trained/Developmental): ≥ 3 Einheiten/Woche ✓, gezielte Sportart ✓, Training mit Wettkampfziel ✓, mindestens lokales Wettkampfniveau ✓
   - → Tier 2
**R2 Startumfang:** 4 Einheiten, 200 min Ausdauer, 30 km, 1 × Kraft pro Woche
   - Startumfang = Mittel der letzten 4 Wochen: 4 Einheiten, 200 min Ausdauer, 30 km Laufen, 1 Krafteinheiten pro Woche
   - Obergrenze aus Trainingstagen × max. Minuten: 5 × 90 = 450 min/Woche
**R3 Screening:** Testwoche erlaubt, Maximaltests erlaubt
   - PAR-Q+ vom 2026-10-15: alle Fragen mit Nein beantwortet; ärztliche Abklärung in den letzten 12 Monaten: nein
   - ACSM (Riebe 2015): regelmäßig aktiv ja, bekannte Herz-Kreislauf-/Stoffwechsel-/Nierenerkrankung nein, Anzeichen/Symptome nein
   - Aktiv, gesund: „may continue their usual exercise and progress gradually“ → Maximaltests erlaubt.
**R4 Testwoche:** 
   - Zeit-/Ausdauertests maximal: Screening ✓ und Tier ≥ 1 (2) ✓ → maximal
   - Vorlage: Woche 1 aus Base Builder / Threshold Trainer (Tag 1 Lauf, Tag 3 Kreuzheben + Wall Balls + Ski/Rudern, Tag 5 Bankdrücken + Klimmzüge + Lunges + Burpees, übrige Tage locker < 70 %).
   - Kreuzheben 3RM: Screening ✓, Tier ≥ 2 ✓, Erfahrung ≥ 6 Monate (24) ✓
   - Bankdrücken 3RM: Screening ✓, Tier ≥ 2 ✓, Erfahrung ≥ 6 Monate (24) ✓

| Test | Variante | Ablauf | Grund |
|---|---|---|---|
| 30-min-Lauf, max. Distanz | maximal | 10 min Einlaufen, 30 min maximale Distanz (negativ gesplittet), 10 min Auslaufen; Laufband nur, wenn auch der Retest dort stattfindet | Zeitlauf erlaubt |
| 3RM Kreuzheben | maximal | 15 Minuten zum Herantasten an das 3RM („Be smart and safe … you aren't a powerlifter“) | 3RM erlaubt |
| 100 Wall Balls auf Zeit | maximal | 100 Wall Balls auf Zeit mit dem Ball der Division, danach 5–8 min Pause | maximaler Test erlaubt |
| 5 km SkiErg | maximal | 5 km SkiErg nach 5–10 min lockerem Aufwärmen | maximaler Test erlaubt |
| 3RM Bankdrücken | maximal | 15 Minuten zum Herantasten an das 3RM („Be smart and safe … you aren't a powerlifter“) | 3RM erlaubt |
| Strikte Klimmzüge in 2 min | maximal | 2 min max. strikte Klimmzüge (Kinn über Stange, volle Streckung), danach 5 min Pause | maximaler Test erlaubt |
| 100 m Walking Lunge | maximal | 100 m Walking Lunges mit dem Sandsack-Gewicht der Division, Knie berührt den Boden | maximaler Test erlaubt |
| Bar-facing Burpees in 5 min | maximal | 5 min max. Bar-facing Burpees über die Hantelstange | maximaler Test erlaubt |
| Körpergewicht | maximal | morgens nüchtern wiegen | Ausgangsgewicht |

**R5/R6 Kraft:**
- Kniebeuge: kein verwertbarer Kraftwert.
- Bankdrücken: e1RM 78,8 kg; 70 % e1RM = 55 kg; 80 % e1RM = 62,5 kg; 5RM-Last („as if it were a 5 rep max“) = 70 kg
   - Bankdrücken 70 kg × 5 (bis RIR 0, 2026-10-10)
   - e1RM (Brzycki) = 70 / (1,0278 − 0,0278 × 5) = 70 · 36 / 32 = 78,75 kg
   - 70 % e1RM: 0,70 × 78,75 = 55,13 → 55 kg (gerundet auf 2,5 kg)
   - 80 % e1RM: 0,80 × 78,75 = 63 → 62,5 kg (gerundet auf 2,5 kg)
   - 5RM-Last („as if it were a 5 rep max“): 78,75 · 32 / 36 = 70 → 70 kg (gerundet auf 2,5 kg)
   - Wochensteigerung laut Tempo Runner „add 5-10 lb“: 5 × 0,45359 = 2,27 kg bis 10 × 0,45359 = 4,54 kg
- Kreuzheben: e1RM 127,1 kg; 70 % e1RM = 90 kg; 80 % e1RM = 102,5 kg; 5RM-Last („as if it were a 5 rep max“) = 112,5 kg
   - Kreuzheben 120 kg × 3 (bis RIR 0, 2026-10-10)
   - e1RM (Brzycki) = 120 / (1,0278 − 0,0278 × 3) = 120 · 36 / 34 = 127,06 kg
   - 70 % e1RM: 0,70 × 127,06 = 88,94 → 90 kg (gerundet auf 2,5 kg)
   - 80 % e1RM: 0,80 × 127,06 = 101,65 → 102,5 kg (gerundet auf 2,5 kg)
   - 5RM-Last („as if it were a 5 rep max“): 127,06 · 32 / 36 = 112,94 → 112,5 kg (gerundet auf 2,5 kg)
   - Wochensteigerung laut Tempo Runner „add 5-10 lb“: 5 × 0,45359 = 2,27 kg bis 10 × 0,45359 = 4,54 kg
**R7 Paces (Riegel 1981):**

| Strecke | Zeit | Pace | im Gültigkeitsbereich |
|---|---|---|---|
| 1 Meile | 6:12 | 3:51 min/km | ja |
| 5 km | 21:00 | 4:12 min/km | ja |
| 10 km | 44:19 | 4:26 min/km | ja |
| Halbmarathon | 1:39:03 | 4:42 min/km | ja |
| Marathon | 3:29:00 | 4:57 min/km | ja |

| Trainings-Pace | Bereich | Einheit „pro Meile“ angenommen |
|---|---|---|
| locker (2–3 min langsamer als die Pace der Referenzleistung) | 5:27 min/km – 6:04 min/km | ja |
| locker (3 min langsamer als 10-km-Pace) | 6:18 min/km | ja |
| Tempolauf (60–90 s langsamer als 10-km-Pace) | 5:03 min/km – 5:22 min/km | ja |
| In and outs, langsame Meile (90–120 s langsamer als 10-km-Pace) | 5:22 min/km – 5:40 min/km | ja |
| In and outs, schnelle Meile (10-km-Pace) | 4:26 min/km | nein |
| 800-m-Intervalle (5-km-Pace oder schneller) | 4:12 min/km | nein |
| Hyrox-Renn-Pace | 4:45 min/km | – |

   - Referenz: 5-km-Test vom 2026-10-04 – 5 km in 21:00 (4:12 min/km)
   - Riegel 1981, Tabelle 1 (Männer): T2 = T1 · (D2/D1)^1,07732
   - 1 Meile: 21:00 · (1.609,3 / 5.000)^1,07732 = 6:12 → 3:51 min/km
   - 5 km: 21:00 · (5.000 / 5.000)^1,07732 = 21:00 → 4:12 min/km
   - 10 km: 21:00 · (10.000 / 5.000)^1,07732 = 44:19 → 4:26 min/km
   - Halbmarathon: 21:00 · (21.097,5 / 5.000)^1,07732 = 1:39:03 → 4:42 min/km
   - Marathon: 21:00 · (42.195 / 5.000)^1,07732 = 3:29:00 → 4:57 min/km
   - locker (2–3 min langsamer als die Pace der Referenzleistung): 4:12 min/km + 120–180 s/Meile × 0,62137 = 5:27 min/km bis 6:04 min/km (Einheit „pro Meile“ angenommen)
   - locker (3 min langsamer als 10-km-Pace): 4:26 min/km + 180 s/Meile × 0,62137 = 6:18 min/km (Einheit „pro Meile“ angenommen)
   - Tempolauf (60–90 s langsamer als 10-km-Pace): 4:26 min/km + 60–90 s/Meile × 0,62137 = 5:03 min/km bis 5:22 min/km (Einheit „pro Meile“ angenommen)
   - In and outs, langsame Meile (90–120 s langsamer als 10-km-Pace): 4:26 min/km + 90–120 s/Meile × 0,62137 = 5:22 min/km bis 5:40 min/km (Einheit „pro Meile“ angenommen)
   - In and outs, schnelle Meile (10-km-Pace): 4:26 min/km + 0 s/Meile × 0,62137 = 4:26 min/km
   - 800-m-Intervalle (5-km-Pace oder schneller): 4:12 min/km + 0 s/Meile × 0,62137 = 4:12 min/km
   - Hyrox-Renn-Pace: Laufzeit 38:00 / 8 km = 4:45 min/km
**R8 Hyrox (Men (Open)):** Sled Push 152 kg, Sled Pull 103 kg, Farmers 2 × 24 kg, Sandsack 20 kg, Wall Ball 6 kg auf 3 m
**R9 Herzfrequenz:** keine gemessene HFmax → HF-Angaben der Vorlagen werden nicht in Schläge umgerechnet.
**R10 Kalorien:** nicht berechnet (Ziel weder Abnehmen noch Muskelaufbau)
**Markierungen (unplausibel/prüfen):** 
- ⚠ R7: Marathon 3:29:00 liegt über der Datenbasis von Riegels Tabelle 1 (bis 129 min) – Extrapolation, unsicher.

### Vergleich: dieselben Werte mit Geschlecht weiblich

- Riegel-Exponent Frauen 1,08283: 10 km 44:29, Halbmarathon 1:39:50
- Hyrox Women (Open): Sled Push 102 kg, Wall Ball 4 kg; Women Pro: Sled Push 152 kg, Wall Ball 6 kg
- Grundumsatz nur zum Vergleich (wird bei Ziel Hyrox nicht exportiert, R10): männlich 1.622,5 kcal, weiblich 1.456,5 kcal
