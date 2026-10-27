-- PT-Coach: Demo-Daten (optional)
-- Legt einen Demo-Coach, zwei Demo-Kunden und einen Beispielplan an.
-- Die Demo-Konten haben Adressen unter demo.invalid und können sich NICHT anmelden;
-- sie dienen nur dazu, die App mit Inhalt zu sehen (als Coach) und für Tests.
-- Entfernen: supabase/seed_entfernen.sql ausführen.

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                        confirmation_token, email_change, email_change_token_new, recovery_token)
values
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
   'coach@demo.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
   'anna@demo.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated',
   'ben@demo.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '')
on conflict (id) do nothing;

insert into public.profiles (id, role, full_name, short_code, email) values
  ('00000000-0000-4000-8000-000000000001', 'coach', 'Demo-Coach', null, 'coach@demo.invalid'),
  ('00000000-0000-4000-8000-000000000002', 'client', 'Anna Demo', 'K01', 'anna@demo.invalid'),
  ('00000000-0000-4000-8000-000000000003', 'client', 'Ben Demo', 'K02', 'ben@demo.invalid')
on conflict (id) do nothing;

insert into public.client_profiles (client_id, sex, birth_date, height_cm, equipment_home, gym_access,
                                    training_days_per_week, max_minutes_per_workout, notes, pal_factor,
                                    protein_g, fat_g, carbs_g, created_by, updated_by)
values
  ('00000000-0000-4000-8000-000000000002', 'w', '1992-03-14', 168, 'Kurzhanteln bis 12 kg, Klimmzugstange', true, 4, 60,
   'Ziel: Halbmarathon im Frühjahr, Kraftbasis halten.', 1.6, 120, 65, 250,
   '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000003', 'm', '1985-07-02', 182, 'keins', true, 3, 75,
   'Ziel: Kraftaufbau, Rücken stabil halten.', 1.5, 160, 80, 280,
   '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001')
on conflict (client_id) do nothing;

insert into public.test_results (client_id, kind, tested_on, value, scale, note, created_by) values
  ('00000000-0000-4000-8000-000000000002', 'run_5k', current_date - 30, 1590, null, 'Bahn, windstill', '00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000002', 'body_weight', current_date - 30, 63.5, null, '', '00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000002', 'squat_3rm', current_date - 28, 70, null, '', '00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000002', 'mobility', current_date - 28, null, 6, 'Hüftbeuger verkürzt', '00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000003', 'bench_3rm', current_date - 20, 90, null, '', '00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000003', 'deadlift_3rm', current_date - 20, 140, null, '', '00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000003', 'body_weight', current_date - 20, 86, null, '', '00000000-0000-4000-8000-000000000001');

-- Beispielplan für Anna. Startdatum = Montag der aktuellen Woche.
insert into public.plans (id, client_id, title, is_active, current_version, created_by, updated_by) values
  ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-000000000002', 'Grundlage Herbst', true, 1,
   '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001')
on conflict (id) do nothing;

insert into public.plan_versions (plan_id, client_id, version, content, change_note, source, created_by)
select '00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-000000000002', 1,
       jsonb_set(plan.content, '{startDate}', to_jsonb(to_char(date_trunc('week', current_date), 'YYYY-MM-DD'))),
       'Beispielplan (Seed)', 'seed', '00000000-0000-4000-8000-000000000001'
from (select $plan$
{
  "schemaVersion": 1,
  "title": "Grundlage Herbst",
  "startDate": "2026-10-26",
  "goal": "Halbmarathon-Grundlage aufbauen, Kraft erhalten",
  "weeks": [
    {
      "week": 1,
      "focus": "Einstieg",
      "days": [
        {
          "day": 1,
          "title": "Kraft Unterkörper",
          "sessions": [
            {
              "id": "w1d1-kraft",
              "type": "strength",
              "title": "Kniebeuge & Kreuzheben",
              "exercises": [
                { "exerciseId": "kniebeuge", "name": "Kniebeuge", "sets": 4, "reps": 6, "targetWeightKg": 55, "restSeconds": 120 },
                { "exerciseId": "rumaenisches-kreuzheben", "name": "Rumänisches Kreuzheben", "sets": 3, "reps": 8, "targetWeightKg": 45, "restSeconds": 90 },
                { "exerciseId": "ausfallschritt", "name": "Ausfallschritt", "sets": 3, "reps": 10, "targetWeightKg": 10, "restSeconds": 60, "notes": "Gewicht je Hand" }
              ]
            }
          ]
        },
        {
          "day": 2,
          "sessions": [
            { "id": "w1d2-lauf", "type": "endurance", "sport": "laufen", "durationMinutes": 40, "intensity": "locker (Zone 2)", "description": "Gleichmäßig, Unterhaltungstempo" }
          ]
        },
        {
          "day": 4,
          "title": "Conditioning",
          "sessions": [
            {
              "id": "w1d4-wod",
              "type": "wod",
              "wodId": "cindy",
              "name": "Cindy",
              "wodType": "amrap",
              "durationMinutes": 20,
              "movements": [
                { "name": "Klimmzüge", "reps": 5 },
                { "name": "Liegestütze", "reps": 10 },
                { "name": "Air Squats", "reps": 15 }
              ],
              "notes": "Klimmzüge mit Band skalieren"
            }
          ]
        },
        {
          "day": 6,
          "sessions": [
            { "id": "w1d6-lauf", "type": "endurance", "sport": "laufen", "durationMinutes": 60, "distanceKm": 10, "intensity": "ruhiger Dauerlauf" }
          ]
        }
      ]
    },
    {
      "week": 2,
      "focus": "Steigerung",
      "days": [
        {
          "day": 1,
          "title": "Kraft Unterkörper",
          "sessions": [
            {
              "id": "w2d1-kraft",
              "type": "strength",
              "title": "Kniebeuge & Kreuzheben",
              "exercises": [
                { "exerciseId": "kniebeuge", "name": "Kniebeuge", "sets": 4, "reps": 5, "targetWeightKg": 57.5, "restSeconds": 120 },
                { "exerciseId": "rumaenisches-kreuzheben", "name": "Rumänisches Kreuzheben", "sets": 3, "reps": 8, "targetWeightKg": 47.5, "restSeconds": 90 }
              ]
            }
          ]
        },
        {
          "day": 3,
          "sessions": [
            { "id": "w2d3-intervalle", "type": "endurance", "sport": "laufen", "durationMinutes": 45, "intensity": "6 × 3 min zügig, 2 min Trabpause" }
          ]
        },
        {
          "day": 5,
          "sessions": [
            {
              "id": "w2d5-wod",
              "type": "wod",
              "name": "Couplet",
              "wodType": "for_time",
              "timeCapMinutes": 15,
              "movements": [
                { "name": "Kettlebell Swings", "reps": 21, "weightKg": 16 },
                { "name": "Burpees", "reps": 21 },
                { "name": "Kettlebell Swings", "reps": 15, "weightKg": 16 },
                { "name": "Burpees", "reps": 15 },
                { "name": "Kettlebell Swings", "reps": 9, "weightKg": 16 },
                { "name": "Burpees", "reps": 9 }
              ]
            }
          ]
        },
        {
          "day": 7,
          "sessions": [
            { "id": "w2d7-rad", "type": "endurance", "sport": "radfahren", "durationMinutes": 90, "intensity": "locker", "description": "Flach, Trittfrequenz hoch" }
          ]
        }
      ]
    }
  ]
}
$plan$::jsonb as content) plan
on conflict (plan_id, version) do nothing;
