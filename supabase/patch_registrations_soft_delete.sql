-- Apply on existing databases (idempotent). Also folded into setup.sql for new installs.
alter table public.registrations add column if not exists deleted_at timestamptz;

alter table public.registrations drop constraint if exists registrations_event_id_teacher_id_key;

create unique index if not exists registrations_event_teacher_active_key
  on public.registrations (event_id, teacher_id)
  where deleted_at is null;

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
      and r.deleted_at is null
      and r.status in ('submitted', 'approved')
  );
$$;

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
    and r.deleted_at is null
    and e.is_public = true
    and e.status in ('published', 'active', 'closed');
$$;
