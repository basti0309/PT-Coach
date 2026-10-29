# Demo-Personas

`supabase/seed_personas.sql` (nach `supabase/seed.sql` ausführen) legt acht erfundene Kundinnen und Kunden an. Außerdem bekommen die Demo-Kunden Anna (K01) und Ben (K02) einen Fragebogen und passende Tests.
- Pläne werden **nicht** angelegt.
- Alle Konten liegen unter `demo.invalid` und können sich nicht anmelden.
- Entfernen: `supabase/seed_entfernen.sql`.

Die Personas decken alle fünf Ziele ab, Stufe 0 bis 2 nach R1, mit und ohne Gym, mit und ohne Einwilligung zu Gesundheitsangaben. Die Stufe hat die App selbst berechnet (`deriveAll`, Stand 29.10.2026). Alle Fragebögen sind vollständig (`missingAnswers` leer).

| Kürzel | Persona | Ziel | Stufe (R1) | Kernwerte | Gesundheit (mit Einwilligung) |
|---|---|---|---|---|---|
| K01 | Anna, 34, w | Laufen: erster Halbmarathon April 2027 < 2:00 h | 2 | 5 km 26:30, 10 km 56:10 (Mai), ca. 21 km/Woche, 3RM Kniebeuge 70 kg | – |
| K02 | Ben, 41, m | Kraft: Kreuzheben 3RM 160 kg | 0 | 86 kg; 3RM Bank 90 / Kreuzheben 140 kg; Kniebeuge 100 × 5 (RIR 0) | unterer Rücken (abgeklärt), Schlaf 7 h |
| K03 | Clara, 31, w | Hyrox: erster Start (Women Open), < 1:45 h | 1 | 66 kg, 5 km 27:45, ca. 14 km/Woche, Kraftsätze nur mit RIR 1–2 | – |
| K04 | David, 36, m | Hyrox: Wechsel zu Pro, < 1:15 h | 2 | Open 1:14:32 → 1:11:05 (Laufanteil ca. 49 %), 5 km 19:40, 5 km Rudern 19:50, 5 km SkiErg 21:30, 3RM 140/100/180 kg | Achillessehne (abgeklärt), HFmax 191 gemessen |
| K05 | Eva, 37, w | Laufen: Marathon April 2027 < 3:30 h | 2 | 10 km 44:50, HM 1:39:30, 5 km 21:05, ca. 52 km/Woche, längster Lauf 125 min | keine Beschwerden, HFmax 184 gemessen |
| K06 | Frank, 54, m | Laufen: 10-km-Firmenlauf durchlaufen | 0 | 88 kg (BMI 28,4), 5 km 33:40, 30 min submaximal 4,0 km | Knie (nicht abgeklärt, ohne Schmerz im Training), Schlaf 6,5 h |
| K07 | Gregor, 27, m | Muskelaufbau, Bank 100 kg | 1 | 79 kg; Kniebeuge 115 × 5, Bank 85 × 6 (RIR 0) → e1RM 129 / 99 kg; täglich Rad zur Uni | – |
| K08 | Hanna, 39, w | Kraft: sicher mit der Langhantel trainieren | 0 | 68 kg; 2–4 Monate Erfahrung (kein 3RM nach R4), Sätze mit RIR 2 | unterer Rücken (abgeklärt) |
| K09 | Ingo, 46, m | Abnehmen: 104 → 92 kg bis Juni 2027 | 0 | BMI 32,8; 106,5 kg vor 60 Tagen | Knie mit Schmerz (nicht abgeklärt), Schlaf 6 h |
| K10 | Jutta, 62, w | Fitness: Alpenüberquerung E5 im Juli 2027 | 1 | Nordic Walking/Rad ca. 150 min + 2× Kräftigung pro Woche | Schulter mit Schmerz (abgeklärt), HFmax 162 gemessen |

**Bewusst sichtbare Markierungen** (`derived.flags`): wenig Schlaf (K06, K09) und Schmerz im Training (K09, K10). Bei Ben weicht der eingestellte PAL (1,5) vom DGE-Vorschlag (1,4) ab.

## Abgleich mit Richtwerten

| Annahme | Richtwert | Quelle |
|---|---|---|
| Hyrox-Zeiten | Mediane: Open Men 1:22:59, Open Women 1:30:29, Pro Men 1:18:08; Laufen ca. 48–49 % der Zeit | [roxupdates.com/hyrox-times](https://www.roxupdates.com/hyrox-times) |
| Erster Hyrox einer Frau < 1:45 h | Erststarterinnen typisch 105–130+ min | [hycrew.com/hyrox/times](https://www.hycrew.com/hyrox/times) |
| 5-km-Zeiten | Frauen 30 J. „intermediate“ 26:07; Männer 50–54 J. Durchschnitt 34:30 | [runninglevel.com](https://runninglevel.com/running-times/5k-times), [marathonhandbook.com](https://marathonhandbook.com/how-long-does-it-take-to-run-a-5k) |
| 10-km-Zeiten | Frauen 30–39 J. Durchschnitt 58:00, „gut“ unter 49:00 | [live4well.io](https://www.live4well.io/en/blogs/sports/average-10k-time-by-age-and-gender) |
| Kraftwerte | Männer „intermediate“ Kniebeuge 131 kg, Bank 96 kg; Frauen „novice“ Kniebeuge 51 kg, Bank 33 kg | [strengthlevel.com](https://strengthlevel.com/strength-standards/squat-vs-bench-press/kg) |
| Marathon-Umfang | < 40 km/Woche langsamer, > 65 km/Woche schneller (Fokkema 2020); 3:30–4:00 h ≈ 50–60 km/Woche | [Fokkema 2020](https://pubmed.ncbi.nlm.nih.gov/32421886), [runnersconnect.net](https://runnersconnect.net/sub-3-marathon-training) |
| Gemessene HFmax | 208 − 0,7 × Alter, Streuung 7–11 Schläge/min | [Tanaka 2001](https://www.jacc.org/doi/10.1016/S0735-1097(00)01054-8) |
| Körpermaße | Frauen Ø 1,66 m / 69,7 kg; Männer Ø 1,79 m; 62,6 % der Männer BMI > 25, 19,9 % > 30 (Mikrozensus 2025) | [destatis.de](https://www.destatis.de/DE/Presse/Pressemitteilungen/Zahl-der-Woche/2026/PD26_23_p002.html) |
| Schlaf | 40- bis 50-Jährige unter der Woche etwas mehr als 6,5 h | [DIW/SOEP](https://www.diw.de/de/diw_01.c.410824.de/neue_soep-studie__40-50jaehrige_schlafen_am_kuerzesten.html) |
| SkiErg 5 km | Rangliste 2024: Platz ~350 bei ca. 20:00 (Rangliste selbst gemeldet, eher leistungsstarke Teilnehmer) | [log.concept2.com](https://log.concept2.com/rankings/2024/skierg/5000) |

**Ohne Quelle, angenommen:**
- Die 5-km-Ruderzeit von K04 (19:50) ist eine Annahme.
- Die Zeit für 100 Wall Balls (5:20) ist eine Annahme.
- Bens 3RM-Werte (Bank, Kreuzheben) und Annas Tests stammen unverändert aus `seed.sql`.
