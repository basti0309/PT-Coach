-- PT-Coach: Standarddaten und Realtime

-- Fest voreingestellte, nicht abschaltbare Eskalationsregeln.
insert into public.escalation_rules (rule, active, locked, sort) values
  ('Schmerzen jeder Art (auch "zieht", "tut weh", Muskel- oder Gelenkschmerzen) → immer an den Coach, keine Einschätzung.', true, true, 1),
  ('Verletzungen oder Verdacht auf Verletzung (Zerrung, Verstauchung, Bänder, Prellung, Sturz) → immer an den Coach.', true, true, 2),
  ('Krankheitssymptome (z. B. Fieber, Erkältung, Übelkeit, Schwindel, Atemnot, Herzrasen) → immer an den Coach.', true, true, 3),
  ('Medikamente (Einnahme, Wechselwirkungen, Dosierung, Nahrungsergänzung mit Medikamentenbezug) → immer an den Coach.', true, true, 4),
  ('Schwangerschaft, Kinderwunsch, Stillzeit → immer an den Coach.', true, true, 5);

-- Beispielhafte, editierbare Regeln.
insert into public.escalation_rules (rule, active, locked, sort) values
  ('Wunsch nach Planänderung, Terminverschiebung oder Pause → an den Coach.', true, false, 10),
  ('Beschwerden, Unzufriedenheit oder Vertragsfragen → an den Coach.', true, false, 11),
  ('Wenn die Wissensbasis die Frage nicht eindeutig beantwortet → an den Coach.', true, false, 12);

-- Chat-Nachrichten live an verbundene Geräte senden (Supabase Realtime).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
     ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end;
$$;
