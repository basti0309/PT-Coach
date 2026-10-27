-- PT-Coach: Grundgerüst – Tabellen, Trigger, Row Level Security
-- Im Supabase-SQL-Editor komplett ausführen (siehe README_SETUP.md).

-- ---------------------------------------------------------------------------
-- Typen
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('coach', 'client');
create type public.test_kind as enum ('run_5k', 'bench_3rm', 'deadlift_3rm', 'squat_3rm', 'mobility', 'body_weight');
create type public.workout_kind as enum ('strength', 'wod', 'endurance');

-- ---------------------------------------------------------------------------
-- Hilfsfunktionen
-- ---------------------------------------------------------------------------

-- Setzt created_by/updated_by aus dem angemeldeten Nutzer (nicht fälschbar).
-- Bei Server-Schreibzugriffen (Service-Role, auth.uid() = null) bleiben übergebene Werte erhalten.
create function public.set_audit_fields() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := now();
    new.updated_at := now();
    new.created_by := coalesce(auth.uid(), new.created_by);
    new.updated_by := coalesce(auth.uid(), new.updated_by, new.created_by);
  else
    new.created_at := old.created_at;
    new.created_by := old.created_by;
    new.updated_at := now();
    new.updated_by := coalesce(auth.uid(), new.updated_by);
  end if;
  return new;
end;
$$;

create function public.set_updated_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Profile
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'client',
  full_name text not null default '',
  short_code text unique check (short_code ~ '^[A-Za-z0-9_-]{1,16}$'),
  email text,
  created_at timestamptz not null default now()
);

create function public.is_coach() returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'coach'
  );
$$;

create function public.can_access_client(cid uuid) returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) = cid or public.is_coach();
$$;

create table public.client_profiles (
  client_id uuid primary key references public.profiles (id) on delete cascade,
  sex text check (sex in ('m', 'w')),
  age int check (age between 10 and 110),
  height_cm numeric(5, 1) check (height_cm between 100 and 250),
  equipment_home text not null default '',
  gym_access boolean,
  training_days_per_week int check (training_days_per_week between 1 and 7),
  max_minutes_per_workout int check (max_minutes_per_workout between 10 and 300),
  notes text not null default '',
  pal_factor numeric(3, 2) not null default 1.50 check (pal_factor between 1.00 and 2.50),
  protein_g int check (protein_g >= 0),
  fat_g int check (fat_g >= 0),
  carbs_g int check (carbs_g >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null
);
create trigger client_profiles_audit before insert or update on public.client_profiles
  for each row execute function public.set_audit_fields();

-- Nährstoffziele setzt nur der Coach.
create function public.guard_nutrition_targets() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.uid() is not null and not public.is_coach() then
    if tg_op = 'INSERT' then
      if new.protein_g is not null or new.fat_g is not null or new.carbs_g is not null then
        raise exception 'Nährstoffziele darf nur der Coach setzen' using errcode = '42501';
      end if;
    elsif new.protein_g is distinct from old.protein_g
       or new.fat_g is distinct from old.fat_g
       or new.carbs_g is distinct from old.carbs_g then
      raise exception 'Nährstoffziele darf nur der Coach setzen' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
create trigger client_profiles_guard_nutrition before insert or update on public.client_profiles
  for each row execute function public.guard_nutrition_targets();

create table public.test_results (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  kind public.test_kind not null,
  tested_on date not null,
  value numeric(8, 2) check (value > 0),
  scale int check (scale between 1 and 10),
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  constraint test_value_present check (kind = 'mobility' or value is not null),
  constraint mobility_has_content check (kind <> 'mobility' or scale is not null or note <> '')
);
create index test_results_client_idx on public.test_results (client_id, kind, tested_on desc);
create trigger test_results_audit before insert or update on public.test_results
  for each row execute function public.set_audit_fields();

-- ---------------------------------------------------------------------------
-- Pläne und Versionen
-- ---------------------------------------------------------------------------
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  is_active boolean not null default true,
  current_version int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null
);
create unique index plans_one_active_per_client on public.plans (client_id) where is_active;
create trigger plans_audit before insert or update on public.plans
  for each row execute function public.set_audit_fields();

create table public.plan_versions (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans (id) on delete cascade,
  client_id uuid not null references public.profiles (id) on delete cascade,
  version int not null,
  content jsonb not null,
  change_note text not null default '',
  source text not null check (source in ('editor', 'import', 'restore', 'seed')),
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  unique (plan_id, version)
);

create function public.plan_versions_before_insert() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  select p.client_id into new.client_id from public.plans p where p.id = new.plan_id;
  new.created_at := now();
  new.created_by := coalesce(auth.uid(), new.created_by);
  return new;
end;
$$;
create trigger plan_versions_before_insert before insert on public.plan_versions
  for each row execute function public.plan_versions_before_insert();

-- Neue Version atomar anlegen. Läuft mit den Rechten des Aufrufers (RLS greift).
-- Der Inhalt wird vorher in der App gegen das Plan-Schema validiert.
create function public.save_plan_version(p_plan_id uuid, p_content jsonb, p_note text, p_source text)
returns int
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_next int;
begin
  update public.plans
     set current_version = current_version + 1,
         title = coalesce(nullif(p_content ->> 'title', ''), title)
   where id = p_plan_id
  returning current_version into v_next;

  if v_next is null then
    raise exception 'Plan nicht gefunden oder keine Berechtigung' using errcode = '42501';
  end if;

  insert into public.plan_versions (plan_id, client_id, version, content, change_note, source)
  values (p_plan_id, '00000000-0000-0000-0000-000000000000', v_next, p_content, coalesce(p_note, ''), p_source);

  return v_next;
end;
$$;

-- ---------------------------------------------------------------------------
-- Trainingserfassung
-- ---------------------------------------------------------------------------
create table public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  kind public.workout_kind not null,
  performed_on date not null,
  title text not null default '',
  plan_id uuid references public.plans (id) on delete set null,
  plan_version int,
  session_id text,
  source text not null default 'manual' check (source in ('manual', 'strava')),
  completed boolean not null default false,
  sport text,
  duration_seconds int check (duration_seconds >= 0),
  distance_m numeric(10, 1) check (distance_m >= 0),
  avg_hr int check (avg_hr between 20 and 250),
  is_test boolean not null default false,
  wod_id text,
  wod_movements_key text,
  wod_result jsonb,
  wod_weights text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  -- Strava-Werte (Distanz, Puls, Test-Markierung) liegen nur in strava_activities.
  constraint strava_values_private check (
    source = 'manual' or (distance_m is null and avg_hr is null and is_test = false)
  )
);
create index workout_logs_client_idx on public.workout_logs (client_id, performed_on desc);
create unique index workout_logs_session_once on public.workout_logs (client_id, plan_id, session_id)
  where session_id is not null;
create trigger workout_logs_audit before insert or update on public.workout_logs
  for each row execute function public.set_audit_fields();

create table public.set_logs (
  id uuid primary key default gen_random_uuid(),
  workout_log_id uuid not null references public.workout_logs (id) on delete cascade,
  client_id uuid not null references public.profiles (id) on delete cascade,
  performed_on date not null,
  exercise_id text not null,
  exercise_name text not null default '',
  set_no int not null check (set_no >= 1),
  weight_kg numeric(6, 2) check (weight_kg >= 0),
  reps int check (reps >= 0),
  done boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  unique (workout_log_id, exercise_id, set_no)
);
create index set_logs_exercise_idx on public.set_logs (client_id, exercise_id, performed_on desc);

-- client_id und Datum kommen immer aus dem zugehörigen Workout (nicht fälschbar).
create function public.set_logs_inherit() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  select w.client_id, w.performed_on into new.client_id, new.performed_on
    from public.workout_logs w where w.id = new.workout_log_id;
  return new;
end;
$$;
create trigger set_logs_inherit before insert or update on public.set_logs
  for each row execute function public.set_logs_inherit();
create trigger set_logs_audit before insert or update on public.set_logs
  for each row execute function public.set_audit_fields();

-- Datum eines Workouts an seine Sätze weitergeben.
create function public.workout_logs_propagate_date() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.performed_on is distinct from old.performed_on then
    update public.set_logs set performed_on = new.performed_on where workout_log_id = new.id;
  end if;
  return new;
end;
$$;
create trigger workout_logs_propagate_date after update on public.workout_logs
  for each row execute function public.workout_logs_propagate_date();

-- ---------------------------------------------------------------------------
-- Strava
-- ---------------------------------------------------------------------------
create table public.strava_connections (
  client_id uuid primary key references public.profiles (id) on delete cascade,
  athlete_id bigint not null unique,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  scope text not null default '',
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger strava_connections_updated before update on public.strava_connections
  for each row execute function public.set_updated_at();

create table public.strava_activities (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  strava_activity_id bigint not null unique,
  workout_log_id uuid unique references public.workout_logs (id) on delete set null,
  strava_sport_type text not null,
  sport text,
  start_time timestamptz not null,
  start_date_local date not null,
  moving_time_seconds int not null check (moving_time_seconds >= 0),
  distance_m numeric(10, 1),
  avg_hr numeric(5, 1),
  is_test boolean not null default false,
  matched boolean not null default false,
  planned_duration_seconds int,
  planned_distance_m numeric(10, 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index strava_activities_client_idx on public.strava_activities (client_id, start_date_local desc);
create trigger strava_activities_updated before update on public.strava_activities
  for each row execute function public.set_updated_at();

-- Verbindungsstatus für den Kunden, ohne Tokens preiszugeben.
create function public.my_strava_status()
returns table (connected boolean, connected_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select c.client_id is not null, c.connected_at
    from (select 1) dummy
    left join public.strava_connections c on c.client_id = (select auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- Chat, Wissensbasis, Regeln, Einstellungen
-- ---------------------------------------------------------------------------
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  sender text not null check (sender in ('client', 'coach', 'ai', 'system')),
  author_id uuid references public.profiles (id) on delete set null,
  body text not null check (char_length(body) between 1 and 4000),
  ai_action text check (ai_action in ('answer', 'escalate')),
  ai_reason text,
  needs_coach boolean not null default false,
  resolved_at timestamptz,
  resolved_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index messages_client_idx on public.messages (client_id, created_at);
create index messages_inbox_idx on public.messages (created_at) where needs_coach and resolved_at is null;

create table public.knowledge_entries (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('wissen', 'faq')),
  title text not null,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null
);
create trigger knowledge_entries_audit before insert or update on public.knowledge_entries
  for each row execute function public.set_audit_fields();

create table public.escalation_rules (
  id uuid primary key default gen_random_uuid(),
  rule text not null check (char_length(rule) between 3 and 500),
  active boolean not null default true,
  locked boolean not null default false,
  sort int not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null
);
create trigger escalation_rules_audit before insert or update on public.escalation_rules
  for each row execute function public.set_audit_fields();

-- Pflichtregeln (locked) sind weder änder- noch abschalt- noch löschbar,
-- und Nutzer können keine neuen Pflichtregeln anlegen.
create function public.guard_locked_rules() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.uid() is null then
    return coalesce(new, old);
  end if;
  if tg_op = 'INSERT' and new.locked then
    raise exception 'Pflichtregeln können nicht angelegt werden' using errcode = '42501';
  end if;
  if tg_op in ('UPDATE', 'DELETE') and old.locked then
    raise exception 'Pflichtregeln sind fest eingestellt und nicht änderbar' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and new.locked then
    raise exception 'Pflichtregeln können nicht angelegt werden' using errcode = '42501';
  end if;
  return coalesce(new, old);
end;
$$;
create trigger escalation_rules_guard before insert or update or delete on public.escalation_rules
  for each row execute function public.guard_locked_rules();

create table public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
create trigger app_settings_updated before update on public.app_settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Rechte (Grants) – anon bekommt nichts, authenticated nur das Nötige
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon;
revoke all on all tables in schema public from authenticated;
revoke execute on all functions in schema public from anon;

grant select, update on public.profiles to authenticated;
grant select, insert, update on public.client_profiles to authenticated;
grant select, insert, delete on public.test_results to authenticated;
grant select, insert, update, delete on public.plans to authenticated;
grant select, insert on public.plan_versions to authenticated;
grant select, insert, update, delete on public.workout_logs to authenticated;
grant select, insert, update, delete on public.set_logs to authenticated;
grant select on public.strava_activities to authenticated;
grant update (is_test) on public.strava_activities to authenticated;
grant select, insert on public.messages to authenticated;
grant update (needs_coach, resolved_at, resolved_by) on public.messages to authenticated;
grant select, insert, update, delete on public.knowledge_entries to authenticated;
grant select, insert, update, delete on public.escalation_rules to authenticated;
grant select, insert, update, delete on public.app_settings to authenticated;
-- strava_connections: bewusst kein Grant – nur Service-Role.

grant all on all tables in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.client_profiles enable row level security;
alter table public.test_results enable row level security;
alter table public.plans enable row level security;
alter table public.plan_versions enable row level security;
alter table public.workout_logs enable row level security;
alter table public.set_logs enable row level security;
alter table public.strava_connections enable row level security;
alter table public.strava_activities enable row level security;
alter table public.messages enable row level security;
alter table public.knowledge_entries enable row level security;
alter table public.escalation_rules enable row level security;
alter table public.app_settings enable row level security;

-- profiles
create policy "Profil: eigenes, Coach-Profile, Coach sieht alle" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or role = 'coach' or public.is_coach());
create policy "Profil: Coach ändert" on public.profiles
  for update to authenticated
  using (public.is_coach()) with check (public.is_coach());

-- client_profiles
create policy "Kundenprofil lesen" on public.client_profiles
  for select to authenticated using (public.can_access_client(client_id));
create policy "Kundenprofil anlegen" on public.client_profiles
  for insert to authenticated with check (public.can_access_client(client_id));
create policy "Kundenprofil ändern" on public.client_profiles
  for update to authenticated
  using (public.can_access_client(client_id)) with check (public.can_access_client(client_id));

-- test_results
create policy "Testwerte lesen" on public.test_results
  for select to authenticated using (public.can_access_client(client_id));
create policy "Testwerte anlegen" on public.test_results
  for insert to authenticated with check (public.can_access_client(client_id));
create policy "Testwerte löschen" on public.test_results
  for delete to authenticated using (public.can_access_client(client_id));

-- plans / plan_versions: Kunde liest, Coach schreibt
create policy "Pläne lesen" on public.plans
  for select to authenticated using (public.can_access_client(client_id));
create policy "Pläne anlegen (Coach)" on public.plans
  for insert to authenticated with check (public.is_coach());
create policy "Pläne ändern (Coach)" on public.plans
  for update to authenticated using (public.is_coach()) with check (public.is_coach());
create policy "Pläne löschen (Coach)" on public.plans
  for delete to authenticated using (public.is_coach());

create policy "Planversionen lesen" on public.plan_versions
  for select to authenticated using (public.can_access_client(client_id));
create policy "Planversionen anlegen (Coach)" on public.plan_versions
  for insert to authenticated with check (public.is_coach());

-- workout_logs: lesen alle eigenen; schreiben nur manuelle
create policy "Training lesen" on public.workout_logs
  for select to authenticated using (public.can_access_client(client_id));
create policy "Training anlegen (manuell)" on public.workout_logs
  for insert to authenticated
  with check (public.can_access_client(client_id) and source = 'manual');
create policy "Training ändern (manuell)" on public.workout_logs
  for update to authenticated
  using (public.can_access_client(client_id) and source = 'manual')
  with check (public.can_access_client(client_id) and source = 'manual');
create policy "Training löschen (manuell)" on public.workout_logs
  for delete to authenticated
  using (public.can_access_client(client_id) and source = 'manual');

-- set_logs
create policy "Sätze lesen" on public.set_logs
  for select to authenticated using (public.can_access_client(client_id));
create policy "Sätze anlegen" on public.set_logs
  for insert to authenticated with check (public.can_access_client(client_id));
create policy "Sätze ändern" on public.set_logs
  for update to authenticated
  using (public.can_access_client(client_id)) with check (public.can_access_client(client_id));
create policy "Sätze löschen" on public.set_logs
  for delete to authenticated using (public.can_access_client(client_id));

-- strava_connections: keine Policies → für angemeldete Nutzer unsichtbar.

-- strava_activities: NUR der Kunde selbst (auch der Coach nicht)
create policy "Strava-Aktivitäten: nur eigene" on public.strava_activities
  for select to authenticated using (client_id = (select auth.uid()));
create policy "Strava-Aktivitäten: Test-Markierung setzen" on public.strava_activities
  for update to authenticated
  using (client_id = (select auth.uid())) with check (client_id = (select auth.uid()));

-- messages
create policy "Nachrichten lesen" on public.messages
  for select to authenticated using (public.can_access_client(client_id));
create policy "Nachrichten schreiben (Coach)" on public.messages
  for insert to authenticated
  with check (public.is_coach() and sender = 'coach' and author_id = (select auth.uid()));
create policy "Posteingang bearbeiten (Coach)" on public.messages
  for update to authenticated using (public.is_coach()) with check (public.is_coach());

-- Coach-only Tabellen
create policy "Wissensbasis (Coach)" on public.knowledge_entries
  for all to authenticated using (public.is_coach()) with check (public.is_coach());
create policy "Eskalationsregeln (Coach)" on public.escalation_rules
  for all to authenticated using (public.is_coach()) with check (public.is_coach());
create policy "Einstellungen (Coach)" on public.app_settings
  for all to authenticated using (public.is_coach()) with check (public.is_coach());

grant execute on function public.is_coach() to authenticated;
grant execute on function public.can_access_client(uuid) to authenticated;
grant execute on function public.save_plan_version(uuid, jsonb, text, text) to authenticated;
grant execute on function public.my_strava_status() to authenticated;
