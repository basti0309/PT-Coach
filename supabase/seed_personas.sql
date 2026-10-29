-- PT-Coach: Demo-Personas (optional, nach supabase/seed.sql ausführen)
-- Acht erfundene Kundinnen und Kunden mit unterschiedlichen Zielen und Leistungsniveaus sowie Fragebögen
-- und Tests für die Demo-Kunden Anna (K01) und Ben (K02). Es werden KEINE Pläne angelegt.
-- Alle Konten haben Adressen unter demo.invalid und können sich nicht anmelden.
-- Richtwerte und Quellen: docs/DEMO-PERSONAS.md. Entfernen: supabase/seed_entfernen.sql.
-- Testdaten liegen relativ zum Ausführungstag (current_date - n); Fragebogen-Daten (Termine, Ergebnisse) sind feste Daten.

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                        confirmation_token, email_change, email_change_token_new, recovery_token)
values
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated',
   'clara@demo.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated',
   'david@demo.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-000000000006', 'authenticated', 'authenticated',
   'eva@demo.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-000000000007', 'authenticated', 'authenticated',
   'frank@demo.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-000000000008', 'authenticated', 'authenticated',
   'gregor@demo.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-000000000009', 'authenticated', 'authenticated',
   'hanna@demo.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-000000000010', 'authenticated', 'authenticated',
   'ingo@demo.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-000000000011', 'authenticated', 'authenticated',
   'jutta@demo.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '')
on conflict (id) do nothing;

insert into public.profiles (id, role, full_name, short_code, email) values
  ('00000000-0000-4000-8000-000000000004', 'client', 'Clara Demo', 'K03', 'clara@demo.invalid'),
  ('00000000-0000-4000-8000-000000000005', 'client', 'David Demo', 'K04', 'david@demo.invalid'),
  ('00000000-0000-4000-8000-000000000006', 'client', 'Eva Demo', 'K05', 'eva@demo.invalid'),
  ('00000000-0000-4000-8000-000000000007', 'client', 'Frank Demo', 'K06', 'frank@demo.invalid'),
  ('00000000-0000-4000-8000-000000000008', 'client', 'Gregor Demo', 'K07', 'gregor@demo.invalid'),
  ('00000000-0000-4000-8000-000000000009', 'client', 'Hanna Demo', 'K08', 'hanna@demo.invalid'),
  ('00000000-0000-4000-8000-000000000010', 'client', 'Ingo Demo', 'K09', 'ingo@demo.invalid'),
  ('00000000-0000-4000-8000-000000000011', 'client', 'Jutta Demo', 'K10', 'jutta@demo.invalid')
on conflict (id) do nothing;

insert into public.client_profiles (client_id, sex, birth_date, height_cm, equipment_home, gym_access,
                                    training_days_per_week, max_minutes_per_workout, notes, pal_factor, created_by, updated_by)
values
  ('00000000-0000-4000-8000-000000000004', 'w', '1995-05-21', 170, 'Springseil, Miniband', true, 4, 60,
   'Kommt aus Gruppenkursen (Functional), erster HYROX geplant.', 1.70, '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000005', 'm', '1990-08-09', 183, 'Kettlebells 16/24 kg, Klimmzugstange', true, 6, 90,
   'Physiotherapeut, zwei HYROX in Open, Wechsel zu Pro geplant.', 2.10, '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000006', 'w', '1988-11-03', 164, 'Matte, Miniband, Kettlebell 12 kg', false, 5, 100,
   'Lehrerin, läuft seit 8 Jahren im Verein.', 1.90, '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000007', 'm', '1972-02-17', 176, 'keins', false, 3, 45,
   'Hat im Sommer mit Laufen angefangen (Lauf-Geh-Wechsel).', 1.40, '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000008', 'm', '1999-04-26', 180, 'keins', true, 4, 75,
   'Student, trainiert seit 3 Jahren Oberkörper/Unterkörper-Split, fährt täglich mit dem Rad zur Uni.', 1.90, '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000009', 'w', '1987-01-30', 172, 'Matte, Gymnastikband', true, 3, 60,
   'Projektmanagerin, seit Sommer im Gym, Freihanteln neu.', 1.40, '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000010', 'm', '1980-06-12', 178, 'keins', true, 3, 60,
   'Disponent, Schichtdienst früh/spät. Neu im Gym.', 1.40, '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000011', 'w', '1964-09-08', 163, 'Gymnastikband, Kurzhanteln 2 × 4 kg, Matte', false, 3, 60,
   'Apothekerin in Teilzeit.', 1.80, '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001')
on conflict (client_id) do nothing;

-- Fragebögen (vom Kunden ausgefüllt)
insert into public.client_questionnaires (client_id, goal, answers, created_by, updated_by) values
  ('00000000-0000-4000-8000-000000000002', 'laufen',
   $json${"goal":"laufen","goalNote":"Erster Halbmarathon im April 2027, Ziel unter 2:00 h. Die Kraftbasis aus dem Gym will ich halten.","weekdays":[1,2,4,6],"events":[{"date":"2027-04-11","name":"Halbmarathon (Frühjahr)","kind":"lauf","detail":"21,1 km"}],"absences":[{"from":"2026-12-23","to":"2027-01-02","option":"koerpergewicht"}],"workActivity":"sitzend_gehend","sportOften":true,"volume":[{"enduranceSessions":3,"enduranceMinutes":160,"vigorousMinutes":25,"runKm":23,"strengthSessions":2},{"enduranceSessions":3,"enduranceMinutes":150,"vigorousMinutes":20,"runKm":22,"strengthSessions":2},{"enduranceSessions":3,"enduranceMinutes":145,"vigorousMinutes":25,"runKm":21,"strengthSessions":2},{"enduranceSessions":2,"enduranceMinutes":120,"vigorousMinutes":15,"runKm":18,"strengthSessions":2}],"mainSport":"Laufen","competedLast12Months":true,"competitionLevel":"lokal","laufen":{"bests":[{"distanceM":10000,"seconds":3370,"date":"2026-05-17","race":true}],"longestRunMinutes":80,"targetRace":{"distanceM":21098,"date":"2027-04-11","targetSeconds":7140}},"liftExperienceMonths":{"squat":24,"bench":12,"deadlift":18}}$json$::jsonb,
   '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000002'),
  ('00000000-0000-4000-8000-000000000003', 'kraft_muskelaufbau',
   $json${"goal":"kraft_muskelaufbau","goalNote":"Kreuzheben 3RM auf 160 kg bringen, Rumpf und Rücken stabiler machen, etwas Muskulatur aufbauen ohne Bauch.","weekdays":[1,3,5,6],"events":[],"absences":[{"from":"2027-02-15","to":"2027-02-22","option":"hotel_gym"}],"workActivity":"sitzend","sportOften":false,"volume":[{"enduranceSessions":1,"enduranceMinutes":60,"vigorousMinutes":0,"runKm":0,"strengthSessions":3},{"enduranceSessions":1,"enduranceMinutes":45,"vigorousMinutes":0,"runKm":0,"strengthSessions":3},{"enduranceSessions":0,"enduranceMinutes":0,"vigorousMinutes":0,"runKm":0,"strengthSessions":3},{"enduranceSessions":1,"enduranceMinutes":60,"vigorousMinutes":0,"runKm":0,"strengthSessions":2}],"mainSport":"","competedLast12Months":false,"competitionLevel":"keins","liftExperienceMonths":{"squat":60,"bench":72,"deadlift":60},"weightGoal":{"targetKg":88,"byDate":"2027-06-30"},"diet":{"style":"omnivor","intolerances":""}}$json$::jsonb,
   '00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000003'),
  ('00000000-0000-4000-8000-000000000004', 'hyrox',
   $json${"goal":"hyrox","goalNote":"Erster HYROX im Frühjahr 2027 (Women Open). Ich will durchlaufen ohne Gehpausen und unter 1:45 h bleiben.","weekdays":[1,2,4,6],"events":[{"date":"2027-03-20","name":"Erster HYROX-Start","kind":"hyrox","detail":"Women Open"}],"absences":[{"from":"2027-01-02","to":"2027-01-09","option":"keine"}],"workActivity":"sitzend","sportOften":true,"volume":[{"enduranceSessions":2,"enduranceMinutes":120,"vigorousMinutes":40,"runKm":15,"strengthSessions":2},{"enduranceSessions":3,"enduranceMinutes":135,"vigorousMinutes":45,"runKm":16,"strengthSessions":2},{"enduranceSessions":2,"enduranceMinutes":110,"vigorousMinutes":35,"runKm":13,"strengthSessions":2},{"enduranceSessions":2,"enduranceMinutes":115,"vigorousMinutes":40,"runKm":14,"strengthSessions":2}],"mainSport":"","competedLast12Months":false,"competitionLevel":"keins","hyrox":{"division":"women","results":[],"equipment":{"sled":true,"skierg":true,"rower":true,"wallball":true}},"liftExperienceMonths":{"squat":18,"bench":12,"deadlift":12}}$json$::jsonb,
   '00000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000004'),
  ('00000000-0000-4000-8000-000000000005', 'hyrox',
   $json${"goal":"hyrox","goalNote":"Wechsel in die Pro-Division: erster Pro-Start im April 2027 unter 1:15 h. Schwächen: Wall Balls und Sled Pull.","weekdays":[1,2,3,4,6,7],"events":[{"date":"2027-04-17","name":"HYROX (erster Pro-Start)","kind":"hyrox","detail":"Men Pro"}],"absences":[],"workActivity":"gehend_stehend","sportOften":true,"volume":[{"enduranceSessions":4,"enduranceMinutes":270,"vigorousMinutes":75,"runKm":36,"strengthSessions":3},{"enduranceSessions":4,"enduranceMinutes":255,"vigorousMinutes":70,"runKm":34,"strengthSessions":3},{"enduranceSessions":5,"enduranceMinutes":290,"vigorousMinutes":80,"runKm":40,"strengthSessions":3},{"enduranceSessions":3,"enduranceMinutes":200,"vigorousMinutes":50,"runKm":26,"strengthSessions":2}],"mainSport":"HYROX","competedLast12Months":true,"competitionLevel":"lokal","hyrox":{"division":"men_pro","results":[{"date":"2026-03-14","division":"men","totalSeconds":4472,"runSeconds":2200},{"date":"2026-09-26","division":"men","totalSeconds":4265,"runSeconds":2110}],"equipment":{"sled":true,"skierg":true,"rower":true,"wallball":true}},"liftExperienceMonths":{"squat":84,"bench":84,"deadlift":72}}$json$::jsonb,
   '00000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000005'),
  ('00000000-0000-4000-8000-000000000006', 'laufen',
   $json${"goal":"laufen","goalNote":"Erster Marathon im April 2027 unter 3:30 h. Danach will ich beim Halbmarathon unter 1:35 h kommen.","weekdays":[1,2,3,5,7],"events":[{"date":"2027-04-25","name":"Marathon (Frühjahr)","kind":"lauf","detail":"42,2 km"}],"absences":[{"from":"2026-12-27","to":"2027-01-03","option":"keine"}],"workActivity":"sitzend_gehend","sportOften":true,"volume":[{"enduranceSessions":5,"enduranceMinutes":330,"vigorousMinutes":50,"runKm":55,"strengthSessions":1},{"enduranceSessions":5,"enduranceMinutes":345,"vigorousMinutes":55,"runKm":57,"strengthSessions":1},{"enduranceSessions":5,"enduranceMinutes":320,"vigorousMinutes":45,"runKm":53,"strengthSessions":1},{"enduranceSessions":4,"enduranceMinutes":260,"vigorousMinutes":40,"runKm":43,"strengthSessions":1}],"mainSport":"Laufen","competedLast12Months":true,"competitionLevel":"lokal","laufen":{"bests":[{"distanceM":10000,"seconds":2690,"date":"2026-09-13","race":true},{"distanceM":21098,"seconds":5970,"date":"2026-04-12","race":true}],"longestRunMinutes":125,"targetRace":{"distanceM":42195,"date":"2027-04-25","targetSeconds":12540}}}$json$::jsonb,
   '00000000-0000-4000-8000-000000000006', '00000000-0000-4000-8000-000000000006'),
  ('00000000-0000-4000-8000-000000000007', 'laufen',
   $json${"goal":"laufen","goalNote":"Den 10-km-Firmenlauf im Mai 2027 ohne Gehpause durchlaufen. Langfristig ein paar Kilo leichter.","weekdays":[2,4,6],"events":[{"date":"2027-05-27","name":"Firmenlauf","kind":"lauf","detail":"10 km"}],"absences":[{"from":"2027-03-29","to":"2027-04-09","option":"koerpergewicht"}],"workActivity":"sitzend","sportOften":false,"volume":[{"enduranceSessions":2,"enduranceMinutes":55,"vigorousMinutes":0,"runKm":7,"strengthSessions":0},{"enduranceSessions":2,"enduranceMinutes":50,"vigorousMinutes":0,"runKm":6,"strengthSessions":0},{"enduranceSessions":2,"enduranceMinutes":50,"vigorousMinutes":0,"runKm":6,"strengthSessions":0},{"enduranceSessions":1,"enduranceMinutes":30,"vigorousMinutes":0,"runKm":3.5,"strengthSessions":0}],"mainSport":"","competedLast12Months":false,"competitionLevel":"keins","laufen":{"bests":[{"distanceM":5000,"seconds":2020,"date":"2026-10-17","race":false}],"longestRunMinutes":35,"targetRace":{"distanceM":10000,"date":"2027-05-27","targetSeconds":null}}}$json$::jsonb,
   '00000000-0000-4000-8000-000000000007', '00000000-0000-4000-8000-000000000007'),
  ('00000000-0000-4000-8000-000000000008', 'kraft_muskelaufbau',
   $json${"goal":"kraft_muskelaufbau","goalNote":"Muskelaufbau vor allem Oberkörper; bis Sommer 2027 sauber 100 kg Bankdrücken.","weekdays":[1,2,4,5,6],"events":[],"absences":[{"from":"2027-02-01","to":"2027-02-14","option":"keine"}],"workActivity":"sitzend_gehend","sportOften":true,"volume":[{"enduranceSessions":5,"enduranceMinutes":175,"vigorousMinutes":0,"runKm":0,"strengthSessions":4},{"enduranceSessions":5,"enduranceMinutes":175,"vigorousMinutes":0,"runKm":0,"strengthSessions":4},{"enduranceSessions":4,"enduranceMinutes":140,"vigorousMinutes":0,"runKm":0,"strengthSessions":4},{"enduranceSessions":5,"enduranceMinutes":175,"vigorousMinutes":0,"runKm":0,"strengthSessions":3}],"mainSport":"","competedLast12Months":false,"competitionLevel":"keins","liftExperienceMonths":{"squat":36,"bench":36,"deadlift":30},"weightGoal":{"targetKg":83,"byDate":"2027-07-31"},"diet":{"style":"omnivor","intolerances":"Laktose"}}$json$::jsonb,
   '00000000-0000-4000-8000-000000000008', '00000000-0000-4000-8000-000000000008'),
  ('00000000-0000-4000-8000-000000000009', 'kraft_muskelaufbau',
   $json${"goal":"kraft_muskelaufbau","goalNote":"Stärker werden und den Rücken für den Bürojob entlasten. Ich will sicher mit der Langhantel trainieren können.","weekdays":[1,3,6],"events":[],"absences":[{"from":"2026-12-20","to":"2027-01-06","option":"koerpergewicht"}],"workActivity":"sitzend","sportOften":false,"volume":[{"enduranceSessions":1,"enduranceMinutes":45,"vigorousMinutes":0,"runKm":0,"strengthSessions":2},{"enduranceSessions":1,"enduranceMinutes":45,"vigorousMinutes":0,"runKm":0,"strengthSessions":2},{"enduranceSessions":1,"enduranceMinutes":40,"vigorousMinutes":0,"runKm":0,"strengthSessions":2},{"enduranceSessions":0,"enduranceMinutes":0,"vigorousMinutes":0,"runKm":0,"strengthSessions":2}],"mainSport":"","competedLast12Months":false,"competitionLevel":"keins","liftExperienceMonths":{"squat":4,"bench":4,"deadlift":2},"weightGoal":{"targetKg":null,"byDate":null},"diet":{"style":"vegetarisch","intolerances":""}}$json$::jsonb,
   '00000000-0000-4000-8000-000000000009', '00000000-0000-4000-8000-000000000009'),
  ('00000000-0000-4000-8000-000000000010', 'abnehmen',
   $json${"goal":"abnehmen","goalNote":"Bis Sommer 2027 auf etwa 92 kg. Ich will wieder mit den Kindern Rad fahren können, ohne nach 20 Minuten platt zu sein.","weekdays":[2,4,6,7],"events":[],"absences":[{"from":"2027-07-10","to":"2027-07-24","option":"hotel_gym"}],"workActivity":"sitzend","sportOften":false,"volume":[{"enduranceSessions":1,"enduranceMinutes":40,"vigorousMinutes":0,"runKm":0,"strengthSessions":0},{"enduranceSessions":1,"enduranceMinutes":30,"vigorousMinutes":0,"runKm":0,"strengthSessions":0},{"enduranceSessions":1,"enduranceMinutes":40,"vigorousMinutes":0,"runKm":0,"strengthSessions":0},{"enduranceSessions":0,"enduranceMinutes":0,"vigorousMinutes":0,"runKm":0,"strengthSessions":0}],"mainSport":"","competedLast12Months":false,"competitionLevel":"keins","weightGoal":{"targetKg":92,"byDate":"2027-06-30"},"diet":{"style":"omnivor","intolerances":""},"enduranceSports":["gehen","radfahren"]}$json$::jsonb,
   '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000010'),
  ('00000000-0000-4000-8000-000000000011', 'fitness_gesundheit',
   $json${"goal":"fitness_gesundheit","goalNote":"Fit und beweglich bleiben, Knochen und Muskeln stärken. Im Juli 2027 will ich die Alpenüberquerung E5 zu Fuß schaffen.","weekdays":[1,3,5,7],"events":[{"date":"2027-07-12","name":"Alpenüberquerung E5","kind":"sonstiges","detail":"6 Etappen zu Fuß"}],"absences":[],"workActivity":"gehend_stehend","sportOften":false,"volume":[{"enduranceSessions":3,"enduranceMinutes":165,"vigorousMinutes":0,"runKm":0,"strengthSessions":2},{"enduranceSessions":3,"enduranceMinutes":170,"vigorousMinutes":0,"runKm":0,"strengthSessions":2},{"enduranceSessions":2,"enduranceMinutes":120,"vigorousMinutes":0,"runKm":0,"strengthSessions":2},{"enduranceSessions":3,"enduranceMinutes":160,"vigorousMinutes":0,"runKm":0,"strengthSessions":2}],"mainSport":"","competedLast12Months":false,"competitionLevel":"keins","enduranceSports":["gehen","wandern","radfahren"]}$json$::jsonb,
   '00000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000011')
on conflict (client_id) do nothing;

-- Einwilligung + Gesundheitsangaben (nur einige Personas). In der App kann nur der Kunde selbst einwilligen;
-- hier für die Demo direkt gesetzt. Die Einwilligung kommt zuerst (client_health verlangt sie).
insert into public.health_consents (client_id, consent_version, created_by, updated_by)
select v.cid::uuid, '2026-10-28c', v.cid::uuid, v.cid::uuid
from (values ('00000000-0000-4000-8000-000000000003'), ('00000000-0000-4000-8000-000000000005'), ('00000000-0000-4000-8000-000000000006'), ('00000000-0000-4000-8000-000000000007'), ('00000000-0000-4000-8000-000000000009'), ('00000000-0000-4000-8000-000000000010'), ('00000000-0000-4000-8000-000000000011')) as v(cid)
where not exists (select 1 from public.health_consents h where h.client_id = v.cid::uuid and h.withdrawn_at is null);

insert into public.client_health (client_id, data, created_by, updated_by) values
  ('00000000-0000-4000-8000-000000000003', $json${"complaints":[{"region":"unterer_ruecken","since":"2019, wiederkehrend","painInTraining":false,"clarified":true,"triggers":"Kreuzheben mit rundem Rücken, Kniebeuge früh morgens"}],"sleepHours":7,"hrMax":null}$json$::jsonb, '00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000003'),
  ('00000000-0000-4000-8000-000000000005', $json${"complaints":[{"region":"sprunggelenk_fuss","since":"seit 6 Wochen (Achillessehne)","painInTraining":false,"clarified":true,"triggers":"Seilspringen, Box Jumps"}],"sleepHours":7.5,"hrMax":191}$json$::jsonb, '00000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000005'),
  ('00000000-0000-4000-8000-000000000006', $json${"complaints":[],"sleepHours":7,"hrMax":184}$json$::jsonb, '00000000-0000-4000-8000-000000000006', '00000000-0000-4000-8000-000000000006'),
  ('00000000-0000-4000-8000-000000000007', $json${"complaints":[{"region":"knie","since":"seit 2 Jahren, gelegentlich","painInTraining":false,"clarified":false,"triggers":"Bergablaufen, nach Läufen über 30 min"}],"sleepHours":6.5,"hrMax":null}$json$::jsonb, '00000000-0000-4000-8000-000000000007', '00000000-0000-4000-8000-000000000007'),
  ('00000000-0000-4000-8000-000000000009', $json${"complaints":[{"region":"unterer_ruecken","since":"seit 3 Jahren, wiederkehrend","painInTraining":false,"clarified":true,"triggers":"langes Sitzen"}],"sleepHours":7,"hrMax":null}$json$::jsonb, '00000000-0000-4000-8000-000000000009', '00000000-0000-4000-8000-000000000009'),
  ('00000000-0000-4000-8000-000000000010', $json${"complaints":[{"region":"knie","since":"seit ca. 1 Jahr","painInTraining":true,"clarified":false,"triggers":"Treppen, tiefe Kniebeuge"}],"sleepHours":6,"hrMax":null}$json$::jsonb, '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000010'),
  ('00000000-0000-4000-8000-000000000011', $json${"complaints":[{"region":"schulter","since":"seit 4 Monaten","painInTraining":true,"clarified":true,"triggers":"Arme mit Gewicht über Kopf"}],"sleepHours":7.5,"hrMax":162}$json$::jsonb, '00000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000011')
on conflict (client_id) do nothing;

-- Testwerte (vom Coach erfasst). Nur einfügen, wenn der Kunde noch keine Werte dieser Art an diesem Tag hat.
insert into public.test_results (client_id, kind, tested_on, value, reps, rir, scale, note, created_by)
select v.client_id::uuid, v.kind::public.test_kind, v.tested_on, v.value, v.reps, v.rir, v.scale, v.note, v.created_by::uuid
from (values
  ('00000000-0000-4000-8000-000000000003', 'squat_reps', current_date - 20, 100, 5, 0, null, 'letzter Satz, Gürtel', '00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000004', 'body_weight', current_date - 6, 66, null, null, null, '', '00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000004', 'run_5k', current_date - 12, 1665, null, null, null, 'Parkrun, flach', '00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000004', 'squat_reps', current_date - 9, 55, 6, 2, null, '', '00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000004', 'deadlift_reps', current_date - 9, 70, 5, 1, null, '', '00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000005', 'body_weight', current_date - 5, 82, null, null, null, '', '00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000005', 'run_5k', current_date - 16, 1180, null, null, null, 'Bahn', '00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000005', 'row_5k', current_date - 23, 1190, null, null, null, '', '00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000005', 'ski_5k', current_date - 23, 1290, null, null, null, '', '00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000005', 'wallballs_100', current_date - 30, 320, null, null, null, '6 kg auf 3 m (Open)', '00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000005', 'pullups_2min', current_date - 30, 18, null, null, null, '', '00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000005', 'squat_3rm', current_date - 37, 140, null, null, null, '', '00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000005', 'deadlift_3rm', current_date - 37, 180, null, null, null, '', '00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000005', 'bench_3rm', current_date - 37, 100, null, null, null, '', '00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000006', 'body_weight', current_date - 4, 56, null, null, null, '', '00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000006', 'run_5k', current_date - 18, 1265, null, null, null, 'Bahn', '00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000007', 'body_weight', current_date - 7, 88, null, null, null, '', '00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000007', 'run_30min_submax', current_date - 14, 4000, null, null, null, 'ohne Gehpause, CR-10 4', '00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000008', 'body_weight', current_date - 3, 79, null, null, null, '', '00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000008', 'squat_reps', current_date - 11, 115, 5, 0, null, '', '00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000008', 'bench_reps', current_date - 13, 85, 6, 0, null, '', '00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000008', 'deadlift_reps', current_date - 11, 150, 4, 1, null, 'Griff war limitierend', '00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000009', 'body_weight', current_date - 8, 68, null, null, null, '', '00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000009', 'squat_reps', current_date - 8, 40, 8, 2, null, '', '00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000009', 'bench_reps', current_date - 10, 30, 8, 2, null, '', '00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000009', 'deadlift_reps', current_date - 8, 50, 8, 2, null, '', '00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000009', 'mobility', current_date - 8, null, null, null, 5, 'Hüftbeugung und Brustwirbelsäule eingeschränkt', '00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000010', 'body_weight', current_date - 60, 106.5, null, null, null, '', '00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000010', 'body_weight', current_date - 3, 104, null, null, null, '', '00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000011', 'body_weight', current_date - 10, 70, null, null, null, '', '00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000011', 'mobility', current_date - 10, null, null, null, 6, 'Schulter rechts eingeschränkt (Überkopf)', '00000000-0000-4000-8000-000000000001')
) as v(client_id, kind, tested_on, value, reps, rir, scale, note, created_by)
where not exists (select 1 from public.test_results t
                  where t.client_id = v.client_id::uuid and t.kind = v.kind::public.test_kind and t.tested_on = v.tested_on);
