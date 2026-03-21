-- announcement_comments: permissive insert + own-row select (PostgREST RETURNING).
-- Run in Supabase SQL editor. Safe to re-run.

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
