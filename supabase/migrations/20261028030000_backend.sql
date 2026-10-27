-- Backend step: duplicate_board, derived-text refresh on renames (closes the D-007 gap), silent mode for bulk copies.

-- app.notify stays quiet while a copy or a reindex is running.
create or replace function app.notify(p_user uuid, p_kind notification_kind, p_board uuid, p_item uuid, p_update uuid, p_text text, p_automation uuid default null) returns void
language plpgsql security definer set search_path = public as $$
declare ws uuid;
begin
  if current_setting('app.silent', true) = '1' then return; end if;
  if p_user is null or (p_automation is null and p_user = app.actor()) then return; end if;
  if app.board_role_for(p_board, p_user) is null then return; end if;
  if exists (select 1 from board_members where board_id = p_board and user_id = p_user and muted) then return; end if;
  select workspace_id into ws from boards where id = p_board;
  insert into notifications (user_id, kind, actor_id, workspace_id, board_id, item_id, update_id, automation_id, text)
  values (p_user, p_kind, app.actor(), ws, p_board, p_item, p_update, p_automation, left(p_text, 500));
end $$;

-- Renaming a label, option, person or tag rewrites the derived text of the cells that show it.
create or replace function app.refresh_cell_text() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform set_config('app.silent', '1', true);
  if tg_table_name = 'columns' then
    if new.settings is distinct from old.settings and new.type in ('status', 'priority', 'dropdown') then
      update column_values set value = value where column_id = new.id;
    end if;
  elsif tg_table_name = 'profiles' then
    if new.name is distinct from old.name then
      update column_values cv set value = cv.value from columns c where c.id = cv.column_id and c.type = 'people' and cv.value -> 'ids' ? new.id::text;
    end if;
  elsif tg_table_name = 'tags' then
    if new.name is distinct from old.name then
      update column_values cv set value = cv.value from columns c where c.id = cv.column_id and c.type = 'tags' and cv.value -> 'ids' ? new.id::text;
    end if;
  end if;
  perform set_config('app.silent', '', true);
  return null;
end $$;
create trigger columns_refresh_text after update on columns for each row execute function app.refresh_cell_text();
create trigger profiles_refresh_text after update on profiles for each row execute function app.refresh_cell_text();
create trigger tags_refresh_text after update on tags for each row execute function app.refresh_cell_text();

-- F15: copy a board. mode: structure | items | items_updates. Automations come along switched off. Files are not copied.
create or replace function public.duplicate_board(p_board uuid, p_mode text default 'structure') returns uuid
language plpgsql security invoker set search_path = public as $$
declare src boards%rowtype; nb uuid; colmap jsonb := '{}'; grpmap jsonb := '{}'; itemmap jsonb := '{}'; r record; nid uuid; s text; k text;
begin
  select * into src from boards where id = p_board;
  if src.id is null then raise exception 'board not found' using errcode = 'invalid_parameter_value'; end if;
  perform set_config('app.silent', '1', true);
  insert into boards (workspace_id, folder_id, name, description, kind, permission_set, created_by)
  values (src.workspace_id, src.folder_id, src.name || ' (copy)', src.description, src.kind, src.permission_set, auth.uid()) returning id into nb;
  for r in select * from columns where board_id = p_board and deleted_at is null order by position loop
    insert into columns (board_id, scope, title, type, settings, width, position, description) values (nb, r.scope, r.title, r.type, r.settings, r.width, r.position, r.description) returning id into nid;
    colmap := colmap || jsonb_build_object(r.id::text, nid);
  end loop;
  for k in select jsonb_object_keys(colmap) loop
    update columns set settings = replace(settings::text, k, colmap ->> k)::jsonb where board_id = nb and settings::text like '%' || k || '%';
  end loop;
  for r in select * from groups where board_id = p_board and deleted_at is null order by position loop
    insert into groups (board_id, title, color, position) values (nb, r.title, r.color, r.position) returning id into nid;
    grpmap := grpmap || jsonb_build_object(r.id::text, nid);
  end loop;
  for r in select * from views where board_id = p_board and deleted_at is null order by position loop
    s := r.settings::text;
    for k in select jsonb_object_keys(colmap) loop s := replace(s, k, colmap ->> k); end loop;
    insert into views (board_id, type, name, position, is_default, settings, created_by) values (nb, r.type, r.name, r.position, r.is_default, s::jsonb, auth.uid());
  end loop;
  if p_mode in ('items', 'items_updates') then
    for r in select * from items where board_id = p_board and deleted_at is null and parent_item_id is null order by position loop
      insert into items (board_id, group_id, name, position, created_by) values (nb, (grpmap ->> r.group_id::text)::uuid, r.name, r.position, auth.uid()) returning id into nid;
      itemmap := itemmap || jsonb_build_object(r.id::text, nid);
    end loop;
    for r in select * from items where board_id = p_board and deleted_at is null and parent_item_id is not null order by position loop
      insert into items (board_id, parent_item_id, name, position, created_by) values (nb, (itemmap ->> r.parent_item_id::text)::uuid, r.name, r.position, auth.uid()) returning id into nid;
      itemmap := itemmap || jsonb_build_object(r.id::text, nid);
    end loop;
    insert into column_values (item_id, column_id, board_id, value)
      select (itemmap ->> cv.item_id::text)::uuid, (colmap ->> cv.column_id::text)::uuid, nb, cv.value
      from column_values cv join columns c on c.id = cv.column_id
      where cv.board_id = p_board and c.type <> 'files' and itemmap ? cv.item_id::text and colmap ? cv.column_id::text;
    if p_mode = 'items_updates' then
      insert into updates (item_id, board_id, author_id, body, pinned, created_at)
        select (itemmap ->> u.item_id::text)::uuid, nb, u.author_id, u.body, u.pinned, u.created_at
        from updates u where u.board_id = p_board and u.deleted_at is null and u.parent_update_id is null and itemmap ? u.item_id::text;
    end if;
  end if;
  for r in select * from automations where board_id = p_board and deleted_at is null loop
    s := jsonb_build_object('t', r.trigger, 'c', r.conditions, 'a', r.actions)::text;
    for k in select jsonb_object_keys(colmap) loop s := replace(s, k, colmap ->> k); end loop;
    for k in select jsonb_object_keys(grpmap) loop s := replace(s, k, grpmap ->> k); end loop;
    insert into automations (board_id, name, enabled, trigger, conditions, actions, created_by) values (nb, r.name, false, (s::jsonb) -> 't', (s::jsonb) -> 'c', (s::jsonb) -> 'a', auth.uid());
  end loop;
  perform set_config('app.silent', '', true);
  return nb;
end $$;
