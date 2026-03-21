-- =========================================================
-- Run this file ALONE first (one execution in Supabase SQL Editor), then run setup.sql
--
-- Why: PostgreSQL error 55P04 — new enum values must be committed before they can
-- appear in policies or CHECK constraints in the same migration. A single script
-- that ALTER TYPE ADD VALUE and then CREATE POLICY ... 'students' ... fails.
--
-- Safe to re-run: skips labels that already exist.
-- =========================================================

do $add_user_role_student$
begin
  if exists (
    select 1 from pg_catalog.pg_type t
    join pg_catalog.pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'user_role'
  ) and not exists (
    select 1
    from pg_catalog.pg_enum e
    join pg_catalog.pg_type t on t.oid = e.enumtypid
    join pg_catalog.pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'user_role'
      and e.enumlabel = 'student'
  ) then
    alter type public.user_role add value 'student';
  end if;
end
$add_user_role_student$;

do $add_announcement_audience_students$
begin
  if exists (
    select 1 from pg_catalog.pg_type t
    join pg_catalog.pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'announcement_audience'
  ) and not exists (
    select 1
    from pg_catalog.pg_enum e
    join pg_catalog.pg_type t on t.oid = e.enumtypid
    join pg_catalog.pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'announcement_audience'
      and e.enumlabel = 'students'
  ) then
    alter type public.announcement_audience add value 'students';
  end if;
end
$add_announcement_audience_students$;
