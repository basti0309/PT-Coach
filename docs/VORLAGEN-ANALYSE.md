# Auswertung der drei HYROX-Vorlagen

Grundlage: die drei Excel-Dateien der Betreiberin. Es sind Abschriften der App-Pläne „HYROX PRO – Base Builder“, „HYROX RUN – Tempo Runner“ und „HYROX PRO – Threshold Trainer“. Die Dateien liegen **nicht** im Repository. Hier steht nur, was für Fragebogen und Regelwerk gebraucht wird: Testwochen, Testarten, Intensitätsangaben, Progressionen und Entlastungswochen. Englische Zitate sind wörtlich aus den Vorlagen übernommen.

## Überblick

| Vorlage | Dauer | Trainingstage/Woche | Zielgruppe laut Vorlage |
|---|---|---|---|
| Base Builder | 13 Wochen | 6 (Wo. 1: 7; Wo. 8 und 13: 5) | Grundlagenaufbau Hyrox |
| Tempo Runner | 12 Wochen | 6 (Wo. 4 und 12: 5) | „for 5k-half marathon athletes“, „2-3 speed sessions a week“ |
| Threshold Trainer | 8 Wochen | 6 (Wo. 5: 5) | „race pace effort stamina“ |

## Testwochen und Testarten

**Base Builder Woche 1 = Threshold Trainer Woche 1** (gleicher Aufbau):

| Tag | Test | Wertung | Hinweise der Vorlage |
|---|---|---|---|
| 1 | 10 min Einlaufen, **30 min maximale Distanz**, 10 min Auslaufen | Distanz | „negative split“, Pulsuhr wenn möglich, Retest auf demselben Untergrund (Laufband) |
| 2 | 30 min locker laufen oder 60 min wandern | – | nach Befinden |
| 3 | **3RM Kreuzheben** (15 min) | Gewicht | „Be smart and safe … you aren't a powerlifter“ |
| 3 | **100 Wall Balls auf Zeit**, 20/14 lb (9,1/6,4 kg) | Zeit | danach 5–8 min Pause |
| 3 | **5 km SkiErg** (oder Rudern, Threshold: Rudern) | Zeit | 5–10 min Aufwärmen, „muscular endurance test“ |
| 4 | 30 min locker oder 60 min wandern | – | |
| 5 | **3RM Bankdrücken** (15 min) | Gewicht | |
| 5 | **2 min max. strikte Klimmzüge** | Wdh. | kein Kipping, Kinn über Stange, volle Streckung |
| 5 | **100 m Walking Lunge**, 65/45 lb (29,5/20,4 kg) auf dem Rücken | Zeit | Knie berührt den Boden |
| 5 | **5 min max. Bar-facing Burpees** | Wdh. | Stange mit 45-lb-Scheiben (20,4 kg) als Höhe |
| 6 | 90 min Wandern oder Rad, „RPE or heart rate below 70% effort“ | – | |

**Tempo Runner:** keine Testwoche am Anfang. Tests im Verlauf:
- Wo. 4 und 12: 1-Meilen-Zeitlauf („Run this at 90% plus. Leave a little in the tank“)
- Wo. 8: 5-km-Test („Push 90% of your capabilities“)
- Wo. 11: 5-km-Zeitlauf

Die Krafteinheiten setzen ein Kreuzheben- und Bankdrücken-Maximum voraus („around 70% of your deadlift max“).

**Base Builder Wo. 8:** 1-Meilen-Zeitlauf mit „9-10 RPE effort“. **Base Builder Wo. 13 / Threshold Wo. 8:** Hyrox-Simulation („90% effort“ bzw. „at 87% of your max heart rate“).

→ Daraus folgen die Testarten der App (`src/lib/plan/test-kinds.ts`): `run_30min`, `run_1mile`, `run_5k`, `deadlift_3rm`, `bench_3rm`, `wallballs_100`, `ski_5k`, `row_5k`, `pullups_2min`, `lunge_100m`, `burpee_bar_5min`. Die Gewichte der Tests werden durch die Gewichte der Division ersetzt (Regel R8).

## Intensitätsangaben

| Art | Formulierungen in den Vorlagen | Umsetzung im Regelwerk |
|---|---|---|
| Prozent Anstrengung | „50-70%“, „60-70% effort“, „70%“, „80% plus effort“, „90%“, „below 70%“ | bleibt als Text; ohne Quelle keine Umrechnung |
| Prozent HFmax | „60% of max heart rate“ (Erholung), „80-87%“, „87% of max heart rate“, „85% or less“, „90% of max heart rate“ | R9: nur mit gemessener HFmax in Schläge umrechnen |
| RPE | „RPE 6-7“, „9-10 RPE effort“ | bleibt als Text (Skala wird in der Vorlage nicht genannt) |
| Wettkampf-Paces | „race pace“, „5k pace“, „10k pace“, „mile pace“, „marathon pace“, „talk pace“ | R7: Riegel 1981 aus dem jüngsten Test; Hyrox-Renn-Pace aus der Laufzeit |
| Pace-Abstände | „Keep the pace 2-3 minutes above your time trial pace“ (BB), „3 minutes slower than 10k pace“, „60-90 seconds slower than 10k pace“, „90-120s slower than 10k pace“ (TR); „increase the pace by 60s per mile“, „cut down your pace by 30s per mile“ | R7: Abstand in s/Meile (wo keine Einheit steht: Annahme „pro Meile“) → s/km |
| Kraft absolut | „70% of your deadlift max“, „about 70% of your max bench press“, „70-80% of max“ | R6: x % × e1RM |
| Kraft relativ | „Lift these as if it were a 5 rep max effort“ (3×3), „Focus on being 2 reps shy of a max effort“, „you could do 2-3 more reps“ | R6: 5RM-Last nach Brzycki; RIR 2 bzw. 2–3 |
| Feste Gewichte | in lb, z. B. Wall Ball 20/14, KB 50/35, Thruster 135/95 | R8: bei Hyrox-Stationen durch Division ersetzen; sonst kg-Umrechnung der Abschrift |

## Progressionen

| Vorlage | Größe | Verlauf |
|---|---|---|
| Threshold | 1000-m-Intervalle im Renntempo | 5 → 6 → 7 → **3** → 8 → 9 → 10 (Wo. 2–8) |
| Threshold | langer Lauf 60–70 % | 60 → 70 → 80 → **40** → 80 → 80 → 80 min |
| Threshold | lange Radausfahrt (Samstag) | 120 → 135 → 150 → (Ruhetag) → 150 → 150 → 90 min „very easy“ (Wo. 2–8) |
| Threshold | AMRAP am Montag | 15 → 18 → 20 → **10** → 25 → 28 → 30 min |
| Base Builder | lockerer Lauf am Donnerstag | 45 → 50 → 50 → 65 → 65 → 70 min (Wo. 2–7); Bergläufe 70 → 75 → 75 → 75 min (Wo. 9–12) |
| Base Builder | Machine-Stamina-Tag | 5 × 10 min → 5 × 12 min → 30 + 20 + 20 min (Wo. 2–4); danach 30 min Lauf + 3–4 × 1000 m Ski + 20–30 min Rudern (Wo. 5–7) |
| Base Builder | Kraft | 3×3 / 3×5 / 3×8 gleichbleibend, Übungen wechseln alle 2–3 Wochen; „as if it were a 5 rep max“ |
| Tempo Runner | langer Lauf (Samstag) | 70 → 80 → 90 → 80 min (Wo. 5–8), dann 90 min (Wo. 9–10) |
| Tempo Runner | Tempolauf | 30 → 40 min (Wo. 9–10) |
| Tempo Runner | Kraft | „add 5-10 lb to your lift from last week“ (= +2,3–4,5 kg/Woche) |

## Entlastungswochen (Deload)

| Vorlage | Woche | Merkmale |
|---|---|---|
| Tempo Runner | 4 und 12 | „recovery week“: 2 Ruhetage, Meilen-Zeitlauf mit 90 %, Kraft 5×2 → 3×2 und 3×3 → 2×3 |
| Base Builder | 8 | 2 Ruhetage, 12 statt 19 Blöcke, Meilen-Zeitlauf |
| Base Builder | 13 | „Deload week!“: 9 Blöcke, 2 Ruhetage, wahlweise Hyrox-Simulation mit 90 % |
| Threshold | 5 | Intervalle 7 → 3, langer Lauf 80 → 40 min, schwerer Schlittenzug 5 × 10 m → 3 × 10 m, 2 Ruhetage, Simulation mit 90 % |

**Muster:**
- Entlastung jede 4. bis 5. Woche (Tempo Runner jede 4., Threshold nach 4 Wochen, Base Builder nach 7 bzw. 5 Wochen).
- Umfang −33 bis −57 % bei den messbaren Größen.
- Ein kontrollierter Test mit ~90 % bleibt erhalten.

## Wochenminuten (automatisch gezählt)

Gezählt sind nur Blöcke mit Minutenangabe im Titel (z. B. „45 minute easy run“, „15 minute AMRAP“, „2 hour bike ride“). Krafteinheiten und WODs ohne Zeitangabe fehlen. Die Zahlen eignen sich deshalb nur zum Vergleich von Woche zu Woche innerhalb einer Vorlage. Sie sind keine Gesamtumfänge.

| Woche | Tempo Runner (min / Blöcke) | Base Builder (min / Blöcke) | Threshold (min / Blöcke) |
|---|---|---|---|
| 1 | 210 / 16 | 237 / 15 | 200 / 14 |
| 2 | 215 / 19 | 175 / 19 | 280 / 24 |
| 3 | 280 / 21 | 182 / 19 | 570 / 22 |
| 4 | **190** / 16 | 170 / 19 | 657 / 22 |
| 5 | 250 / 17 | 145 / 21 | **260** / 17 |
| 6 | 260 / 17 | 205 / 19 | 720 / 22 |
| 7 | 270 / 17 | 210 / 19 | 718 / 21 |
| 8 | 255 / 16 | **170 / 12** | 620 / 21 |
| 9 | 355 / 13 | 97 / 24 | |
| 10 | 421 / 15 | 132 / 27 | |
| 11 | 135 / 16 | 90 / 27 | |
| 12 | **190** / 16 | 160 / 21 | |
| 13 | | **145 / 9** | |

**Daraus für R2:**
- Die Steigerung von Woche zu Woche ist in jeder Vorlage uneinheitlich, weil die Zählung zum Beispiel Kraft- und Stationstage auslässt.
- Das Regelwerk übernimmt deshalb nicht diese Minuten, sondern die einzelnen Reihen aus „Progressionen“.
- Startpunkt ist immer der Ist-Umfang des Kunden.
