-- PT-Coach: Absicherung (Ergebnis Sicherheits-Review)
-- 1. Kunden sehen vom Coach-Profil nur den Namen (nicht E-Mail/Kürzel).
-- 2. Drosselung für Login, Code-Prüfung und Registrierung.

-- 1) Profile: eigene Zeile oder Coach sieht alles; Namen für "erfasst von" über eine Funktion.
drop policy "Profil: eigenes, Coach-Profile, Coach sieht alle" on public.profiles;
create policy "Profil: eigenes, Coach sieht alle" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or public.is_coach());

-- Liefert nur Namen und Rolle – für Profile, die man selbst ist, Coach-Profile, oder (als Coach) alle.
create function public.profile_names(ids uuid[])
returns table (id uuid, full_name text, role public.user_role)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.full_name, p.role
    from public.profiles p
   where p.id = any(ids)
     and (p.id = (select auth.uid()) or p.role = 'coach' or public.is_coach())
     and exists (select 1 from public.profiles me where me.id = (select auth.uid()));
$$;
revoke execute on function public.profile_names(uuid[]) from public, anon;
grant execute on function public.profile_names(uuid[]) to authenticated;

-- 2) Drosselung: Zähler je Schlüssel (z. B. "login-ip:<hash>") und Zeitfenster. Nur der Server (Service-Role).
create table public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  hits int not null default 0,
  primary key (key, window_start)
);
alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from anon, authenticated;
grant all on public.rate_limits to service_role;

-- Zählt einen Versuch und gibt true zurück, solange das Limit nicht überschritten ist.
create function public.hit_rate_limit(p_key text, p_max int, p_window_seconds int)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_hits int;
begin
  insert into public.rate_limits (key, window_start, hits) values (p_key, v_window, 1)
  on conflict (key, window_start) do update set hits = public.rate_limits.hits + 1
  returning hits into v_hits;
  delete from public.rate_limits where window_start < now() - interval '1 day';
  return v_hits <= p_max;
end;
$$;
revoke execute on function public.hit_rate_limit(text, int, int) from public, anon, authenticated;
grant execute on function public.hit_rate_limit(text, int, int) to service_role;
