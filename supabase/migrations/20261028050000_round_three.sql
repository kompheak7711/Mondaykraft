-- Round three: duplicate a group, and a public bucket for profile photos.

-- F02: copy a group with its live items, their cells and subitems, placed right after the original.
create or replace function public.duplicate_group(p_group uuid) returns uuid
language plpgsql security invoker set search_path = public as $$
declare g groups%rowtype; nid uuid; src items%rowtype; iid uuid; sub items%rowtype; sid uuid; pos numeric;
begin
  select * into g from groups where id = p_group and deleted_at is null;
  if not found then raise exception 'group not found' using errcode = 'no_data_found'; end if;
  select (g.position + coalesce(min(position), g.position + 2)) / 2 into pos
    from groups where board_id = g.board_id and position > g.position and deleted_at is null;
  -- A copy is not a change: no notifications and no automations while it runs (the copies keep their cells as they are).
  perform set_config('app.silent', '1', true);
  insert into groups (board_id, title, color, position) values (g.board_id, left(g.title, 193) || ' (copy)', g.color, pos) returning id into nid;
  for src in select * from items where group_id = g.id and parent_item_id is null and deleted_at is null and archived_at is null order by position loop
    insert into items (board_id, group_id, name, position, created_by) values (g.board_id, nid, src.name, src.position, auth.uid()) returning id into iid;
    insert into column_values (item_id, column_id, value) select iid, column_id, value from column_values where item_id = src.id;
    for sub in select * from items where parent_item_id = src.id and deleted_at is null order by position loop
      insert into items (board_id, parent_item_id, name, position, created_by) values (g.board_id, iid, sub.name, sub.position, auth.uid()) returning id into sid;
      insert into column_values (item_id, column_id, value) select sid, column_id, value from column_values where item_id = sub.id;
    end loop;
  end loop;
  perform set_config('app.silent', '', true);
  return nid;
end $$;

-- Automations stay quiet during copies too (duplicate_group sets app.silent; duplicate_board already did for notifications).
create or replace function app.run_automations(p_board uuid, p_item uuid, p_event text, p_column uuid, p_payload jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare a automations%rowtype;
begin
  if current_setting('app.silent', true) = '1' then return; end if;
  for a in select * from automations where board_id = p_board and enabled and deleted_at is null and trigger ->> 'type' = p_event order by created_at loop
    if p_event in ('status_changed', 'person_assigned') and (a.trigger ->> 'column_id')::uuid is distinct from p_column then continue; end if;
    if p_event = 'status_changed' and a.trigger ->> 'label_id' is not null and a.trigger ->> 'label_id' <> p_payload ->> 'label_id' then continue; end if;
    if p_event = 'person_assigned' and a.trigger ->> 'user_id' is not null and not (p_payload -> 'added' ? (a.trigger ->> 'user_id')) then continue; end if;
    perform app.run_one_automation(a, p_item);
  end loop;
end $$;

-- S26: profile photos. Public bucket (the URL is stored on the profile); each person writes only inside their own folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/png', 'image/jpeg', 'image/webp', 'image/gif']) on conflict (id) do nothing;
create policy avatars_read on storage.objects for select to authenticated using (bucket_id = 'avatars');
create policy avatars_upload on storage.objects for insert to authenticated with check (
  bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy avatars_update on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy avatars_remove on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
