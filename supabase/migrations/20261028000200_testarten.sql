-- PT-Coach: neue Testarten für Testwochen und Fragebogen (docs/VORLAGEN-ANALYSE.md, docs/REGELWERK.md R4).
-- Eigene Datei: Neue Enum-Werte dürfen erst nach dem Abschluss dieser Ausführung verwendet werden.
-- Im Supabase-SQL-Editor allein ausführen, danach 20261028000300_fragebogen.sql.
alter type public.test_kind add value if not exists 'run_1mile';
alter type public.test_kind add value if not exists 'run_30min';
alter type public.test_kind add value if not exists 'run_30min_submax';
alter type public.test_kind add value if not exists 'squat_reps';
alter type public.test_kind add value if not exists 'bench_reps';
alter type public.test_kind add value if not exists 'deadlift_reps';
alter type public.test_kind add value if not exists 'wallballs_100';
alter type public.test_kind add value if not exists 'ski_5k';
alter type public.test_kind add value if not exists 'row_5k';
alter type public.test_kind add value if not exists 'pullups_2min';
alter type public.test_kind add value if not exists 'lunge_100m';
alter type public.test_kind add value if not exists 'burpee_bar_5min';
