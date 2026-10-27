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
| `plans`, `plan_versions` | eigene lesen | alle lesen/schreiben | – |
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
- **test_results** (Historie, nur anfügen/löschen, nie überschreiben): `kind` (`run_5k` Sekunden | `bench_3rm`, `deadlift_3rm`, `squat_3rm`, `body_weight` kg | `mobility` Skala 1–10 + Freitext), `tested_on`, `value`, `scale`, `note`
- **plans**: je Kunde, `title`, `is_active` (höchstens ein aktiver Plan je Kunde), `current_version`
- **plan_versions**: unveränderliche Versionen, `version` (1, 2, …), `content` (JSON nach Plan-Schema), `change_note`, `source` (`editor`|`import`|`restore`|`seed`). Neue Version nur über Funktion `save_plan_version()` (atomar).
- **workout_logs**: eine durchgeführte Einheit. `kind` (`strength`|`wod`|`endurance`), `performed_on`, `title`, Bezug zum Plan (`plan_id`, `plan_version`, `session_id`), `source` (`manual`|`strava`), `completed`, Ausdauer (`sport`, `duration_seconds`, `distance_m`, `avg_hr`, `is_test`), WOD (`wod_id`, `wod_movements_key`, `wod_result` JSON, `wod_weights`), `notes`.
  Constraint: bei `source = 'strava'` sind `distance_m`, `avg_hr` leer und `is_test = false`.
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
Day  { day (1–7 = Tag 1–7 der Planwoche ab startDate), title?, sessions: Session[] }
Session = Kraft | WOD | Ausdauer, jeweils mit eindeutiger `id`
  strength:  { id, type:"strength", title, notes?, exercises: [{ exerciseId, name, sets, reps, targetWeightKg?, restSeconds, notes? }] }
  wod:       { id, type:"wod", wodId?, name, wodType: for_time|amrap|emom|rft, timeCapMinutes?, durationMinutes?, rounds?, movements: [{ name, reps?, weightKg?, distanceM?, calories?, notes? }], notes? }
  endurance: { id, type:"endurance", sport, durationMinutes?, distanceKm?, intensity, description? }
```
Datum einer Einheit = `startDate + (week − 1)·7 + (day − 1)` Tage.

Zusatzprüfungen (im JSON Schema nicht ausdrückbar, in den Beschreibungen genannt und in `validatePlan()` geprüft): Einheiten-IDs eindeutig, Wochennummern eindeutig, Tage je Woche eindeutig, Ausdauer braucht Dauer und/oder Distanz.

### Export-Datei
```
{ format: "pt-coach-export", exportVersion: 1, exportedAt, pseudonymized, client: Profil-Export, plan: Plan | null }
```
Profil-Export (identisch im Plan- und Profil-Export): Kürzel bzw. Name, Geschlecht, Alter, Größe, Equipment, Gymzugang, Trainingstage, max. Zeit, Notizen, PAL-Faktor, Nährstoffziele, Testwert-Historie (nur manuell eingetragene Werte, keine Strava-Daten), errechneter Kalorienbedarf.
Import akzeptiert die ganze Export-Datei (nur `plan` wird übernommen) oder einen nackten Plan.

## 4. Fachlogik (reine Funktionen, getestet)

| Funktion | Datei | Regel |
|---|---|---|
| e1RM Epley | `calc/one-rep-max.ts` | `w·(1 + r/30)`, bei r = 1 → w |
| e1RM Brzycki | `calc/one-rep-max.ts` | `w·36/(37 − r)`, bei r = 1 → w |
| Volumen | `calc/volume.ts` | Σ Gewicht × Wdh. der abgehakten Sätze je Einheit |
| Riegel | `calc/riegel.ts` | `T2 = T1·(D2/D1)^1,06` |
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
Kundennachricht → Server → Claude (strukturierte Ausgabe `{action, answer, reason}`) mit Kontext: Eskalationsregeln, Wissensbasis/FAQ, Kundenprofil, aktueller Plan, letzte Nachrichten (keine Strava-Werte).
Zusätzlich deterministische Pflicht-Stichwortprüfung (Schmerz, Verletzung, Krankheitssymptome, Medikamente, Schwangerschaft): Treffer → immer eskalieren. Fehler/Ablehnung der KI → eskalieren.
`answer` → sichtbar als „KI-Antwort“; `escalate` → Posteingang Coach + Info an Kunden.
Testroutine: `npm run test:eskalation` gegen `docs/eskalation-testset.json`.

## 7. Seiten
Kunde (`/kunde`): Heute · Plan · Training (Verlauf, Erfassen) · Fortschritt (Graphen, Prognosen) · Profil (Testwerte, Kalorien, Strava) · Chat
Coach (`/coach`): Übersicht · Posteingang · Kunden (Profil, Plan inkl. Editor/Export/Import/Versionen, Training, Fortschritt, Chat) · Wissensbasis · Eskalationsregeln · Einrichtung (Strava-Webhook, Einladungscode, Status)
Öffentlich: `/login`, `/registrieren`
