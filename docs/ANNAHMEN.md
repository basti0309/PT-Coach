# Annahmen

Hier steht jede Entscheidung, die der Auftrag offen ließ. Bitte prüfen – alles ist änderbar.

## Konten und Anmeldung
1. **Erster Coach-Account:** Wer sich mit der Adresse aus der Umgebungsvariable `COACH_EMAIL` anmeldet, wird automatisch Coach (Konto wird beim ersten Login-Versuch angelegt). Ein eigener „Setup“-Button war dafür nicht möglich, weil der Coach-Bereich vor dem ersten Login nicht erreichbar ist.
2. **Kunden legt der Coach an** (Name, E-Mail, Kürzel). Selbstregistrierung gibt es nicht; Login-Anfragen für unbekannte Adressen werden still ignoriert (gleiche Meldung, damit niemand herausfinden kann, wer Kunde ist).
3. **Anmeldung per Link oder 6-stelligem Code** aus derselben E-Mail. Der Code ist nötig, weil eine installierte PWA (vor allem auf dem iPhone) eigene Cookies hat und ein Link aus der Mail-App im normalen Browser landen würde.
4. **Kürzel** für die Pseudonymisierung vergibt der Coach beim Anlegen (Vorschlag: Initialen).

## Daten und Rechte
5. **Kundenprofil bearbeiten:** Kunde und Coach dürfen die Stammdaten ändern; **Nährstoffziele** setzt nur der Coach (per Datenbank-Trigger erzwungen). Der PAL-Faktor ist von beiden wählbar.
6. **Alter** wird als Zahl gespeichert (nicht das Geburtsdatum), weil der Auftrag „Alter“ nennt. Muss bei Bedarf manuell aktualisiert werden.
7. **Geschlecht** nur `männlich`/`weiblich`, weil die Mifflin-St-Jeor-Formel nur diese beiden Varianten kennt.
8. **Körpergewicht und Mobility** werden wie die Testwerte als datierte Historie gespeichert (Gewicht ändert sich; „Testwerte mit Datum als Historie“). Größe, Alter, Geschlecht usw. sind normale Profilfelder.
9. **Testwerte werden nie überschrieben**, nur neu angelegt. Falsch eingetragene Werte können gelöscht werden.
10. **Kundennachrichten** schreibt nur der Server in die Datenbank (nicht der Browser direkt). So kann keine Nachricht am KI-Vorfilter vorbei gelangen.
11. **Strava-Einheiten für den Coach:** sichtbar sind Datum, Dauer, Erledigt-Status und die grobe Sportart-Kategorie (z. B. „Laufen“) – die Kategorie wird für die Zuordnung zur geplanten Einheit und für den Trainingszeit-Graphen je Sportart gebraucht. Nicht sichtbar: Distanz, Herzfrequenz, Abweichungen, Startuhrzeit, Strava-Sportart im Detail, Test-Markierung.
12. Der **Name der Strava-Aktivität** wird gar nicht gespeichert (nicht in der Liste der erlaubten Felder).

## Demo-Daten
13. Die Demo-Konten (`@demo.invalid`) können sich nicht anmelden; sie dienen als Anschauungsmaterial im Coach-Bereich. Entfernen mit `supabase/seed_entfernen.sql`.
