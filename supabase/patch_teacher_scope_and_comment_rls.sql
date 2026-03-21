-- Run in Supabase SQL editor if you already applied an older setup.sql.
-- 1) Teachers: only submitted/approved registrations count for event-scoped posts.
-- 2) Event-scoped *public* announcements: same gating as above (not world-visible).
-- 3) Comment read: OP + direct replies; private threads; no leaking public under private.
-- 4) Comment insert: replies to a private comment must be private.

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

  if uid is not null and c.author_id = uid then
    return true;
  end if;

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

drop policy if exists announcement_comments_select_policy on public.announcement_comments;
create policy announcement_comments_select_policy on public.announcement_comments
for select using (
  public.user_can_read_announcement_comment(id)
);

drop policy if exists announcement_comments_insert_policy on public.announcement_comments;
create policy announcement_comments_insert_policy on public.announcement_comments
for insert with check (
  auth.uid() is not null
  and author_id = auth.uid()
  and exists (
    select 1
    from public.announcements a
    where a.id = announcement_id
      and a.deleted_at is null
      and public.user_can_view_announcement(a.id)
  )
  and (
    parent_id is null
    or exists (
      select 1
      from public.announcement_comments p
      where p.id = announcement_comments.parent_id
        and p.visibility = 'public'
    )
    or announcement_comments.visibility = 'private'
  )
);
