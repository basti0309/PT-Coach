-- PT-Coach: Kunden-Fragebogen, Einwilligung (Art. 9 DSGVO), Gesundheitsangaben, Session-RPE.
-- Erst ausführen, nachdem 20261028000200_testarten.sql gelaufen ist.

-- ---------------------------------------------------------------------------
-- Testwerte: Wiederholungen und Wiederholungen in Reserve für submaximale Kraftsätze
-- ---------------------------------------------------------------------------
alter table public.test_results
  add column reps int check (reps between 1 and 30),
  add column rir int check (rir between 0 and 10),
  add constraint reps_only_for_rep_tests check (
    case when kind in ('squat_reps', 'bench_reps', 'deadlift_reps')
         then reps is not null and rir is not null
         else reps is null and rir is null end
  );

-- ---------------------------------------------------------------------------
-- Fragebogen (ohne Gesundheitsangaben); Validierung: src/lib/questionnaire/schema.ts
-- ---------------------------------------------------------------------------
create table public.client_questionnaires (
  client_id uuid primary key references public.profiles (id) on delete cascade,
  goal text check (goal in ('hyrox', 'laufen', 'kraft_muskelaufbau', 'abnehmen', 'fitness_gesundheit')),
  answers jsonb not null default '{}' check (jsonb_typeof(answers) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null
);
create trigger client_questionnaires_audit before insert or update on public.client_questionnaires
  for each row execute function public.set_audit_fields();

-- ---------------------------------------------------------------------------
-- Einwilligung zur Verarbeitung von Gesundheitsdaten – nur der Kunde selbst
-- ---------------------------------------------------------------------------
create table public.health_consents (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  consent_version text not null check (consent_version <> ''),
  given_at timestamptz not null default now(),
  withdrawn_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null
);
create unique index health_consents_one_active on public.health_consents (client_id) where withdrawn_at is null;
create trigger health_consents_audit before insert or update on public.health_consents
  for each row execute function public.set_audit_fields();

-- Nur Widerruf erlaubt: einmal gesetzt, bleibt withdrawn_at; alles andere unveränderlich.
create function public.guard_health_consent() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.given_at := now();
    new.withdrawn_at := null;
    return new;
  end if;
  if new.client_id <> old.client_id or new.consent_version <> old.consent_version or new.given_at <> old.given_at then
    raise exception 'Einwilligung kann nicht geändert, nur widerrufen werden' using errcode = '42501';
  end if;
  if old.withdrawn_at is not null then
    raise exception 'Einwilligung ist bereits widerrufen' using errcode = '42501';
  end if;
  if new.withdrawn_at is not null then
    new.withdrawn_at := now();
  end if;
  return new;
end;
$$;
create trigger health_consents_guard before insert or update on public.health_consents
  for each row execute function public.guard_health_consent();

create function public.has_health_consent(cid uuid) returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.health_consents h where h.client_id = cid and h.withdrawn_at is null);
$$;
revoke execute on function public.has_health_consent(uuid) from public, anon;
grant execute on function public.has_health_consent(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Gesundheitsangaben – nur mit aktiver Einwilligung lesbar/schreibbar
-- ---------------------------------------------------------------------------
create table public.client_health (
  client_id uuid primary key references public.profiles (id) on delete cascade,
  data jsonb not null default '{}' check (jsonb_typeof(data) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null
);
create trigger client_health_audit before insert or update on public.client_health
  for each row execute function public.set_audit_fields();

-- Widerruf löscht die Gesundheitsangaben (Art. 7 Abs. 3, Art. 17 Abs. 1 lit. b DSGVO).
create function public.delete_health_on_withdrawal() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.withdrawn_at is null and new.withdrawn_at is not null then
    delete from public.client_health where client_id = new.client_id;
  end if;
  return new;
end;
$$;
revoke execute on function public.delete_health_on_withdrawal() from public, anon, authenticated;
create trigger health_consents_withdrawal after update on public.health_consents
  for each row execute function public.delete_health_on_withdrawal();

-- ---------------------------------------------------------------------------
-- Session-RPE (Foster 2001) – nur bei manuell erfassten Einheiten
-- ---------------------------------------------------------------------------
alter table public.workout_logs add column session_rpe smallint check (session_rpe between 0 and 10);
alter table public.workout_logs drop constraint strava_values_private;
alter table public.workout_logs add constraint strava_values_private check (
  source = 'manual' or (distance_m is null and avg_hr is null and is_test = false and session_rpe is null)
);

-- ---------------------------------------------------------------------------
-- Rechte und Row Level Security
-- ---------------------------------------------------------------------------
revoke all on public.client_questionnaires, public.health_consents, public.client_health from anon;
grant select, insert, update on public.client_questionnaires to authenticated;
grant select, insert on public.health_consents to authenticated;
grant update (withdrawn_at) on public.health_consents to authenticated;
grant select, insert, update, delete on public.client_health to authenticated;
grant all on public.client_questionnaires, public.health_consents, public.client_health to service_role;

alter table public.client_questionnaires enable row level security;
alter table public.health_consents enable row level security;
alter table public.client_health enable row level security;

create policy "Fragebogen lesen" on public.client_questionnaires
  for select to authenticated using (public.can_access_client(client_id));
create policy "Fragebogen anlegen" on public.client_questionnaires
  for insert to authenticated with check (public.can_access_client(client_id));
create policy "Fragebogen ändern" on public.client_questionnaires
  for update to authenticated
  using (public.can_access_client(client_id)) with check (public.can_access_client(client_id));

create policy "Einwilligung lesen" on public.health_consents
  for select to authenticated using (public.can_access_client(client_id));
create policy "Einwilligung geben (nur Kunde selbst)" on public.health_consents
  for insert to authenticated with check (client_id = (select auth.uid()));
create policy "Einwilligung widerrufen (nur Kunde selbst)" on public.health_consents
  for update to authenticated
  using (client_id = (select auth.uid())) with check (client_id = (select auth.uid()));

create policy "Gesundheit lesen (mit Einwilligung)" on public.client_health
  for select to authenticated using (public.can_access_client(client_id) and public.has_health_consent(client_id));
create policy "Gesundheit anlegen (mit Einwilligung)" on public.client_health
  for insert to authenticated with check (public.can_access_client(client_id) and public.has_health_consent(client_id));
create policy "Gesundheit ändern (mit Einwilligung)" on public.client_health
  for update to authenticated
  using (public.can_access_client(client_id) and public.has_health_consent(client_id))
  with check (public.can_access_client(client_id) and public.has_health_consent(client_id));
create policy "Gesundheit löschen" on public.client_health
  for delete to authenticated using (public.can_access_client(client_id));
