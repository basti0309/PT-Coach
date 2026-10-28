-- PT-Coach: Prüfung der Zugriffsrechte (Row Level Security)
--
-- Im Supabase-SQL-Editor komplett ausführen. Das Skript legt eigene Testkonten
-- (Kunde A, Kunde B, Coach C, Konto ohne Profil) mit Testdaten an, prüft als diese
-- Nutzer, was gelesen/geschrieben werden kann, und rollt danach ALLES zurück –
-- es bleiben keine Testdaten in der Datenbank.
--
-- Ergebnis: eine Tabelle mit einer Zeile pro Prüfung (OK / FEHLER) und als letzte Zeile
-- "ALLE TESTS BESTANDEN" oder "FEHLER: n von m Tests fehlgeschlagen".

drop table if exists pg_temp.rls_test_ergebnis;
create temp table rls_test_ergebnis (nr int, pruefung text, ergebnis text);

do $test$
declare
  a uuid := gen_random_uuid();   -- Kunde A
  b uuid := gen_random_uuid();   -- Kunde B
  c uuid := gen_random_uuid();   -- Coach
  n uuid := gen_random_uuid();   -- Konto ohne Profil
  plan_b uuid := gen_random_uuid();
  log_a uuid := gen_random_uuid();
  log_b uuid := gen_random_uuid();
  log_strava_a uuid := gen_random_uuid();
  log_old_a uuid := gen_random_uuid();
  log_strava_old_a uuid := gen_random_uuid();
  test_b uuid := gen_random_uuid();
  rule_locked uuid;
  tests jsonb;
  t jsonb;
  usr uuid;
  stmt text;
  v bigint;
  rc bigint;
  ok boolean;
  detail text;
  results text[] := '{}';
  i int := 0;
begin
  begin
    -- ---------------- Testdaten (als Datenbank-Admin) ----------------
    insert into auth.users (instance_id, id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
                            created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
    select '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.mail,
           '{}', '{}', now(), now(), '', '', '', ''
    from (values (a, 'rlstest-a@test.invalid'), (b, 'rlstest-b@test.invalid'),
                 (c, 'rlstest-c@test.invalid'), (n, 'rlstest-n@test.invalid')) as u(id, mail);

    insert into public.profiles (id, role, full_name, short_code, email) values
      (a, 'client', 'Test A', 'RLSTA', 'rlstest-a@test.invalid'),
      (b, 'client', 'Test B', 'RLSTB', 'rlstest-b@test.invalid'),
      (c, 'coach', 'Test Coach', null, 'rlstest-c@test.invalid');

    insert into public.client_profiles (client_id, sex, birth_date, protein_g) values (a, 'w', '1996-01-01', 100), (b, 'm', '1986-01-01', 150);
    insert into public.test_results (id, client_id, kind, tested_on, value) values
      (gen_random_uuid(), a, 'run_5k', current_date, 1500), (test_b, b, 'run_5k', current_date, 1600);
    insert into public.plans (id, client_id, title, current_version) values (plan_b, b, 'Plan B', 0);
    insert into public.plan_versions (plan_id, client_id, version, content, source)
      values (plan_b, b, 1, '{"title":"Plan B"}', 'seed');
    insert into public.workout_logs (id, client_id, kind, performed_on, source, completed, sport, duration_seconds, distance_m)
      values (log_a, a, 'endurance', current_date, 'manual', true, 'laufen', 1800, 5000),
             (log_b, b, 'strength', current_date, 'manual', true, null, null, null),
             (log_strava_a, a, 'endurance', current_date, 'strava', true, 'laufen', 2400, null),
             (log_old_a, a, 'endurance', current_date - 30, 'manual', true, 'laufen', 1500, 4000),
             (log_strava_old_a, a, 'endurance', current_date - 3, 'strava', true, 'laufen', 2000, null);
    update public.workout_logs set plan_id = plan_b, session_id = 'w1d1' where id = log_b;
    insert into public.workout_logs (client_id, kind, performed_on, source, completed, block_results)
      values (b, 'program', current_date, 'manual', true, '{"p1": {"done": true, "values": [165], "note": ""}}');
    insert into public.set_logs (workout_log_id, client_id, performed_on, exercise_id, set_no, weight_kg, reps)
      values (log_b, b, current_date, 'kniebeuge', 1, 100, 5);
    insert into public.strava_activities (client_id, strava_activity_id, workout_log_id, strava_sport_type, sport,
                                          start_time, start_date_local, moving_time_seconds, distance_m, avg_hr, matched)
      values (a, 987654321012, log_strava_a, 'Run', 'laufen', now(), current_date, 2400, 8000, 151, true);
    insert into public.strava_activities (client_id, strava_activity_id, workout_log_id, strava_sport_type, sport,
                                          start_time, start_date_local, moving_time_seconds, distance_m, avg_hr, matched)
      values (a, 987654321099, log_strava_old_a, 'Run', 'laufen', now() - interval '3 days', current_date - 3, 2000, 6000, 140, false);
    insert into public.strava_connections (client_id, athlete_id, access_token, refresh_token, expires_at)
      values (a, 123456789012, 'geheim-access', 'geheim-refresh', now() + interval '1 hour');
    insert into public.messages (client_id, sender, author_id, body) values
      (a, 'client', a, 'Nachricht von A'), (b, 'client', b, 'Nachricht von B');
    insert into public.client_questionnaires (client_id, goal, answers) values
      (a, 'hyrox', '{"goal":"hyrox"}'), (b, 'laufen', '{"goal":"laufen"}');
    insert into public.health_consents (client_id, consent_version) values (b, 'test');
    insert into public.client_health (client_id, data) values (b, '{"sleepHours":7}');
    select id into rule_locked from public.escalation_rules where locked limit 1;
    if rule_locked is null then
      insert into public.escalation_rules (rule, locked) values ('Testregel gesperrt', true) returning id into rule_locked;
    end if;

    -- ---------------- Prüfungen ----------------
    -- exp: pos = Anzahl > 0, zero = Anzahl = 0, rows0 = Änderung trifft 0 Zeilen, error = muss scheitern
    tests := jsonb_build_array(
      -- Kunde A: eigene Daten
      jsonb_build_object('u','A','exp','pos','d','A liest eigene Trainings','sql','select count(*) from public.workout_logs'),
      jsonb_build_object('u','A','exp','pos','d','A liest eigene Strava-Werte (km/Puls)','sql','select count(*) from public.strava_activities where distance_m = 8000 and avg_hr = 151'),
      -- Kunde A: keine Daten von B lesen
      jsonb_build_object('u','A','exp','zero','d','A liest kein Profil von B','sql','select count(*) from public.profiles where id = ''{B}'''),
      jsonb_build_object('u','A','exp','zero','d','A liest kein Kundenprofil von B','sql','select count(*) from public.client_profiles where client_id = ''{B}'''),
      jsonb_build_object('u','A','exp','zero','d','A liest keine Testwerte von B','sql','select count(*) from public.test_results where client_id = ''{B}'''),
      jsonb_build_object('u','A','exp','zero','d','A liest keine Pläne von B','sql','select count(*) from public.plans where client_id = ''{B}'''),
      jsonb_build_object('u','A','exp','zero','d','A liest keine Planversionen von B','sql','select count(*) from public.plan_versions where client_id = ''{B}'''),
      jsonb_build_object('u','A','exp','zero','d','A liest keine Trainings von B','sql','select count(*) from public.workout_logs where client_id = ''{B}'''),
      jsonb_build_object('u','A','exp','zero','d','A liest keine Sätze von B','sql','select count(*) from public.set_logs where client_id = ''{B}'''),
      jsonb_build_object('u','A','exp','zero','d','A liest keine Nachrichten von B','sql','select count(*) from public.messages where client_id = ''{B}'''),
      -- Kunde A: keine Daten von B schreiben
      jsonb_build_object('u','A','exp','error','d','A legt kein Training für B an','sql','insert into public.workout_logs (client_id, kind, performed_on) values (''{B}'', ''strength'', current_date)'),
      jsonb_build_object('u','A','exp','rows0','d','A ändert kein Training von B','sql','update public.workout_logs set notes = ''x'' where client_id = ''{B}'''),
      jsonb_build_object('u','A','exp','rows0','d','A löscht kein Training von B','sql','delete from public.workout_logs where client_id = ''{B}'''),
      jsonb_build_object('u','A','exp','error','d','A legt keinen Satz in B''s Training an','sql','insert into public.set_logs (workout_log_id, client_id, performed_on, exercise_id, set_no) values (''{LOG_B}'', ''{A}'', current_date, ''x'', 2)'),
      jsonb_build_object('u','A','exp','rows0','d','A ändert keinen Satz von B','sql','update public.set_logs set reps = 1 where client_id = ''{B}'''),
      jsonb_build_object('u','A','exp','error','d','A legt keinen Testwert für B an','sql','insert into public.test_results (client_id, kind, tested_on, value) values (''{B}'', ''run_5k'', current_date, 1)'),
      jsonb_build_object('u','A','exp','rows0','d','A löscht keinen Testwert von B','sql','delete from public.test_results where id = ''{TEST_B}'''),
      jsonb_build_object('u','A','exp','rows0','d','A ändert kein Kundenprofil von B','sql','update public.client_profiles set notes = ''x'' where client_id = ''{B}'''),
      jsonb_build_object('u','A','exp','error','d','A schreibt keine Nachricht direkt (nur über Server/KI-Vorfilter)','sql','insert into public.messages (client_id, sender, author_id, body) values (''{A}'', ''client'', ''{A}'', ''Hallo'')'),
      jsonb_build_object('u','A','exp','error','d','A legt keine Planversion an','sql','select public.save_plan_version(''{PLAN_B}'', ''{}''::jsonb, '''', ''editor'')'),
      -- Kunde A: Rollen/Rechte
      jsonb_build_object('u','A','exp','rows0','d','A kann seine Rolle nicht ändern','sql','update public.profiles set role = ''coach'' where id = ''{A}'''),
      jsonb_build_object('u','A','exp','error','d','A setzt keine Nährstoffziele','sql','update public.client_profiles set protein_g = 999 where client_id = ''{A}'''),
      jsonb_build_object('u','A','exp','error','d','A liest keine Strava-Tokens','sql','select count(*) from public.strava_connections'),
      jsonb_build_object('u','A','exp','error','d','A legt keinen Strava-Eintrag an','sql','insert into public.workout_logs (client_id, kind, performed_on, source) values (''{A}'', ''endurance'', current_date, ''strava'')'),
      jsonb_build_object('u','A','exp','rows0','d','A ändert keinen Strava-Trainingseintrag','sql','update public.workout_logs set duration_seconds = 1 where id = ''{LOG_STRAVA_A}'''),
      jsonb_build_object('u','A','exp','error','d','A ändert keine Strava-Distanz','sql','update public.strava_activities set distance_m = 1 where client_id = ''{A}'''),
      jsonb_build_object('u','A','exp','pos','d','A darf eigenen Strava-Lauf als Test markieren','sql','with x as (update public.strava_activities set is_test = true where client_id = ''{A}'' returning 1) select count(*) from x'),
      jsonb_build_object('u','A','exp','error','d','A legt keine Eskalationsregel an','sql','insert into public.escalation_rules (rule) values (''Hack'')'),
      jsonb_build_object('u','A','exp','zero','d','A liest keine Wissensbasis direkt','sql','select count(*) from public.knowledge_entries'),
      -- Kunde B: keine Strava-Daten von A
      jsonb_build_object('u','B','exp','zero','d','B liest keine Strava-Aktivitäten von A','sql','select count(*) from public.strava_activities'),
      jsonb_build_object('u','B','exp','zero','d','B liest keine Trainings von A','sql','select count(*) from public.workout_logs where client_id = ''{A}'''),
      -- Coach
      jsonb_build_object('u','C','exp','pos','d','Coach liest Trainings aller Kunden','sql','select count(distinct client_id) - 1 from public.workout_logs where client_id in (''{A}'', ''{B}'')'),
      jsonb_build_object('u','C','exp','pos','d','Coach legt Training für Kunden an','sql','with x as (insert into public.workout_logs (client_id, kind, performed_on, completed) values (''{B}'', ''strength'', current_date, true) returning 1) select count(*) from x'),
      jsonb_build_object('u','C','exp','zero','d','Coach liest KEINE Strava-Aktivitäten (km/Puls)','sql','select count(*) from public.strava_activities'),
      jsonb_build_object('u','C','exp','pos','d','Coach sieht Strava-Einheit mit Dauer und Erledigt-Status','sql','select count(*) from public.workout_logs where id = ''{LOG_STRAVA_A}'' and duration_seconds = 2400 and completed'),
      jsonb_build_object('u','C','exp','zero','d','Strava-Einheit enthält für Coach keine Distanz/Puls','sql','select count(*) from public.workout_logs where id = ''{LOG_STRAVA_A}'' and (distance_m is not null or avg_hr is not null)'),
      jsonb_build_object('u','C','exp','rows0','d','Coach ändert keine Strava-Einheit','sql','update public.workout_logs set notes = ''x'' where id = ''{LOG_STRAVA_A}'''),
      jsonb_build_object('u','C','exp','error','d','Coach liest keine Strava-Tokens','sql','select count(*) from public.strava_connections'),
      jsonb_build_object('u','C','exp','error','d','Pflicht-Eskalationsregel nicht abschaltbar','sql','update public.escalation_rules set active = false where id = ''{RULE}'''),
      jsonb_build_object('u','C','exp','error','d','Pflicht-Eskalationsregel nicht löschbar','sql','delete from public.escalation_rules where id = ''{RULE}'''),
      jsonb_build_object('u','C','exp','pos','d','Coach setzt Nährstoffziele','sql','with x as (update public.client_profiles set protein_g = 130 where client_id = ''{A}'' returning 1) select count(*) from x'),
      jsonb_build_object('u','C','exp','error','d','Coach ändert keinen Nachrichtentext','sql','update public.messages set body = ''x'' where client_id = ''{A}'''),
      -- Konto ohne Profil
      jsonb_build_object('u','N','exp','zero','d','Konto ohne Profil sieht keine Trainings','sql','select count(*) from public.workout_logs'),
      jsonb_build_object('u','N','exp','zero','d','Konto ohne Profil sieht keine Profile','sql','select count(*) from public.profiles'),
      jsonb_build_object('u','N','exp','zero','d','Konto ohne Profil bekommt keine Namen','sql','select count(*) from public.profile_names(array[''{C}'',''{A}'']::uuid[])'),
      -- Coach-Profil: Kunden sehen nur den Namen
      jsonb_build_object('u','A','exp','zero','d','A liest keine E-Mail des Coaches','sql','select count(*) from public.profiles where role = ''coach'''),
      jsonb_build_object('u','A','exp','pos','d','A sieht den Namen des Coaches (erfasst von …)','sql','select count(*) from public.profile_names(array[''{C}'']::uuid[])'),
      jsonb_build_object('u','A','exp','zero','d','A bekommt keinen Namen von B','sql','select count(*) from public.profile_names(array[''{B}'']::uuid[])'),
      jsonb_build_object('u','A','exp','error','d','A hat keinen Zugriff auf die Login-Drosselung','sql','select public.hit_rate_limit(''x'', 1000, 60)'),
      -- Fragebogen, Einwilligung, Gesundheitsangaben
      jsonb_build_object('u','A','exp','pos','d','A liest eigenen Fragebogen','sql','select count(*) from public.client_questionnaires where client_id = ''{A}'''),
      jsonb_build_object('u','A','exp','zero','d','A liest keinen Fragebogen von B','sql','select count(*) from public.client_questionnaires where client_id = ''{B}'''),
      jsonb_build_object('u','A','exp','rows0','d','A ändert keinen Fragebogen von B','sql','update public.client_questionnaires set goal = ''abnehmen'' where client_id = ''{B}'''),
      jsonb_build_object('u','A','exp','zero','d','A liest keine Einwilligung von B','sql','select count(*) from public.health_consents where client_id = ''{B}'''),
      jsonb_build_object('u','A','exp','zero','d','A liest keine Gesundheitsangaben von B','sql','select count(*) from public.client_health where client_id = ''{B}'''),
      jsonb_build_object('u','A','exp','error','d','A speichert ohne Einwilligung keine Gesundheitsangaben','sql','insert into public.client_health (client_id, data) values (''{A}'', ''{}'')'),
      jsonb_build_object('u','A','exp','error','d','A gibt keine Einwilligung für B','sql','insert into public.health_consents (client_id, consent_version) values (''{B}'', ''x'')'),
      jsonb_build_object('u','C','exp','error','d','Coach gibt keine Einwilligung für A','sql','insert into public.health_consents (client_id, consent_version) values (''{A}'', ''x'')'),
      jsonb_build_object('u','A','exp','pos','d','A gibt eigene Einwilligung','sql','with x as (insert into public.health_consents (client_id, consent_version) values (''{A}'', ''test'') returning 1) select count(*) from x'),
      jsonb_build_object('u','A','exp','error','d','A hat höchstens eine aktive Einwilligung','sql','insert into public.health_consents (client_id, consent_version) values (''{A}'', ''test2'')'),
      jsonb_build_object('u','A','exp','pos','d','A speichert mit Einwilligung Gesundheitsangaben','sql','with x as (insert into public.client_health (client_id, data) values (''{A}'', ''{"sleepHours":6}'') returning 1) select count(*) from x'),
      jsonb_build_object('u','A','exp','error','d','A ändert den Text der Einwilligung nicht','sql','update public.health_consents set consent_version = ''anders'' where client_id = ''{A}'''),
      jsonb_build_object('u','C','exp','pos','d','Coach liest Gesundheitsangaben mit Einwilligung (B)','sql','select count(*) from public.client_health where client_id = ''{B}'''),
      jsonb_build_object('u','C','exp','pos','d','Coach liest Fragebogen eines Kunden','sql','select count(*) from public.client_questionnaires where client_id = ''{A}'''),
      jsonb_build_object('u','C','exp','rows0','d','Coach widerruft keine Einwilligung für Kunden','sql','update public.health_consents set withdrawn_at = now() where client_id = ''{B}'''),
      jsonb_build_object('u','A','exp','pos','d','A widerruft eigene Einwilligung','sql','with x as (update public.health_consents set withdrawn_at = now() where client_id = ''{A}'' and withdrawn_at is null returning 1) select count(*) from x'),
      jsonb_build_object('u','C','exp','zero','d','Nach Widerruf: Coach liest keine Gesundheitsangaben von A','sql','select count(*) from public.client_health where client_id = ''{A}'''),
      jsonb_build_object('u','A','exp','error','d','Kraftsatz-Test ohne Wdh./RIR wird abgelehnt','sql','insert into public.test_results (client_id, kind, tested_on, value) values (''{A}'', ''squat_reps'', current_date, 60)'),
      jsonb_build_object('u','A','exp','pos','d','Kraftsatz-Test mit Gewicht × Wdh. × RIR','sql','with x as (insert into public.test_results (client_id, kind, tested_on, value, reps, rir) values (''{A}'', ''squat_reps'', current_date, 60, 6, 2) returning 1) select count(*) from x'),
      jsonb_build_object('u','A','exp','pos','d','A trägt Session-RPE bei manueller Einheit ein','sql','with x as (update public.workout_logs set session_rpe = 6 where id = ''{LOG_A}'' returning 1) select count(*) from x'),
      -- Programm-Einheiten (Blockergebnisse)
      jsonb_build_object('u','A','exp','pos','d','A legt eigene Programm-Einheit mit Blockergebnissen an','sql','with x as (insert into public.workout_logs (client_id, kind, performed_on, block_results) values (''{A}'', ''program'', current_date, ''{"p1": {"done": true, "values": [60, 62.5], "note": ""}}'') returning 1) select count(*) from x'),
      jsonb_build_object('u','A','exp','zero','d','A liest keine Blockergebnisse von B','sql','select count(*) from public.workout_logs where block_results is not null and client_id = ''{B}'''),
      jsonb_build_object('u','A','exp','rows0','d','A ändert keine Blockergebnisse von B','sql','update public.workout_logs set block_results = ''{}'' where client_id = ''{B}'' and kind = ''program'''),
      jsonb_build_object('u','C','exp','pos','d','Coach liest Blockergebnisse seiner Kunden','sql','select count(*) from public.workout_logs where client_id = ''{B}'' and block_results ? ''p1'''),
      jsonb_build_object('u','A','exp','error','d','Blockergebnisse müssen ein Objekt sein','sql','insert into public.workout_logs (client_id, kind, performed_on, block_results) values (''{A}'', ''program'', current_date, ''[1, 2]'')'),
      -- Plan löschen und Trainingsverlauf löschen
      jsonb_build_object('u','B','exp','rows0','d','Kunde löscht seinen Plan nicht','sql','delete from public.plans where id = ''{PLAN_B}'''),
      jsonb_build_object('u','A','exp','error','d','Kunde löscht keinen Trainingsverlauf (Funktion)','sql','select public.delete_training_history(''{A}'')'),
      jsonb_build_object('u','N','exp','error','d','Konto ohne Profil löscht keinen Trainingsverlauf','sql','select public.delete_training_history(''{A}'')'),
      jsonb_build_object('u','C','exp','pos','d','Coach löscht aktiven Plan','sql','with x as (delete from public.plans where id = ''{PLAN_B}'' returning 1) select count(*) from x'),
      jsonb_build_object('u','C','exp','pos','d','Coach löscht Trainingsverlauf von vor 7 bis vor 1 Tag (inkl. Strava)','sql','select public.delete_training_history(''{A}'', current_date - 7, current_date - 1)')
    );

    for t in select * from jsonb_array_elements(tests) loop
      i := i + 1;
      usr := case t->>'u' when 'A' then a when 'B' then b when 'C' then c else n end;
      stmt := replace(replace(replace(replace(replace(replace(replace(replace(t->>'sql',
                '{A}', a::text), '{B}', b::text), '{LOG_B}', log_b::text), '{LOG_STRAVA_A}', log_strava_a::text),
                '{TEST_B}', test_b::text), '{PLAN_B}', plan_b::text), '{RULE}', rule_locked::text), '{C}', c::text);
      stmt := replace(stmt, '{LOG_A}', log_a::text);
      ok := false;
      detail := '';
      begin
        perform set_config('request.jwt.claims', json_build_object('sub', usr, 'role', 'authenticated')::text, true);
        execute 'set local role authenticated';
        if t->>'exp' in ('pos', 'zero') then
          execute stmt into v;
          ok := (t->>'exp' = 'pos' and v > 0) or (t->>'exp' = 'zero' and v = 0);
          detail := 'Anzahl ' || v;
        elsif t->>'exp' = 'rows0' then
          execute stmt;
          get diagnostics rc = row_count;
          ok := rc = 0;
          detail := rc || ' Zeilen betroffen';
        else
          execute stmt;
          detail := 'wurde NICHT verhindert';
        end if;
        execute 'reset role';
      exception when others then
        execute 'reset role';
        if t->>'exp' = 'error' then
          ok := true;
          detail := 'verhindert (' || sqlstate || ')';
        else
          detail := 'unerwarteter Fehler: ' || sqlerrm;
        end if;
      end;
      results := results || (i::text || '|' || (t->>'d') || '|' || case when ok then 'OK' else 'FEHLER – ' || detail end);
    end loop;

    -- Datenbank-Constraint: Strava-Einträge können keine Distanz/Puls tragen
    i := i + 1;
    begin
      update public.workout_logs set distance_m = 8000 where id = log_strava_a;
      results := results || (i::text || '|Constraint: Strava-Eintrag ohne Distanz/Puls|FEHLER – Distanz wurde gespeichert');
    exception when check_violation then
      results := results || (i::text || '|Constraint: Strava-Eintrag ohne Distanz/Puls|OK');
    end;

    -- Plan gelöscht: Versionen weg, Training bleibt ohne Plan-Bezug
    i := i + 1;
    select count(*) into v from public.plan_versions where plan_id = plan_b;
    select count(*) into rc from public.workout_logs where id = log_b and plan_id is null;
    results := results || (i::text || '|Plan löschen: Versionen gelöscht, Training bleibt|' || case when v = 0 and rc = 1 then 'OK' else 'FEHLER – Versionen ' || v || ', Training ' || rc end);

    -- Verlauf löschen im Zeitraum: Strava-Eintrag samt Aktivität darin gelöscht, Einträge außerhalb bleiben
    i := i + 1;
    select count(*) into v from public.workout_logs where client_id = a and performed_on between current_date - 7 and current_date - 1;
    select count(*) into rc from public.strava_activities where strava_activity_id = 987654321099;
    results := results || (i::text || '|Verlauf löschen: Zeitraum inkl. Strava gelöscht|' || case when v = 0 and rc = 0 then 'OK' else 'FEHLER – Einheiten ' || v || ', Strava ' || rc end);
    i := i + 1;
    select count(*) into v from public.workout_logs where id in (log_old_a, log_a, log_strava_a);
    results := results || (i::text || '|Verlauf löschen: Einheiten außerhalb des Zeitraums bleiben|' || case when v = 3 then 'OK' else 'FEHLER – nur ' || v || ' von 3' end);

    -- Widerruf hat die Gesundheitsangaben von A tatsächlich gelöscht (als Admin geprüft)
    i := i + 1;
    select count(*) into v from public.client_health where client_id = a;
    results := results || (i::text || '|Widerruf löscht Gesundheitsangaben|' || case when v = 0 then 'OK' else 'FEHLER – ' || v || ' Zeilen übrig' end);

    -- Datenbank-Constraint: Strava-Einträge können keine Session-RPE tragen
    i := i + 1;
    begin
      update public.workout_logs set session_rpe = 5 where id = log_strava_a;
      results := results || (i::text || '|Constraint: Strava-Eintrag ohne Session-RPE|FEHLER – RPE wurde gespeichert');
    exception when check_violation then
      results := results || (i::text || '|Constraint: Strava-Eintrag ohne Session-RPE|OK');
    end;

    raise exception 'rls_test_rollback';
  exception when others then
    if sqlerrm <> 'rls_test_rollback' then
      results := results || ('0|ABBRUCH beim Anlegen der Testdaten|FEHLER – ' || sqlerrm);
    end if;
  end;

  perform set_config('request.jwt.claims', '', true);
  insert into rls_test_ergebnis
    select split_part(r, '|', 1)::int, split_part(r, '|', 2), split_part(r, '|', 3) from unnest(results) r;
  insert into rls_test_ergebnis
    select 9999, 'GESAMT',
      case when count(*) filter (where ergebnis <> 'OK') = 0
           then 'ALLE TESTS BESTANDEN (' || count(*) || ')'
           else 'FEHLER: ' || count(*) filter (where ergebnis <> 'OK') || ' von ' || count(*) || ' Tests fehlgeschlagen' end
    from rls_test_ergebnis;
end;
$test$;

select nr, pruefung, ergebnis from rls_test_ergebnis order by nr;
