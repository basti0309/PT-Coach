# Annahmen

Hier steht jede Entscheidung, die der Auftrag offen ließ. Bitte prüfen – alles ist änderbar.

## Konten und Anmeldung
1. **Erster Coach-Account:** Wer sich mit der Adresse aus der Umgebungsvariable `COACH_EMAIL` anmeldet, wird automatisch Coach (Konto wird beim ersten Login-Versuch angelegt). Ein eigener „Setup“-Button war dafür nicht möglich, weil der Coach-Bereich vor dem ersten Login nicht erreichbar ist.
2. **Kundenkonten** entstehen auf zwei Wegen: Der Coach legt sie an (Name, E-Mail, Kürzel), oder Interessenten **registrieren sich selbst mit einem Einladungscode**, den der Coach unter „Einrichtung“ festlegt (ohne gesetzten Code ist die Registrierung geschlossen). Selbst registrierte Konten sind sofort aktiv; das Kürzel wird aus den Initialen erzeugt (bei Bedarf mit Zahl). Login-Anfragen für unbekannte Adressen werden still ignoriert (gleiche Meldung, damit niemand herausfinden kann, wer Kunde ist). Groß-/Kleinschreibung des Codes ist egal.
3. **Anmeldung per Link oder 6-stelligem Code** aus derselben E-Mail. Der Code ist nötig, weil eine installierte PWA (vor allem auf dem iPhone) eigene Cookies hat und ein Link aus der Mail-App im normalen Browser landen würde.
4. **Kürzel** für die Pseudonymisierung vergibt der Coach beim Anlegen (Vorschlag: Initialen).

## Daten und Rechte
5. **Kundenprofil bearbeiten:** Kunde und Coach dürfen die Stammdaten ändern; **Nährstoffziele** setzt nur der Coach (per Datenbank-Trigger erzwungen). Der PAL-Faktor ist von beiden wählbar.
6. **Geburtsdatum** wird gespeichert, das Alter daraus tagesaktuell berechnet (für Kalorienbedarf, Profil und Export). Exportiert und an die KI übergeben wird nur das Alter, nicht das Geburtsdatum.
7. **Geschlecht** nur `männlich`/`weiblich`, weil die Mifflin-St-Jeor-Formel nur diese beiden Varianten kennt.
8. **Körpergewicht und Mobility** werden wie die Testwerte als datierte Historie gespeichert (Gewicht ändert sich; „Testwerte mit Datum als Historie“). Größe, Geburtsdatum, Geschlecht usw. sind normale Profilfelder.
9. **Testwerte werden nie überschrieben**, nur neu angelegt. Falsch eingetragene Werte können gelöscht werden.
10. **Kundennachrichten** schreibt nur der Server in die Datenbank (nicht der Browser direkt). So kann keine Nachricht am KI-Vorfilter vorbei gelangen.
11. **Strava-Einheiten für den Coach:** sichtbar sind Datum, Dauer, Erledigt-Status und die grobe Sportart-Kategorie (z. B. „Laufen“) – die Kategorie wird für die Zuordnung zur geplanten Einheit und für den Trainingszeit-Graphen je Sportart gebraucht. Nicht sichtbar: Distanz, Herzfrequenz, Abweichungen, Startuhrzeit, Strava-Sportart im Detail, Test-Markierung.
12. Der **Name der Strava-Aktivität** wird gar nicht gespeichert (nicht in der Liste der erlaubten Felder).

## Demo-Daten
13. Die Demo-Konten (`@demo.invalid`) können sich nicht anmelden; sie dienen als Anschauungsmaterial im Coach-Bereich. Entfernen mit `supabase/seed_entfernen.sql`.

## Pläne
14. **Tage im Plan** sind „Tag 1–7 der Planwoche“, gezählt ab dem Startdatum des Plans (Tag 1 = Wochentag des Startdatums). Damit hat jede Einheit ein festes Datum, das für die Strava-Zuordnung („gleicher Tag“, „gleiche Planwoche“) nötig ist.
15. **Wiederholungen** sind eine feste Zahl je Übung (keine Spannen wie „8–12“). Spannen/Hinweise gehören ins Feld „Hinweis“.
16. **Ausdauer-Intensität** ist ein Pflicht-Freitext (z. B. „locker (Zone 2)“), die Beschreibung optional.
17. **Einheiten-IDs** (z. B. `w1d2-lauf`) müssen im Plan eindeutig sein und bleiben bei Änderungen gleich, damit erfasste Trainings ihrer Einheit zugeordnet bleiben. Der KI-Prompt weist darauf hin.
18. **Ein aktiver Plan je Kunde.** Ein neu angelegter Plan wird automatisch aktiv; ältere Pläne bleiben erhalten und können wieder aktiv gesetzt werden.
19. **Import** übernimmt nur den Plan-Teil. Der Profil-Teil einer importierten Export-Datei wird ignoriert (das Profil pflegt man in der App).
20. **JSON Schema und Zod sind gleichwertig**, `docs/plan-schema.json` wird aus Zod erzeugt. Sieben Zusatzregeln (IDs eindeutig, Wochen eindeutig, Tage je Woche eindeutig, Ausdauer mit Dauer und/oder Distanz, Block-Kennungen je Einheit eindeutig, Ruhetag mit Titel oder Hinweis, Gewicht mit mindestens einem Wert) kann JSON Schema nicht ausdrücken; sie stehen in den Beschreibungen des Schemas und werden in der App zusätzlich geprüft.
21. **Pseudonymisierung** ersetzt Name durch Kürzel und lässt die E-Mail weg. Freitexte (Notizen) werden unverändert exportiert – dort sollten keine Namen stehen (Hinweis in der App).
22. Ein **neuer Plan** startet mit einer leeren Woche 1; Inhalte kommen über Editor oder Import – oder er entsteht direkt aus einer KI-Antwort („Neuer Plan mit KI“, siehe unten).

## Trainingserfassung
23. **Vorbefüllung ohne Historie:** Gibt es für eine Übungs-ID noch keine Werte, stehen die Plan-Vorgaben (Zielgewicht, Wdh.) als Platzhalter im Feld.
24. **Abhaken mit leeren Feldern** übernimmt die Platzhalter. Ein Tap in ein leeres Feld setzt den Platzhalter ein und markiert ihn, sodass Überschreiben sofort möglich ist.
25. **Kraft-Training gilt als erledigt**, wenn „Training abschließen“ gedrückt wird (einzelne Sätze werden sofort gespeichert). Kraft und WODs werden über geplante Einheiten erfasst; frei (ohne Plan) lässt sich nur Ausdauer eintragen.
26. **WOD-Wiedererkennung:** gleiche `wodId` ODER gleicher Bewegungsschlüssel. Der Schlüssel besteht aus WOD-Typ und den Bewegungen in ihrer Reihenfolge (Name normalisiert: Groß/Klein, Umlaute, Satzzeichen egal) mit Wdh./Distanz/Kalorien – **ohne Gewichte**, weil Gewichte skaliert werden und als „verwendete Gewichte“ angezeigt werden.
27. **WOD-Ergebnis:** For Time und Rounds for Time → Zeit; AMRAP und EMOM → Runden + Wiederholungen. Verwendete Gewichte als Freitext.
28. **Pausentimer:** läuft nach dem Abhaken mit der Plan-Pausenzeit, +15 s und „Fertig“ möglich, vibriert am Ende (wo der Browser es kann – iPhones unterstützen Vibration im Browser nicht).

## Strava
29. **„Die nächste offene Einheit gleicher Sportart in derselben Planwoche“** wird als die **früheste noch offene** Einheit dieser Sportart in der Planwoche ausgelegt (Reihenfolge des Plans). „Offen“ heißt: Für die Einheit gibt es noch keinen Eintrag.
30. Strava-Aktivitäten, die nach dem Sportarten-Mapping „Sonstiges“ sind (z. B. Yoga, Krafttraining), werden nie einer Einheit zugeordnet, sondern als ungeplant geloggt.
31. **update-Ereignisse** aktualisieren Werte (Dauer, Distanz, Puls, Sportart, Datum), ändern aber die Zuordnung nicht (keine Korrekturfunktion).
32. **Löschen und Deautorisieren nur nach Gegenprüfung:** Strava-Webhooks sind nicht signiert. Damit ein gefälschtes Ereignis keine Daten löscht, löscht die App eine Aktivität nur, wenn Strava sie beim Abruf nicht mehr liefert (404), und alle Strava-Daten nur, wenn der Zugriff tatsächlich entzogen ist. Ereignisse mit fremder Abo-ID werden ignoriert.
33. **Wettkampf-Markierung:** Läufe, die bei Strava als „Wettkampf“ markiert sind, gelten automatisch als Test/Wettkampf. Zusätzlich kann der Kunde eigene Strava-Läufe in seinem Trainingsverlauf als Test/Wettkampf markieren (nur er; der Coach sieht diese Markierung nicht).
34. **Trennen der Strava-Verbindung** geschieht bei Strava (Einstellungen → Meine Apps → Zugriff entziehen). Das löst das Deautorisierungs-Ereignis aus, und die App löscht alle Strava-Daten. Einen eigenen Trennen-Button gibt es nicht.
35. Bei erneutem Verbinden gilt der neue Verbindungszeitpunkt als Grenze für „nur Aktivitäten ab Verbindung“.
36. Der **Token-Endpunkt** wird unter `STRAVA_API_BASE` aufgerufen (`…/oauth/token`), damit 2027 nur diese eine Variable geändert werden muss. Die Strava-Anmeldeseite (`STRAVA_AUTHORIZE_URL`) ist separat einstellbar.
37. Ein Strava-Konto kann nur mit einem Kunden verbunden sein.

## Profil, Prognosen, Graphen
38. **PAL-Auswahl:** 1,2 / 1,4 / 1,6 / 1,8 / 2,0 / 2,2 mit kurzer Beschreibung; Standard 1,5 bis zur Auswahl.
39. **Gewicht für den Kalorienbedarf** ist der jüngste Körpergewicht-Eintrag.
40. **Prognose-Referenz:** Kandidaten sind die 5-km-Testzeiten, manuell eingetragene Läufe mit Distanz und Markierung „Test/Wettkampf“ und – nur für den Kunden – als Test/Wettkampf markierte Strava-Läufe. Es zählt der jüngste Kandidat. Ist die Zieldistanz mehr als doppelt so lang wie die Referenz, wird die Prognose als „unsicherer“ markiert; zusätzlich steht ein allgemeiner Hinweis darunter.
41. **1RM bei 1 Wiederholung** = Gewicht (beide Formeln). Brzycki ist ab 37 Wdh. nicht definiert.
42. **Volumen und 1RM** zählen nur abgehakte Sätze.
43. **Wochen** in Graphen sind ISO-Kalenderwochen (Montag–Sonntag).
44. Der Coach sieht im Ausdauer-Graphen nur die Trainingszeit – auch für manuell eingetragene Einheiten (einheitliche Darstellung). Manuell eingetragene Distanzen sieht er im Trainingsverlauf.

## Chat und KI
45. **Zusätzliche Stichwortprüfung** für die Pflichtthemen (Schmerzen, Verletzungen, Krankheitssymptome, Medikamente, Schwangerschaft): Ein Treffer eskaliert immer, auch wenn die KI antworten würde. Die Liste ist bewusst vorsichtig (z. B. führt auch „Muskelkater“ oder „Seitenstechen“ zur Weiterleitung).
46. Die KI bekommt das **Profil pseudonymisiert** (Kürzel statt Name) und die letzten 10 Nachrichten als Verlauf.
47. **Fehler, Zeitüberschreitung oder Ablehnung** der KI → Nachricht geht an den Coach.
48. **Antwortet der Coach im Chat**, gelten alle offenen Posteingangs-Nachrichten dieses Kunden als erledigt. Zusätzlich gibt es „Erledigt ohne Antwort“.
49. **Missbrauchsschutz:** höchstens 30 Kundennachrichten pro Stunde (begrenzt die API-Kosten).
50. **Modell:** `claude-opus-5-5`, über `ANTHROPIC_MODEL` änderbar.
51. Die Testroutine verwendet ohne Datenbankzugang nur die Pflichtregeln und eine leere Wissensbasis; mit Supabase-Zugang die echten Regeln und die Wissensbasis (ohne Kundenprofil/Plan).

## Sonstiges
52. **Zeitzone** für „heute“: `Europe/Berlin` (änderbar über `APP_TIMEZONE`).
53. **Offline:** Die App zeigt ohne Internet nur einen Hinweis; Einträge werden nicht offline zwischengespeichert.
54. **Login-Drosselung:** je IP-Adresse höchstens 10 Anmelde-Mails und 20 Code-Prüfungen pro 15 Minuten sowie 10 Registrierungsversuche pro Stunde (IP nur gehasht gespeichert). Schützt davor, dass jemand durch massenhafte Anfragen die E-Mail-Kontingente aufbraucht und dadurch alle aussperrt.
55. **Strava-Webhook:** Ereignisse werden erst verarbeitet, wenn das Abo über den Button registriert ist (gespeicherte Abo-ID). Eine abgerufene Aktivität muss dem Athleten gehören, der das Ereignis ausgelöst hat; gesucht, geändert und gelöscht wird nur innerhalb des verbundenen Kunden.
56. **Selbstregistrierung mit fremder Adresse:** Wer den Einladungscode kennt, könnte eine fremde E-Mail-Adresse registrieren (der Inhaber bekommt dann eine Login-Mail, die Adresse ist belegt). Das bleibt vorerst so; wer den Code hat, ist vertrauenswürdig. Der Coach kann solche Konten in Supabase löschen.

## Programm-Einheiten (Blöcke) und „Neuer Plan mit KI“
57. **Programm-Einheit** = Einheit aus Blöcken (P1, P2 …) mit je eigener Wertung. Damit lassen sich Pläne wie die HYROX-Programme vollständig abbilden; „Kraft“, „WOD“ und „Ausdauer“ bleiben unverändert erhalten.
58. **Zuordnung der Wertungen:** Checkmark → `checkmark`, No Measure → `none`, Time → `time`, Distance → `distance`, Weight → `weight`, AMRAP - Reps → `reps`, AMRAP - Rounds → `rounds`, „N rounds for time/weight/distance/reps/calories“ → entsprechender Typ mit `rounds: N` (je Runde ein Eingabefeld).
59. **Eingabe der Ergebnisse:** Zeit als mm:ss oder h:mm:ss (eine Zahl allein = Minuten), Distanz in km, Gewicht in kg, Wiederholungen/Runden/Kalorien als ganze Zahl. Gespeichert werden Sekunden, Meter, kg bzw. ganze Zahlen. Ein eingetragener Wert hakt den Block automatisch ab.
60. **Erledigt:** Eine Programm-Einheit ist erledigt, wenn jeder Block mit Wertung (alles außer „keine Wertung“) abgehakt ist. Teilweise ausgefüllte Einheiten werden als „begonnen“ gespeichert.
61. **Gewichte** stehen im Plan in kg, nach Geschlecht getrennt (`maleKg`/`femaleKg`) oder für alle (`kg`). Die App zeigt dem Kunden den Wert zu seinem Geschlecht aus dem Profil; ohne Angabe beide. Pfund rechnet die KI um (1 lb = 0,45359237 kg, gerundet auf 0,1 kg); Angaben ohne Einheit (z. B. „50/35“) bleiben unverändert im Text.
62. **Ruhetag** = Tag ohne Einheiten mit Titel und/oder Hinweis. Er erscheint im Plan und auf „Heute“ als „Ruhetag“.
63. **Blockergebnisse** fließen (noch) nicht in Fortschritts-Graphen oder Prognosen ein; Ausdauer-Auswertungen nutzen weiterhin nur Ausdauer-Einheiten. Im Trainingsverlauf steht die Anzahl erledigter Blöcke, die Werte sieht man über „Öffnen“.
64. **Neuer Plan mit KI:** Prompt und Vorlage enthalten das Kundenprofil (standardmäßig pseudonymisiert). Lange Pläne darf die KI in Teilen liefern; die App fügt die Teile zusammen, wenn Titel und Startdatum gleich sind und sich die Wochen nicht überschneiden.
65. **Startdatum der Vorlage** ist der nächste Montag; die KI setzt das Startdatum aus der Beschreibung.
66. **Testdaten:** Die drei HYROX-Pläne liegen als JSON in `src/lib/plan/fixtures/` (Inhalte auf Englisch wie im Original, Jahr ergänzt: Base Builder ab 01.09.2025, Tempo Runner ab 01.12.2025, Threshold Trainer ab 29.12.2025). Tageshinweise → Hinweis des Tages, Session-Hinweise → Hinweis der Einheit, „Rest Day!“ → Ruhetag, aufeinanderfolgende Blöcke derselben Session → eine Einheit.
67. **Strava ist optional.** Ohne `STRAVA_CLIENT_ID`/`STRAVA_CLIENT_SECRET` blendet die App die Strava-Verbindung im Kundenprofil aus, die Verbinden-Route leitet zurück ins Profil, und die Einrichtung zeigt Strava als „nicht eingerichtet (optional)“. Kunden tragen Ausdauer dann von Hand ein. Sobald beide Werte in Vercel gesetzt sind (und neu deployt wurde), erscheint die Verbindung wieder.

## Fragebogen und Regelwerk (Ergänzung 28.10.2026)
68. **Pflicht** heißt: Hinweis „Fragebogen unvollständig“ beim Kunden und Status in der Kundenliste des Coaches; Plan, Training und Chat bleiben nutzbar (Entscheidung der Betreiberin).
69. **Rechnen:** Alle Zahlen (Tier, Startumfang, Screening, Testwoche, e1RM, Lasten, Paces, Hyrox-Gewichte, kcal) berechnet die App; die KI übernimmt sie mit Rechenweg (Entscheidung der Betreiberin).
70. **Max-Tests:** Zeit- und Ausdauertests maximal ab Tier 1, 3RM ab Tier 2 und mit mindestens 6 Monaten Erfahrung mit der Übung (Entscheidung der Betreiberin). Andere Maximaltests der Hyrox-Testwoche (Wall Balls, Ski/Rudern, Klimmzüge, Lunges, Burpees) zählen wie Zeittests.
71. **e1RM** nur aus Sätzen bis RIR 0 mit weniger als 10 Wdh. (Entscheidung der Betreiberin, streng nach Brzycki). Die Fortschritts-Graphen markieren jetzt Sätze ab 10 Wdh. (statt über 10) als weniger verlässlich.
72. **Riegel:** Exponenten aus Riegel 1981, Tabelle 1, statt 1,06 (Entscheidung der Betreiberin). Ohne Geschlecht 1,08 (Weltklasse-Wert aus demselben Artikel). Über der Datenbasis der Tabelle (z. B. Männer bis 129 min) wird ein Wert als Extrapolation markiert.
73. **Kein VDOT:** Paces nur über Riegel und Abstände aus den Vorlagen (Entscheidung der Betreiberin). Abstände ohne Einheit gelten als „pro Meile“.
74. **Tier 2 „regelmäßig ∼3-mal“** = Mittel der letzten 4 Wochen ≥ 3 Einheiten (Ausdauer + Kraft). „Training mit Wettkampfziel“ = Wettkampf in den letzten 12 Monaten oder geplanter Termin. 1 min intensiv zählt wie 2 min moderat (WHO 150/75).
75. **Tier 3+** vergibt die App nicht automatisch; bei nationalem/internationalem Niveau erscheint ein Hinweis für den Coach.
76. **Submaximale Tests:** Lauf 30 min gleichmäßig bei CR-10 ≤ 4; Kraft Satz 5–8 Wdh. bei RIR 2–3; übrige Tests ohne Zeitdruck bei CR-10 ≤ 4 und ohne Testwert. Abnehmen und Fitness bekommen keinen Maximaltest.
77. **Ärztliche Freigabe** gilt wie der PAR-Q+ 12 Monate.
78. **Lasten** werden auf 2,5 kg gerundet.
79. **PAL-Vorschlag** = Untergrenze der DGE-Spanne (+0,3 bei Sport 4–5×/Woche); der eingestellte PAL-Faktor bleibt maßgeblich, Abweichungen ≥ 0,05 werden markiert.
80. **Kalorien im Export** nur bei Ziel Abnehmen oder Kraft/Muskelaufbau (Regel der Betreiberin). Die Kalorienkarte im Profil bleibt für alle sichtbar.
81. **Schlaf unter 7 h** (AASM/SRS-Konsens) führt nur zu einem Hinweis; wie stark die Progression angepasst wird, entscheidet der Coach.
82. **Plausibilität Hyrox:** Eine Hyrox-Laufpace schneller als die 10-km-Pace nach Riegel wird als unplausibel markiert.
83. **Session-RPE** nur bei manuellen Einheiten (Entscheidung der Betreiberin); bei Kraft und WOD trägt der Kunde dazu die Dauer ein. Monotonie mit der Standardabweichung über alle 7 Tage (Tage ohne Training = 0).
84. **Einwilligung:** Nur der Kunde selbst kann sie geben oder widerrufen; der Widerruf löscht die Gesundheitsangaben sofort. Die Textversion wird gespeichert; eine neue Textversion gilt erst für neue Einwilligungen. Gesundheitsangaben gehen nie in den Chat-Kontext.
85. **Gestrichene Fragen:** „Seit wann trainierst du?“ und Fragen zur Selbsteinschätzung, weil keine Regel sie nutzt; Uhr-/Strava-Export auf Wunsch der Betreiberin. Ernährungsweise nur bei Abnehmen und Muskelaufbau.
86. **Exportversion 2:** Der Import ignoriert `client` weiterhin; ältere Dateien mit Version 1 lassen sich unverändert importieren.
