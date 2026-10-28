-- PT-Coach: Programm-Einheiten aus Blöcken (P1, P2 …) mit eigener Wertung.
-- Im Supabase-SQL-Editor einmal ausführen (nach den bisherigen Migrationen).
--
-- workout_logs bekommt die Art 'program' und die Spalte block_results:
--   { "<blockKey>": { "done": true, "values": [165, null], "note": "…" } }
-- Werte: Zeit in Sekunden, Distanz in Metern, Gewicht in kg, sonst ganze Zahlen.
-- Rechte (RLS) bleiben unverändert: Sie gelten zeilenweise für workout_logs.

alter type public.workout_kind add value if not exists 'program';

alter table public.workout_logs
  add column if not exists block_results jsonb;

alter table public.workout_logs
  drop constraint if exists block_results_shape;
alter table public.workout_logs
  add constraint block_results_shape check (
    block_results is null
    or (jsonb_typeof(block_results) = 'object' and length(block_results::text) <= 200000)
  );
