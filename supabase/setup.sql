-- =========================================================
-- Teach Idaho - Lean MVP Schema
--
-- UPGRADING an existing database (created before student / students enums):
--   PostgreSQL requires new enum labels to be COMMITTED before use. The SQL Editor
--   runs one script as a single transaction, so you cannot ALTER TYPE ADD VALUE and
--   then reference that label in the same run.
--   1) Run ONLY: supabase/enum_upgrade_student_and_students.sql — execute once.
--   2) Then run this file (setup.sql).
--
-- Fresh database: run this file only (CREATE TYPE already includes all labels).
--
-- Optimized for fewer tables while still matching:
-- - events
-- - teacher registrations
-- - multiple teams per teacher
-- - custom form fields
-- - team roster + submissions
-- - announcements
-- - resources
-- - public rankings
-- =========================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_type where typname = 'user_role'
  ) then
    create type public.user_role as enum ('admin', 'teacher', 'volunteer', 'student');
  end if;

  if not exists (
    select 1 from pg_type where typname = 'event_status'
  ) then
    create type public.event_status as enum ('draft', 'published', 'active', 'closed', 'archived');
  end if;

  if not exists (
    select 1 from pg_type where typname = 'announcement_audience'
  ) then
    create type public.announcement_audience as enum ('public', 'teachers', 'volunteers', 'admins', 'students');
  end if;

  if not exists (
    select 1 from pg_type where typname = 'registration_status'
  ) then
    create type public.registration_status as enum ('draft', 'submitted', 'approved', 'rejected');
  end if;
end $$;

-- ---------------------------------------------------------
-- PROFILES
-- One row per auth user
-- ---------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  role public.user_role not null default 'teacher',
  school_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- EVENTS
-- One row per summit/event
-- custom_settings can hold event-specific config later
-- ---------------------------------------------------------
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  summary text not null,
  location text,
  start_date date,
  end_date date,
  registration_deadline timestamptz,
  status public.event_status not null default 'draft',
  is_public boolean not null default true,
  custom_settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- ANNOUNCEMENTS
-- event_id null = platform-wide announcement
-- ---------------------------------------------------------
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  audience public.announcement_audience not null default 'public',
  event_id uuid references public.events(id) on delete cascade,
  send_email boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Idempotent migration for existing DBs
alter table public.announcements add column if not exists deleted_at timestamptz;

-- Threaded discussion on announcements (public or private to author + admins)
create table if not exists public.announcement_comments (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  parent_id uuid references public.announcement_comments(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  author_email text not null default '',
  author_display_name text not null default '',
  author_role text not null default 'teacher',
  body text not null,
  visibility text not null check (visibility in ('public', 'private')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint announcement_comments_no_self_parent check (parent_id is null or parent_id <> id)
);

create index if not exists idx_announcement_comments_announcement_id
  on public.announcement_comments(announcement_id);
create index if not exists idx_announcement_comments_parent_id
  on public.announcement_comments(parent_id);

-- ---------------------------------------------------------
-- RESOURCES
-- event_id null = site-wide resource
-- url or storage_path can be used
-- ---------------------------------------------------------
create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade,
  category text not null check (category in ('activity', 'country_game', 'research', 'video', 'general')),
  title text not null,
  description text,
  url text,
  storage_path text,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- FORM DEFINITIONS
-- Lean reusable form-builder table
-- scope:
--   registration = fields rendered on registration form
--   team         = fields rendered on team form
--   general      = other reusable forms later
-- fields jsonb stores the frontend field schema
-- ---------------------------------------------------------
create table if not exists public.form_definitions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade,
  scope text not null check (scope in ('registration', 'team', 'general')),
  form_key text not null,
  title text not null,
  description text,
  audience text not null check (audience in ('teachers', 'volunteers', 'public', 'students')),
  fields jsonb not null default '[]'::jsonb,
  version integer not null default 1,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, scope, form_key, version)
);

-- ---------------------------------------------------------
-- REGISTRATIONS
-- Core teacher registration object
-- custom_fields stores answers from registration form
-- ---------------------------------------------------------
create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  status public.registration_status not null default 'draft',
  school_name text not null,
  class_name text,
  teacher_notes text,
  custom_fields jsonb not null default '{}'::jsonb,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, teacher_id)
);

-- ---------------------------------------------------------
-- EVENT ANNOUNCEMENT SUBSCRIPTIONS
-- Students and volunteers opt in per event to receive event-scoped
-- announcements (audience students/volunteers + event_id set).
-- Teachers are scoped via registrations instead.
-- ---------------------------------------------------------
create table if not exists public.event_announcement_subscriptions (
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, event_id)
);

-- ---------------------------------------------------------
-- TEAMS
-- One registration can have many teams
-- To reduce table count:
-- - roster stored as jsonb array
-- - submission stored as jsonb object
-- - rankings stored directly here
-- custom_fields stores extra team form fields
-- Example roster:
-- [
--   {"name":"Ava","grade":"11"},
--   {"name":"Leo","grade":"10"}
-- ]
--
-- Example submission:
-- {
--   "type":"video_link",
--   "title":"Round 1 Submission",
--   "url":"https://...",
--   "storage_path":null,
--   "submitted_at":"..."
-- }
-- ---------------------------------------------------------
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.registrations(id) on delete cascade,
  team_name text not null,
  division text,
  assigned_country text,
  roster jsonb not null default '[]'::jsonb,
  submission jsonb not null default '{}'::jsonb,
  custom_fields jsonb not null default '{}'::jsonb,
  rank integer,
  score numeric,
  ranking_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- INDEXES
-- ---------------------------------------------------------
create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_events_status on public.events(status);
create index if not exists idx_events_slug on public.events(slug);
create index if not exists idx_announcements_event_id on public.announcements(event_id);
create index if not exists idx_announcements_audience on public.announcements(audience);
create index if not exists idx_announcements_deleted_at on public.announcements(deleted_at);
create index if not exists idx_announcement_comments_created_at
  on public.announcement_comments(announcement_id, created_at);
create index if not exists idx_resources_event_id on public.resources(event_id);
create index if not exists idx_resources_category on public.resources(category);
create index if not exists idx_form_definitions_event_scope on public.form_definitions(event_id, scope);
create index if not exists idx_registrations_event_id on public.registrations(event_id);
create index if not exists idx_registrations_teacher_id on public.registrations(teacher_id);
create index if not exists idx_teams_registration_id on public.teams(registration_id);
create index if not exists idx_event_ann_sub_event_id
  on public.event_announcement_subscriptions(event_id);
create index if not exists idx_event_ann_sub_user_id
  on public.event_announcement_subscriptions(user_id);

-- ---------------------------------------------------------
-- UPDATED_AT TRIGGER
-- ---------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists events_set_updated_at on public.events;
create trigger events_set_updated_at
before update on public.events
for each row execute function public.set_updated_at();

drop trigger if exists announcements_set_updated_at on public.announcements;
create trigger announcements_set_updated_at
before update on public.announcements
for each row execute function public.set_updated_at();

drop trigger if exists announcement_comments_set_updated_at on public.announcement_comments;
create trigger announcement_comments_set_updated_at
before update on public.announcement_comments
for each row execute function public.set_updated_at();

drop trigger if exists resources_set_updated_at on public.resources;
create trigger resources_set_updated_at
before update on public.resources
for each row execute function public.set_updated_at();

drop trigger if exists form_definitions_set_updated_at on public.form_definitions;
create trigger form_definitions_set_updated_at
before update on public.form_definitions
for each row execute function public.set_updated_at();

drop trigger if exists registrations_set_updated_at on public.registrations;
create trigger registrations_set_updated_at
before update on public.registrations
for each row execute function public.set_updated_at();

drop trigger if exists teams_set_updated_at on public.teams;
create trigger teams_set_updated_at
before update on public.teams
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------
-- AUTH HELPERS
-- ---------------------------------------------------------
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.role::text
  from public.profiles p
  where p.id = auth.uid()
$$;

create or replace function public.has_any_role(roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() = any (roles), false)
$$;

-- Copy author label at insert time (readers cannot select other users' profiles via RLS)
create or replace function public.announcement_comments_set_author_snapshot()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select
    coalesce(p.email, ''),
    coalesce(nullif(trim(p.full_name), ''), p.email, 'Member'),
    p.role::text
  into new.author_email, new.author_display_name, new.author_role
  from public.profiles p
  where p.id = new.author_id;
  return new;
end;
$$;

drop trigger if exists announcement_comments_author_snapshot on public.announcement_comments;
create trigger announcement_comments_author_snapshot
before insert on public.announcement_comments
for each row execute function public.announcement_comments_set_author_snapshot();

-- Teacher has a registration row for this event (used to scope teacher-targeted posts)
create or replace function public.teacher_registered_for_event(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.registrations r
    where r.teacher_id = auth.uid()
      and r.event_id = p_event_id
      and r.status in ('submitted', 'approved')
  );
$$;

-- Student or volunteer opted in to this event's scoped announcements
create or replace function public.user_subscribed_to_event_announcements(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.event_announcement_subscriptions s
    where s.user_id = auth.uid()
      and s.event_id = p_event_id
  );
$$;

-- Who may read a non-deleted announcement (RLS still enforces deleted_at separately)
create or replace function public.user_can_view_announcement(p_announcement_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  aud public.announcement_audience;
  eid uuid;
begin
  select a.audience, a.event_id into aud, eid
  from public.announcements a
  where a.id = p_announcement_id;

  if not found then
    return false;
  end if;

  -- Site-wide public: anyone. Event-scoped public: only admins + people "in" the event.
  if aud = 'public' then
    if eid is null then
      return true;
    end if;
    if auth.uid() is null then
      return false;
    end if;
    if public.has_any_role(array['admin']) then
      return true;
    end if;
    if public.has_any_role(array['teacher'])
       and public.teacher_registered_for_event(eid) then
      return true;
    end if;
    if public.has_any_role(array['student'])
       and public.user_subscribed_to_event_announcements(eid) then
      return true;
    end if;
    if public.has_any_role(array['volunteer'])
       and public.user_subscribed_to_event_announcements(eid) then
      return true;
    end if;
    return false;
  end if;

  if auth.uid() is null then
    return false;
  end if;

  if public.has_any_role(array['admin']) then
    return true;
  end if;

  if aud = 'teachers' and public.has_any_role(array['teacher']) then
    return eid is null or public.teacher_registered_for_event(eid);
  end if;

  if aud = 'volunteers' and public.has_any_role(array['volunteer']) then
    return eid is null or public.user_subscribed_to_event_announcements(eid);
  end if;

  if aud = 'students' and public.has_any_role(array['student']) then
    return eid is null or public.user_subscribed_to_event_announcements(eid);
  end if;

  if aud = 'admins' and public.has_any_role(array['admin']) then
    return true;
  end if;

  return false;
end;
$$;

-- INSERT helper: signed-in users may comment on any non-deleted announcement.
-- (Who can *read* threads is still enforced by user_can_read_announcement_comment.)
-- Rules: author_id = auth.uid(); public replies only under a public parent.
create or replace function public.user_may_insert_announcement_comment(
  p_announcement_id uuid,
  p_parent_id uuid,
  p_visibility text,
  p_author_id uuid
) returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or auth.uid() <> p_author_id then
    return false;
  end if;
  if p_visibility is null or p_visibility not in ('public', 'private') then
    return false;
  end if;
  if not exists (
    select 1
    from public.announcements a
    where a.id = p_announcement_id
      and a.deleted_at is null
  ) then
    return false;
  end if;

  if p_parent_id is null then
    return true;
  end if;
  if p_visibility = 'private' then
    return true;
  end if;
  return exists (
    select 1
    from public.announcement_comments p
    where p.id = p_parent_id
      and p.visibility = 'public'
  );
end;
$$;

revoke all on function public.user_may_insert_announcement_comment(uuid, uuid, text, uuid) from public;
grant execute on function public.user_may_insert_announcement_comment(uuid, uuid, text, uuid) to authenticated;

-- Walk from comment's parent toward root; true if a private comment by someone else appears
create or replace function public.comment_has_foreign_private_ancestor(
  p_comment_id uuid,
  p_uid uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  cur uuid;
  steps int := 0;
  v_parent uuid;
  v_vis text;
  v_author uuid;
begin
  select parent_id into cur
  from public.announcement_comments
  where id = p_comment_id;

  while cur is not null and steps < 200 loop
    steps := steps + 1;
    select parent_id, visibility, author_id
      into v_parent, v_vis, v_author
    from public.announcement_comments
    where id = cur;

    if not found then
      return false;
    end if;

    if v_vis = 'private' and (p_uid is null or v_author is distinct from p_uid) then
      return true;
    end if;

    cur := v_parent;
  end loop;

  return false;
end;
$$;

-- Read access for one comment (handles private threads + public replies under private parents)
create or replace function public.user_can_read_announcement_comment(p_comment_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  c record;
  ann_ok boolean;
  i_participate boolean;
begin
  if public.has_any_role(array['admin']) then
    return true;
  end if;

  select * into c
  from public.announcement_comments
  where id = p_comment_id;

  if not found then
    return false;
  end if;

  select public.user_can_view_announcement(c.announcement_id) into ann_ok;
  if not coalesce(ann_ok, false) then
    return false;
  end if;

  -- Own comment (any visibility)
  if uid is not null and c.author_id = uid then
    return true;
  end if;

  -- Direct reply to a comment I wrote (e.g. staff reply to my private note)
  if uid is not null and c.parent_id is not null then
    if exists (
      select 1
      from public.announcement_comments pr
      where pr.id = c.parent_id
        and pr.author_id = uid
    ) then
      return true;
    end if;
  end if;

  select exists (
    with recursive anc as (
      select id, parent_id, author_id
      from public.announcement_comments
      where id = p_comment_id
      union all
      select p.id, p.parent_id, p.author_id
      from public.announcement_comments p
      inner join anc on p.id = anc.parent_id
    )
    select 1 from anc where uid is not null and author_id = uid
  ) into i_participate;

  if coalesce(i_participate, false) then
    return true;
  end if;

  if c.visibility = 'public'
     and not public.comment_has_foreign_private_ancestor(p_comment_id, uid) then
    return true;
  end if;

  return false;
end;
$$;

-- ---------------------------------------------------------
-- CREATE PROFILE ON SIGNUP
-- Security change:
-- always default to teacher
-- never trust signup metadata for admin role
-- ---------------------------------------------------------
create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  v_role := coalesce(
    nullif(lower(trim(new.raw_user_meta_data ->> 'signup_role')), ''),
    'teacher'
  );
  if v_role not in ('teacher', 'student', 'volunteer') then
    v_role := 'teacher';
  end if;

  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    v_role::public.user_role
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = coalesce(excluded.full_name, public.profiles.full_name);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user_profile();

-- ---------------------------------------------------------
-- ENABLE RLS
-- ---------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.announcements enable row level security;
alter table public.announcement_comments enable row level security;
alter table public.resources enable row level security;
alter table public.form_definitions enable row level security;
alter table public.registrations enable row level security;
alter table public.teams enable row level security;
alter table public.event_announcement_subscriptions enable row level security;

-- ---------------------------------------------------------
-- PROFILES POLICIES
-- ---------------------------------------------------------
drop policy if exists profiles_select_self_or_admin on public.profiles;
create policy profiles_select_self_or_admin on public.profiles
for select using (
  id = auth.uid() or public.has_any_role(array['admin'])
);

drop policy if exists profiles_update_self_or_admin on public.profiles;
create policy profiles_update_self_or_admin on public.profiles
for update using (
  id = auth.uid() or public.has_any_role(array['admin'])
)
with check (
  id = auth.uid() or public.has_any_role(array['admin'])
);

-- ---------------------------------------------------------
-- EVENTS POLICIES
-- Publicly visible events can be read by everyone signed in
-- Admin manages all
-- ---------------------------------------------------------
drop policy if exists events_select_policy on public.events;
create policy events_select_policy on public.events
for select using (
  is_public = true and status in ('published', 'active', 'closed')
  or public.has_any_role(array['admin'])
);

drop policy if exists events_admin_write_policy on public.events;
create policy events_admin_write_policy on public.events
for all using (public.has_any_role(array['admin']))
with check (public.has_any_role(array['admin']));

-- ---------------------------------------------------------
-- ANNOUNCEMENTS POLICIES
-- ---------------------------------------------------------
drop policy if exists announcements_select_policy on public.announcements;
create policy announcements_select_policy on public.announcements
for select using (
  public.has_any_role(array['admin'])
  or (
    deleted_at is null
    and public.user_can_view_announcement(id)
  )
);

drop policy if exists announcements_admin_write_policy on public.announcements;
create policy announcements_admin_write_policy on public.announcements
for all using (public.has_any_role(array['admin']))
with check (public.has_any_role(array['admin']));

drop policy if exists announcements_admin_delete_policy on public.announcements;
create policy announcements_admin_delete_policy on public.announcements
for delete using (public.has_any_role(array['admin']));

-- Comments: visibility + thread ancestry (see user_can_read_announcement_comment)
drop policy if exists announcement_comments_select_policy on public.announcement_comments;
create policy announcement_comments_select_policy on public.announcement_comments
for select using (
  public.user_can_read_announcement_comment(id)
);

-- Always allow reading your own rows (INSERT … RETURNING / PostgREST must see the new row).
drop policy if exists announcement_comments_select_own on public.announcement_comments;
create policy announcement_comments_select_own on public.announcement_comments
for select using (author_id = auth.uid());

drop policy if exists announcement_comments_insert_policy on public.announcement_comments;
create policy announcement_comments_insert_policy on public.announcement_comments
for insert with check (
  public.user_may_insert_announcement_comment(
    announcement_id,
    parent_id,
    visibility,
    author_id
  )
);

drop policy if exists announcement_comments_delete_policy on public.announcement_comments;
create policy announcement_comments_delete_policy on public.announcement_comments
for delete using (
  author_id = auth.uid()
  or public.has_any_role(array['admin'])
);

-- ---------------------------------------------------------
-- RESOURCES POLICIES
-- ---------------------------------------------------------
drop policy if exists resources_select_policy on public.resources;
create policy resources_select_policy on public.resources
for select using (
  is_public = true
  or public.has_any_role(array['admin', 'teacher', 'volunteer'])
);

drop policy if exists resources_admin_write_policy on public.resources;
create policy resources_admin_write_policy on public.resources
for all using (public.has_any_role(array['admin']))
with check (public.has_any_role(array['admin']));

-- ---------------------------------------------------------
-- FORM DEFINITIONS POLICIES
-- ---------------------------------------------------------
drop policy if exists form_definitions_select_policy on public.form_definitions;
create policy form_definitions_select_policy on public.form_definitions
for select using (
  public.has_any_role(array['admin'])
  or (
    is_active = true
    and (
      audience = 'public'
      or (audience = 'teachers' and public.has_any_role(array['teacher', 'admin']))
      or (audience = 'volunteers' and public.has_any_role(array['volunteer', 'admin']))
      or (audience = 'students' and public.has_any_role(array['student', 'admin']))
    )
  )
);

drop policy if exists form_definitions_admin_write_policy on public.form_definitions;
create policy form_definitions_admin_write_policy on public.form_definitions
for all using (public.has_any_role(array['admin']))
with check (public.has_any_role(array['admin']));

-- ---------------------------------------------------------
-- REGISTRATIONS POLICIES
-- Teachers can manage their own registrations
-- Admin can manage all
-- ---------------------------------------------------------
drop policy if exists registrations_select_policy on public.registrations;
create policy registrations_select_policy on public.registrations
for select using (
  teacher_id = auth.uid()
  or public.has_any_role(array['admin'])
);

drop policy if exists registrations_insert_policy on public.registrations;
create policy registrations_insert_policy on public.registrations
for insert with check (
  teacher_id = auth.uid()
  or public.has_any_role(array['admin'])
);

drop policy if exists registrations_update_policy on public.registrations;
create policy registrations_update_policy on public.registrations
for update using (
  teacher_id = auth.uid()
  or public.has_any_role(array['admin'])
)
with check (
  teacher_id = auth.uid()
  or public.has_any_role(array['admin'])
);

drop policy if exists registrations_delete_policy on public.registrations;
create policy registrations_delete_policy on public.registrations
for delete using (
  teacher_id = auth.uid()
  or public.has_any_role(array['admin'])
);

-- ---------------------------------------------------------
-- EVENT ANNOUNCEMENT SUBSCRIPTION POLICIES
-- ---------------------------------------------------------
drop policy if exists event_ann_sub_select_policy on public.event_announcement_subscriptions;
create policy event_ann_sub_select_policy on public.event_announcement_subscriptions
for select using (
  user_id = auth.uid()
  or public.has_any_role(array['admin'])
);

drop policy if exists event_ann_sub_insert_policy on public.event_announcement_subscriptions;
create policy event_ann_sub_insert_policy on public.event_announcement_subscriptions
for insert with check (
  user_id = auth.uid()
  and (
    public.has_any_role(array['student'])
    or public.has_any_role(array['volunteer'])
    or public.has_any_role(array['admin'])
  )
);

drop policy if exists event_ann_sub_delete_policy on public.event_announcement_subscriptions;
create policy event_ann_sub_delete_policy on public.event_announcement_subscriptions
for delete using (
  user_id = auth.uid()
  or public.has_any_role(array['admin'])
);

-- ---------------------------------------------------------
-- TEAMS POLICIES
-- Teacher can manage teams under their own registration
-- Admin can manage all
-- ---------------------------------------------------------
drop policy if exists teams_select_policy on public.teams;
create policy teams_select_policy on public.teams
for select using (
  public.has_any_role(array['admin'])
  or exists (
    select 1
    from public.registrations r
    where r.id = teams.registration_id
      and r.teacher_id = auth.uid()
  )
  or rank is not null
);

drop policy if exists teams_insert_policy on public.teams;
create policy teams_insert_policy on public.teams
for insert with check (
  public.has_any_role(array['admin'])
  or exists (
    select 1
    from public.registrations r
    where r.id = teams.registration_id
      and r.teacher_id = auth.uid()
  )
);

drop policy if exists teams_update_policy on public.teams;
create policy teams_update_policy on public.teams
for update using (
  public.has_any_role(array['admin'])
  or exists (
    select 1
    from public.registrations r
    where r.id = teams.registration_id
      and r.teacher_id = auth.uid()
  )
)
with check (
  public.has_any_role(array['admin'])
  or exists (
    select 1
    from public.registrations r
    where r.id = teams.registration_id
      and r.teacher_id = auth.uid()
  )
);

drop policy if exists teams_delete_policy on public.teams;
create policy teams_delete_policy on public.teams
for delete using (
  public.has_any_role(array['admin'])
  or exists (
    select 1
    from public.registrations r
    where r.id = teams.registration_id
      and r.teacher_id = auth.uid()
  )
);

-- ---------------------------------------------------------
-- PUBLIC READ HELPERS (participant scoreboard — team + school only, no PII)
-- ---------------------------------------------------------
create or replace function public.list_teams_for_public_event(p_event_id uuid)
returns table (team_id uuid, team_name text, school_name text)
language sql
security definer
set search_path = public
stable
as $$
  select t.id, t.team_name, r.school_name
  from public.teams t
  inner join public.registrations r on r.id = t.registration_id
  inner join public.events e on e.id = r.event_id
  where r.event_id = p_event_id
    and e.is_public = true
    and e.status in ('published', 'active', 'closed');
$$;

revoke all on function public.list_teams_for_public_event(uuid) from public;
grant execute on function public.list_teams_for_public_event(uuid) to anon, authenticated;

-- ---------------------------------------------------------
-- SEED DATA
-- ---------------------------------------------------------
insert into public.events (
  id, name, slug, summary, location, start_date, end_date, registration_deadline, status, is_public
) values
  (
    '3f4d845f-8f3f-49f8-b26c-8ca094f39577',
    'International Economic Summit 2026',
    'international-economic-summit-2026',
    'Country-team presentations, leadership sessions, and collaborative simulation rounds.',
    'Boise, Idaho',
    '2026-05-01',
    '2026-05-02',
    '2026-04-18T23:59:00Z',
    'active',
    true
  ),
  (
    '9d9a1f0f-e66a-4232-9bb7-91efbbf53d66',
    'Idaho HS Entrepreneurs Challenge 2026',
    'idaho-hs-entrepreneurs-challenge-2026',
    'Students build venture ideas, get feedback from mentors, and pitch to judges.',
    'Nampa, Idaho',
    '2026-04-24',
    '2026-04-24',
    '2026-04-10T23:59:00Z',
    'active',
    true
  )
on conflict (id) do nothing;

insert into public.form_definitions (
  id, event_id, scope, form_key, title, description, audience, fields, version, is_active
) values
(
  '8ea5baf4-5f77-4cb7-9a71-64225e0cdcb4',
  null,
  'registration',
  'teacher-registration',
  'Teacher Registration Form',
  'Reusable registration form for participating classrooms.',
  'teachers',
  '[
    {"id":"schoolName","label":"School Name","type":"text","required":true,"placeholder":"Boise High School","layout":{"mdColSpan":1}},
    {"id":"teacherName","label":"Teacher Name","type":"text","required":true,"placeholder":"Jordan Smith","layout":{"mdColSpan":1}},
    {"id":"teacherEmail","label":"Teacher Email","type":"email","required":true,"placeholder":"teacher@school.org","layout":{"mdColSpan":1}},
    {"id":"notes","label":"Notes","type":"textarea","required":false,"placeholder":"Share any constraints or support needed.","layout":{"mdColSpan":3}},
    {"id":"teacherConsent","label":"I confirm this submission is teacher-approved.","type":"checkbox","required":true,"layout":{"mdColSpan":3}}
  ]'::jsonb,
  1,
  true
)
on conflict do nothing;

-- Keep embedded teacher-registration fields in sync when setup.sql is re-applied (existing rows).
update public.form_definitions
set fields = '[
    {"id":"schoolName","label":"School Name","type":"text","required":true,"placeholder":"Boise High School","layout":{"mdColSpan":1}},
    {"id":"teacherName","label":"Teacher Name","type":"text","required":true,"placeholder":"Jordan Smith","layout":{"mdColSpan":1}},
    {"id":"teacherEmail","label":"Teacher Email","type":"email","required":true,"placeholder":"teacher@school.org","layout":{"mdColSpan":1}},
    {"id":"notes","label":"Notes","type":"textarea","required":false,"placeholder":"Share any constraints or support needed.","layout":{"mdColSpan":3}},
    {"id":"teacherConsent","label":"I confirm this submission is teacher-approved.","type":"checkbox","required":true,"layout":{"mdColSpan":3}}
  ]'::jsonb
where id = '8ea5baf4-5f77-4cb7-9a71-64225e0cdcb4';

insert into public.announcements (title, body, audience, event_id)
select
  'Spring events now open',
  'Public registration windows are now live for spring programming.',
  'public',
  null
where not exists (
  select 1 from public.announcements where title = 'Spring events now open'
);

-- Widen form_definitions.audience check on DBs created before "students" (idempotent).
alter table public.form_definitions drop constraint if exists form_definitions_audience_check;
alter table public.form_definitions add constraint form_definitions_audience_check
  check (audience in ('teachers', 'volunteers', 'public', 'students'));

-- announcement_comments: author snapshot columns (existing tables from earlier revision)
alter table public.announcement_comments
  add column if not exists author_email text not null default '';
alter table public.announcement_comments
  add column if not exists author_display_name text not null default '';
alter table public.announcement_comments
  add column if not exists author_role text not null default 'teacher';
