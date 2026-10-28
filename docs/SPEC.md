# Spezifikation PT-Coach (Entwurf 1)

Ein Coach, viele Kunden. Der Coach plant, Kunden trainieren und erfassen. Alle Texte der Oberfläche auf Deutsch.
Annahmen, die über den Auftrag hinaus getroffen wurden, stehen in `docs/ANNAHMEN.md`.

## 1. Rollen und Rechte

| Rolle | Wer | Anlage |
|---|---|---|
| `coach` | Betreiberin | automatisch beim ersten Login mit der Adresse aus `COACH_EMAIL` |
| `client` | Kunde | vom Coach unter „Kunden → Neu“ angelegt (Name, E-Mail, Kürzel) oder selbst registriert unter `/registrieren` mit Einladungscode (Code legt der Coach unter „Einrichtung“ fest) |

Wer keinen Eintrag in `profiles` hat, sieht nichts (RLS liefert leere Ergebnisse, App zeigt „Kein Zugang“).

### Rechte-Matrix (durch RLS in Postgres erzwungen)

| Tabelle | Kunde | Coach | Service-Role (Server) |
|---|---|---|---|
| `profiles` | eigenes lesen; vom Coach nur den Namen (Funktion `profile_names()`) | alle lesen/ändern | anlegen |
| `client_profiles` | eigenes lesen/ändern, **Nährstoffziele nicht** (Trigger) | alle lesen/anlegen/ändern | – |
| `test_results` | eigene lesen/anlegen/löschen | alle | – |
| `client_questionnaires` (Fragebogen) | eigenen lesen/anlegen/ändern | alle lesen/anlegen/ändern | – |
| `health_consents` (Einwilligung Art. 9 DSGVO) | eigene lesen, **nur selbst** erteilen und widerrufen | lesen (kein Erteilen, kein Widerruf) | – |
| `client_health` (Gesundheitsangaben) | eigene lesen/schreiben **nur mit aktiver Einwilligung**; löschen | wie Kunde (nur mit Einwilligung des Kunden) | – |
| `plans`, `plan_versions` | eigene lesen | alle lesen/schreiben; Plan löschen (Versionen werden mitgelöscht, erfasste Trainings bleiben ohne Plan-Bezug) | – |
| `workout_logs` | eigene lesen; eigene **manuelle** anlegen/ändern/löschen | alle lesen; **manuelle** anlegen/ändern/löschen | Strava-Einträge |
| `set_logs` | eigene lesen/schreiben | alle | – |
| `strava_connections` (Tokens) | – (nur Status über Funktion `my_strava_status()`) | – | alles |
| `strava_activities` (km, Puls, Abweichung) | eigene lesen; nur Spalte `is_test` ändern | **kein Zugriff** | alles |
| `messages` | eigene lesen | alle lesen; als Coach schreiben; Posteingang erledigen | Kundennachricht + KI-Antwort einfügen |
| `knowledge_entries`, `escalation_rules`, `app_settings` | – | alles (Pflichtregeln nicht änder-/löschbar, Trigger) | – |
| `rate_limits` (Login-Drosselung) | – | – | alles (Funktion `hit_rate_limit()`) |

Kundennachrichten werden nicht direkt vom Browser eingefügt, sondern nur über den Server (damit jede Nachricht zuerst den KI-Vorfilter durchläuft).

## 2. Datenmodell (Postgres, Schema `public`)

Alle Tabellen mit `created_at`, `updated_at` sowie – wo Nutzer schreiben – `created_by`, `updated_by` (per Trigger aus `auth.uid()` gesetzt, nicht fälschbar). Für Einträge vom Server (Strava) bleibt `created_by` leer → Anzeige „automatisch (Strava)“.

- **profiles**: `id` (= auth.users.id), `role` (`coach`|`client`), `full_name`, `short_code` (Kürzel, eindeutig, für Pseudonymisierung), `email`
- **client_profiles** (1:1 zu Kunde): `sex` (`m`|`w`), `birth_date` (Alter wird berechnet), `height_cm`, `equipment_home`, `gym_access`, `training_days_per_week`, `max_minutes_per_workout`, `notes`, `pal_factor`, `protein_g`, `fat_g`, `carbs_g`
- **test_results** (Historie, nur anfügen/löschen, nie überschreiben): `kind` (Liste mit Einheit in `src/lib/plan/test-kinds.ts`: Zeiten in s wie `run_5k`, `run_1mile`, `wallballs_100`, `ski_5k`, `row_5k`, `lunge_100m`; Meter `run_30min`, `run_30min_submax`; Wdh. `pullups_2min`, `burpee_bar_5min`; kg `*_3rm`, `body_weight`; Kraftsätze `squat_reps`/`bench_reps`/`deadlift_reps` mit `reps` und `rir`; `mobility` Skala 1–10 + Freitext), `tested_on`, `value`, `scale`, `reps`, `rir`, `note`
- **client_questionnaires** (1:1): `goal`, `answers` (jsonb, Zod-Schema `src/lib/questionnaire/schema.ts`), siehe `docs/FRAGEBOGEN.md`
- **health_consents**: `consent_version`, `given_at`, `withdrawn_at`; höchstens eine aktive Einwilligung je Kunde; nur Widerruf änderbar (Trigger)
- **client_health** (1:1): `data` (jsonb, gleiches Zod-Schema): Beschwerden, Schlaf, gemessene HFmax. Lesen/Schreiben nur bei aktiver Einwilligung (RLS); der Widerruf löscht die Zeile (Trigger).
- **plans**: je Kunde, `title`, `is_active` (höchstens ein aktiver Plan je Kunde), `current_version`
- **plan_versions**: unveränderliche Versionen, `version` (1, 2, …), `content` (JSON nach Plan-Schema), `change_note`, `source` (`editor`|`import`|`restore`|`seed`). Neue Version nur über Funktion `save_plan_version()` (atomar).
- **workout_logs**: eine durchgeführte Einheit. `kind` (`strength`|`wod`|`endurance`|`program`), `performed_on`, `title`, Bezug zum Plan (`plan_id`, `plan_version`, `session_id`), `source` (`manual`|`strava`), `completed`, Ausdauer (`sport`, `duration_seconds`, `distance_m`, `avg_hr`, `is_test`), WOD (`wod_id`, `wod_movements_key`, `wod_result` JSON, `wod_weights`), Programm-Einheit (`block_results` JSON: je Block-Kennung `{ done, values[], note }`; Zeit in s, Distanz in m, Gewicht in kg, sonst ganze Zahlen), `notes`, `session_rpe` (0–10, Foster 2001).
  Constraint: bei `source = 'strava'` sind `distance_m`, `avg_hr`, `session_rpe` leer und `is_test = false`.
  Eindeutig: eine Plan-Einheit kann höchstens einmal erledigt sein.
- **set_logs**: Satz einer Kraftübung: `exercise_id` (Übungs-ID aus dem Plan), `set_no`, `weight_kg`, `reps`, `done`, `performed_on` (vom Workout übernommen)
- **strava_connections**: `athlete_id`, `access_token`, `refresh_token`, `expires_at`, `scope`, `connected_at`
- **strava_activities**: `strava_activity_id`, `workout_log_id`, `strava_sport_type`, `sport` (Kategorie), `start_time`, `start_date_local`, `moving_time_seconds`, `distance_m`, `avg_hr`, `is_test`, `matched`, Plan-Sollwerte zum Zeitpunkt der Zuordnung (`planned_duration_seconds`, `planned_distance_m`)
- **messages**: `client_id` (Gesprächsfaden = Kunde), `sender` (`client`|`coach`|`ai`|`system`), `author_id`, `body`, `ai_action`, `ai_reason`, `needs_coach` (Posteingang), `resolved_at`, `resolved_by`
- **knowledge_entries**: `kind` (`wissen`|`faq`), `title`, `content`
- **escalation_rules**: `rule`, `active`, `locked` (Pflichtregel)
- **app_settings**: `key`, `value` (Strava-Webhook-Abo-ID, Einladungscode)

## 3. Plan-Format

Zod-Schema `src/lib/plan/schema.ts` = einzige Quelle der Wahrheit; `docs/plan-schema.json` wird daraus erzeugt.

```
Plan { schemaVersion: 1, title, startDate (YYYY-MM-DD), goal?, notes?, weeks: Week[] }
Week { week (1, 2, …), focus?, days: Day[] }
Day  { day (1–7 = Tag 1–7 der Planwoche ab startDate), title?, notes?, sessions: Session[] (leer = Ruhetag) }
Session = Kraft | WOD | Ausdauer | Programm, jeweils mit eindeutiger `id` und optionalem `label` (z. B. "AM"/"PM")
  strength:  { id, type:"strength", title, notes?, exercises: [{ exerciseId, name, sets, reps, targetWeightKg?, restSeconds, notes? }] }
  wod:       { id, type:"wod", wodId?, name, wodType: for_time|amrap|emom|rft, timeCapMinutes?, durationMinutes?, rounds?, movements: [{ name, reps?, weightKg?, distanceM?, calories?, notes? }], notes? }
  endurance: { id, type:"endurance", sport, durationMinutes?, distanceKm?, intensity, description? }
  program:   { id, type:"program", title, notes?, blocks: [{ key, label?, name, details?, coachNotes?,
               scoring: { type: checkmark|none|time|distance|weight|reps|rounds|calories, rounds? },
               loads?: [{ label, maleKg?, femaleKg?, kg? }] }] }
```
Programm-Einheiten bilden Pläne mit Blöcken (P1, P2 …) ab, z. B. HYROX: jeder Block hat eine eigene Wertung; bei `scoring.rounds = N` („N rounds for …“) wird je Runde ein Wert erfasst. Die Einheit gilt als erledigt, wenn alle Blöcke mit Wertung ≠ `none` abgehakt sind. Vorgabe-Gewichte (`loads`) zeigt die App passend zum Geschlecht des Kunden. Testdaten: `src/lib/plan/fixtures/hyrox-*.json` (drei vollständige HYROX-Pläne).
Datum einer Einheit = `startDate + (week − 1)·7 + (day − 1)` Tage.

Zusatzprüfungen (im JSON Schema nicht ausdrückbar, in den Beschreibungen genannt und in `validatePlan()` geprüft): Einheiten-IDs eindeutig, Wochennummern eindeutig, Tage je Woche eindeutig, Ausdauer braucht Dauer und/oder Distanz, Block-Kennungen je Einheit eindeutig, Tag ohne Einheiten braucht Titel oder Hinweis, Gewicht (`loads`) braucht mindestens einen Wert.

### Export-Datei
```
{ format: "pt-coach-export", exportVersion: 2, exportedAt, pseudonymized, client: Profil-Export, plan: Plan | null }
```
Profil-Export (identisch im Plan- und Profil-Export): Kürzel bzw. Name, Geschlecht, Alter, Größe, Equipment, Gymzugang, Trainingstage, max. Zeit, Notizen, PAL-Faktor, Nährstoffziele, Testwert-Historie (nur manuell eingetragene Werte, keine Strava-Daten; `tests[]` mit `unit` `s`|`kg`|`m`|`reps`, bei Kraftsätzen `reps`/`rir`), errechneter Kalorienbedarf (nur bei Ziel Abnehmen oder Kraft/Muskelaufbau).
Neu in Version 2: `goal`, `questionnaire` (Antworten), `missing` (fehlende Pflichtangaben), `healthStatus` + `health` (nur mit Einwilligung), `derived` (berechnete Werte mit Regel-ID und Rechenweg, `docs/REGELWERK.md`), `trainingLoad` (Session-RPE der letzten 4 Wochen). Die bisherigen Felder bleiben unverändert. Später ergänzt: `client.goalNote` (Ziel in eigenen Worten) und optional `history` (Trainingsverlauf, nur auf „Export & Prompt“). Auf beiden Prompt-Seiten (Export & Prompt, Export je Plan) steht zusätzlich `knowledge` in der Datei: die Wissensbasis des Coaches, nur Einträge der Art `wissen` (`title`, `content`), keine FAQ; fehlt, wenn es keine gibt.
**Plan-Ziel:** `plan.goal` setzt nie die KI. Beim Import überschreibt die App es mit dem Ziel aus dem Fragebogen („<Ziel> – <Freitext>“); im Editor kann der Coach es ändern.
**Löschen:** Der Coach kann jeden Plan (auch den aktiven) löschen und den Trainingsverlauf eines Kunden ganz oder für einen Zeitraum löschen (Datenbankfunktion `delete_training_history`, prüft die Coach-Rolle selbst, löscht auch Strava-Einträge samt Strava-Aktivität).
Import akzeptiert die ganze Export-Datei (nur `plan` wird übernommen) oder einen nackten Plan.

### Export & Prompt (neuer Plan)
Coach → Kunde → Plan → „Export & Prompt“ (`/coach/kunden/[id]/plan/neu`):
1. Daten: eine Export-Datei mit Profil, Fragebogen (Ziel + `goalNote`), Testwerten, berechneten Werten und einem schema-gültigen Plan-Gerüst als Format. Umschalter: Trainingsverlauf (`history`, Standard: aus; Strava-Einheiten nur mit Datum, Sportart, Dauer, Erledigt) und Klarname (Standard: pseudonymisiert).
2. Prompt: kurzer Prompt „Trainingsplan auf Basis der Kundendaten“ mit optionalem Feld „Zusätzliche Wünsche“ (Vorlage `docs/ki-prompt-neuer-plan.md` mit `{{BESCHREIBUNG}}`, `{{SCHEMA}}`, `{{VORLAGE}}`).
3. Antwort der KI hochladen (Datei oder Text), auch in mehreren Teilen (z. B. Wochen 1–4, 5–8): Teile werden zusammengeführt (gleicher Titel und Startdatum, Wochen dürfen sich nicht überschneiden), geprüft und als Vorschau gezeigt. „Plan anlegen“ legt den Plan an, setzt ihn aktiv und speichert Version 1 (Quelle `import`).

## 4. Fachlogik (reine Funktionen, getestet)

| Funktion | Datei | Regel |
|---|---|---|
| e1RM Epley | `calc/one-rep-max.ts` | `w·(1 + r/30)`, bei r = 1 → w |
| e1RM Brzycki | `calc/one-rep-max.ts` | `w·36/(37 − r)`, bei r = 1 → w |
| Volumen | `calc/volume.ts` | Σ Gewicht × Wdh. der abgehakten Sätze je Einheit |
| Riegel | `calc/riegel.ts` | `T2 = T1·(D2/D1)^b`, b nach Riegel 1981 Tab. 1 (Männer 1,07732, 40+ 1,05352 …, Frauen 1,08283); gültig 1,5–42,2 km und 3,5–230 min |
| Einstufung (McKay 2022) | `calc/tier.ts` | Tier 0–2 aus Umfang der letzten 4 Wochen und Wettkampfangaben (Regel R1) |
| Paces | `calc/paces.ts` | Riegel-Äquivalente + Abstände aus den Vorlagen (R7) |
| Hyrox-Gewichte | `calc/hyrox.ts` | Rulebook 26/27 je Division (R8) |
| PAL-Vorschlag | `calc/pal.ts` | DGE-Spanne, Untergrenze, +0,3 bei Sport (R10) |
| Session-RPE | `calc/session-load.ts` | Last = RPE × min; Monotonie = Tagesmittel/SD; Strain = Last × Monotonie (R12) |
| Abgeleitete Werte | `plan/derive.ts` | Regeln R1–R13 mit Rechenweg für den Export |
| Fragebogen vollständig? | `questionnaire/completeness.ts` | Pflichtangaben je Ziel |
| Mifflin-St Jeor | `calc/calories.ts` | m: `10·kg + 6,25·cm − 5·Alter + 5`, w: `… − 161`; × PAL |
| Vorbefüllung | `calc/prefill.ts` | letzte Einheit mit derselben Übungs-ID, Satz n ↔ Satz n (sonst letzter Satz) |
| WOD-Wiedererkennung | `calc/wod.ts` | gleiche `wodId` oder gleicher normalisierter Bewegungsschlüssel (Typ + Bewegungen + Wdh./Distanz/Kalorien, ohne Gewichte) |
| Strava-Matching | `calc/matching.ts` | 1. gleiche Sportart am gleichen Tag, 2. früheste offene Einheit gleicher Sportart in derselben Planwoche, 3. sonst ungeplant |
| Plan-Abweichung | `calc/deviation.ts` | Ist − Soll absolut und in % vom Soll |
| Aggregation | `calc/aggregate.ts` | Ausdauer je ISO-Woche/Monat, je Sportart |
| Schema-Validierung | `plan/validate.ts` | Zod + Zusatzprüfungen, deutsche Fehlermeldungen mit Pfad |

## 5. Strava
- OAuth (`activity:read_all`) → Tokens in `strava_connections` (nur Service-Role). Refresh automatisch, wenn < 60 s gültig.
- API-Aufrufe mit `Authorization: Bearer …`, Basis `STRAVA_API_BASE`.
- Webhook `GET /api/strava/webhook` (Validierung `hub.challenge`/`hub.verify_token`), `POST` antwortet sofort 200 und verarbeitet im Hintergrund (`after()`).
  - activity create → Aktivität abrufen, nur Sportart, Start, moving_time, Distanz, Ø-Puls, ID speichern; nur wenn Start ≥ Verbindungszeitpunkt; Matching.
  - activity update → Werte aktualisieren, Zuordnung bleibt.
  - activity delete → nach Gegenprüfung (Abruf liefert 404) Aktivität + zugehörigen Log löschen.
  - athlete update `authorized=false` → nach Gegenprüfung alle Strava-Daten des Kunden löschen.
- Coach-Bereich „Einrichtung“: Button „Strava-Webhook registrieren“, Statusanzeige, Abo löschen.

## 6. Chat mit KI-Vorfilter
Kundennachricht → Server → Claude (strukturierte Ausgabe `{action, answer, reason}`) mit Kontext: Eskalationsregeln, Wissensbasis/FAQ, Kundenprofil inkl. Fragebogen, aktueller Plan, letzte Nachrichten (keine Strava-Werte, **keine Gesundheitsangaben** und keine abgeleiteten Werte).
Zusätzlich deterministische Pflicht-Stichwortprüfung (Schmerz, Verletzung, Krankheitssymptome, Medikamente, Schwangerschaft): Treffer → immer eskalieren. Fehler/Ablehnung der KI → eskalieren.
`answer` → sichtbar als „KI-Antwort“; `escalate` → Posteingang Coach + Info an Kunden.
Testroutine: `npm run test:eskalation` gegen `docs/eskalation-testset.json`.

## 7. Seiten
Kunde (`/kunde`): Heute · Plan · Training (Verlauf, Erfassen, Session-RPE) · Fortschritt (Graphen, Prognosen) · Profil (Testwerte, Kalorien, Strava, Fragebogen `/kunde/profil/fragebogen` mit Einwilligung und Gesundheitsangaben) · Chat
Coach (`/coach`): Übersicht · Posteingang · Kunden (Status Fragebogen; Profil, Fragebogen mit abgeleiteten Werten, Plan inkl. Export & Prompt/Editor/Export/Import/Versionen/Löschen, Training, Fortschritt, Chat) · Wissensbasis · Eskalationsregeln · Einrichtung (Strava-Webhook, Einladungscode, Status)
Öffentlich: `/login`, `/registrieren`

## 8. Fragebogen und Regelwerk für die KI-Planung
- Fragebogen: `docs/FRAGEBOGEN.md` (jede Frage mit der Planentscheidung, die sie steuert; Verzweigung nach Ziel).
- Regelwerk mit Quellen: `docs/REGELWERK.md` (R1–R13). Die App rechnet, die KI wendet an (Prompt-Regel 6 in `docs/ki-prompt-vorlage.md`).
- Auswertung der HYROX-Vorlagen: `docs/VORLAGEN-ANALYSE.md`; durchgespielte Profile: `docs/TESTPROFILE.md` (`npm run testprofile:generate`).
- Pflicht = Hinweis für den Kunden und Status für den Coach; die App wird nicht gesperrt.
