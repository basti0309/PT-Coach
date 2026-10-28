-- PT-Coach: Trainingsverlauf eines Kunden löschen (nur Coach), alles oder ein Zeitraum.
-- Löscht auch Strava-Einträge samt zugehöriger Strava-Aktivität. Das ist über RLS nicht möglich
-- (Strava-Einträge sind dort schreibgeschützt), daher eine Funktion, die die Berechtigung selbst prüft.
-- Im Supabase-SQL-Editor einmal ausführen (nach den bisherigen Migrationen).

create function public.delete_training_history(cid uuid, p_from date default null, p_to date default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if not public.is_coach() then
    raise exception 'Nur der Coach kann den Trainingsverlauf löschen' using errcode = '42501';
  end if;
  if p_from is not null and p_to is not null and p_from > p_to then
    raise exception 'Zeitraum ungültig (von nach bis)' using errcode = '22023';
  end if;

  delete from public.strava_activities s
   using public.workout_logs w
   where s.workout_log_id = w.id
     and w.client_id = cid
     and (p_from is null or w.performed_on >= p_from)
     and (p_to is null or w.performed_on <= p_to);

  delete from public.workout_logs w
   where w.client_id = cid
     and (p_from is null or w.performed_on >= p_from)
     and (p_to is null or w.performed_on <= p_to);
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
revoke execute on function public.delete_training_history(uuid, date, date) from public, anon;
grant execute on function public.delete_training_history(uuid, date, date) to authenticated;
