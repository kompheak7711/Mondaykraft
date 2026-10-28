-- Round four: recurring items. A new automation trigger, 'every', creates items on a schedule.
-- trigger shape: {type:'every', every:'day'|'week'|'month', at_time:'09:00', weekday:0-6 (week), day_of_month:1-31 (month)}
-- It runs from the same pg_cron tick as date triggers; one fire per automation per local day.

create or replace function app.validate_automation() returns trigger
language plpgsql security definer set search_path = public as $$
declare t text := new.trigger ->> 'type'; cid uuid; x jsonb; ty column_type;
begin
  if t not in ('item_created', 'status_changed', 'person_assigned', 'date_arrived', 'every') then
    raise exception 'unknown trigger %', t using errcode = 'check_violation';
  end if;
  if t not in ('item_created', 'every') then
    cid := (new.trigger ->> 'column_id')::uuid;
    ty := app.column_type_on(new.board_id, cid);
    if ty is null then raise exception 'trigger column not on this board' using errcode = 'check_violation'; end if;
    if t = 'status_changed' and ty not in ('status', 'priority') then raise exception 'status trigger needs a status column' using errcode = 'check_violation'; end if;
    if t = 'person_assigned' and ty <> 'people' then raise exception 'person trigger needs a people column' using errcode = 'check_violation'; end if;
    if t = 'date_arrived' then
      if ty <> 'date' then raise exception 'date trigger needs a date column' using errcode = 'check_violation'; end if;
      perform coalesce(new.trigger ->> 'at_time', '09:00')::time;
      perform coalesce(new.trigger ->> 'offset_days', '0')::int;
    end if;
  end if;
  if t = 'every' then
    if new.trigger ->> 'every' not in ('day', 'week', 'month') then raise exception 'repeat needs day, week or month' using errcode = 'check_violation'; end if;
    perform coalesce(new.trigger ->> 'at_time', '09:00')::time;
    if new.trigger ->> 'every' = 'week' and coalesce((new.trigger ->> 'weekday')::int, 1) not between 0 and 6 then raise exception 'weekday must be 0 to 6' using errcode = 'check_violation'; end if;
    if new.trigger ->> 'every' = 'month' and coalesce((new.trigger ->> 'day_of_month')::int, 1) not between 1 and 31 then raise exception 'day of month must be 1 to 31' using errcode = 'check_violation'; end if;
  end if;
  for x in select * from jsonb_array_elements(new.conditions) loop
    if x ->> 'type' not in ('status_is', 'status_is_not', 'person_is', 'group_is', 'checkbox_is') then
      raise exception 'unknown condition %', x ->> 'type' using errcode = 'check_violation';
    end if;
    if x ? 'column_id' and app.column_type_on(new.board_id, (x ->> 'column_id')::uuid) is null then
      raise exception 'condition column not on this board' using errcode = 'check_violation';
    end if;
  end loop;
  for x in select * from jsonb_array_elements(new.actions) loop
    if x ->> 'type' not in ('notify', 'change_status', 'move_to_group', 'assign_person', 'create_item', 'set_date') then
      raise exception 'unknown action %', x ->> 'type' using errcode = 'check_violation';
    end if;
    if x ? 'column_id' and app.column_type_on(new.board_id, (x ->> 'column_id')::uuid) is null then
      raise exception 'action column not on this board' using errcode = 'check_violation';
    end if;
    if x ? 'group_id' and not exists (select 1 from groups where id = (x ->> 'group_id')::uuid and board_id = new.board_id and deleted_at is null) then
      raise exception 'action group not on this board' using errcode = 'check_violation';
    end if;
  end loop;
  return new;
end $$;

-- Actions run without a trigger item for 'every': {item} becomes empty and the item is created by the automation's author when no one is signed in.
create or replace function app.run_action(a automations, act jsonb, p_item uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  it items%rowtype; bname text; msg text; u uuid; gid uuid; cid uuid; tz text; today date; ws uuid;
begin
  select * into it from items where id = p_item;
  select b.name, b.workspace_id, w.timezone into bname, ws, tz from boards b join workspaces w on w.id = b.workspace_id where b.id = a.board_id;
  today := (now() at time zone tz)::date;
  cid := (act ->> 'column_id')::uuid;
  gid := (act ->> 'group_id')::uuid;
  case act ->> 'type'
    when 'notify' then
      msg := replace(replace(coalesce(act ->> 'message', '{item}'), '{item}', coalesce(it.name, '')), '{board}', bname);
      for u in
        select distinct x from (
          select (act ->> 'user_id')::uuid x where act ->> 'to' = 'user'
          union select it.created_by where act ->> 'to' = 'creator'
          union select e::uuid from column_values cv join columns c on c.id = cv.column_id, jsonb_array_elements_text(cv.value -> 'ids') e
                where act ->> 'to' = 'assignees' and cv.item_id = p_item and c.type = 'people' and (cid is null or c.id = cid)
        ) s where x is not null
      loop
        perform app.notify(u, 'automation', a.board_id, p_item, null, msg, a.id);
      end loop;
    when 'change_status' then
      insert into column_values (item_id, column_id, value) values (p_item, cid, jsonb_build_object('label_id', act ->> 'label_id'))
      on conflict (item_id, column_id) do update set value = excluded.value;
    when 'move_to_group' then
      update items set group_id = gid,
        position = (select coalesce(max(position), 0) + 1 from items where group_id = gid and deleted_at is null)
      where id = p_item and parent_item_id is null and group_id is distinct from gid;
    when 'assign_person' then
      insert into column_values (item_id, column_id, value) values (p_item, cid, jsonb_build_object('ids', jsonb_build_array(act ->> 'user_id')))
      on conflict (item_id, column_id) do update
        set value = jsonb_build_object('ids', (column_values.value -> 'ids') || case when column_values.value -> 'ids' ? (act ->> 'user_id') then '[]'::jsonb else jsonb_build_array(act ->> 'user_id') end);
    when 'create_item' then
      if gid is null then select id into gid from groups where board_id = a.board_id and deleted_at is null order by position limit 1; end if;
      insert into items (board_id, group_id, name, position, created_by)
      values (a.board_id, gid, replace(coalesce(act ->> 'name', 'New item'), '{item}', coalesce(it.name, '')),
              (select coalesce(max(position), 0) + 1 from items where group_id = gid and deleted_at is null), coalesce(app.actor(), a.created_by));
    when 'set_date' then
      if act ->> 'mode' = 'clear' then
        delete from column_values where item_id = p_item and column_id = cid;
      else
        insert into column_values (item_id, column_id, value)
        values (p_item, cid, jsonb_build_object('date', (today + coalesce((act ->> 'days')::int, 0))::text))
        on conflict (item_id, column_id) do update set value = excluded.value;
      end if;
  end case;
end $$;

create or replace function public.run_date_automations() returns integer
language plpgsql security definer set search_path = public as $$
declare r record; n integer := 0;
begin
  if not pg_try_advisory_xact_lock(hashtext('run_date_automations')) then return 0; end if;
  for r in
    select a, cv.item_id, (now() at time zone w.timezone)::date as local_date
    from automations a
    join boards b on b.id = a.board_id and b.deleted_at is null and b.archived_at is null
    join workspaces w on w.id = b.workspace_id and w.deleted_at is null
    join column_values cv on cv.column_id = (a.trigger ->> 'column_id')::uuid
    join items i on i.id = cv.item_id and i.deleted_at is null and i.archived_at is null
    where a.enabled and a.deleted_at is null and a.trigger ->> 'type' = 'date_arrived'
      and (cv.value ->> 'date')::date - coalesce((a.trigger ->> 'offset_days')::int, 0) = (now() at time zone w.timezone)::date
      and (now() at time zone w.timezone)::time >= coalesce(a.trigger ->> 'at_time', '09:00')::time
      and not exists (select 1 from automation_runs ar where ar.automation_id = a.id and ar.item_id = cv.item_id
                      and ar.fire_date = (now() at time zone w.timezone)::date)
  loop
    begin
      perform app.run_one_automation(r.a, r.item_id, r.local_date);
      n := n + 1;
    exception when others then
      raise warning 'date automation % on item % failed: %', (r.a).id, r.item_id, sqlerrm;
    end;
  end loop;
  -- Recurring items: 'every' triggers fire once per local day when the clock passes at_time (and the weekday or day of month matches).
  for r in
    select a, null::uuid as item_id, (now() at time zone w.timezone)::date as local_date
    from automations a
    join boards b on b.id = a.board_id and b.deleted_at is null and b.archived_at is null
    join workspaces w on w.id = b.workspace_id and w.deleted_at is null
    where a.enabled and a.deleted_at is null and a.trigger ->> 'type' = 'every'
      and (now() at time zone w.timezone)::time >= coalesce(a.trigger ->> 'at_time', '09:00')::time
      and case a.trigger ->> 'every'
            when 'day' then true
            when 'week' then extract(dow from (now() at time zone w.timezone))::int = coalesce((a.trigger ->> 'weekday')::int, 1)
            else extract(day from (now() at time zone w.timezone))::int = least(coalesce((a.trigger ->> 'day_of_month')::int, 1),
                   extract(day from (date_trunc('month', now() at time zone w.timezone) + interval '1 month - 1 day'))::int)
          end
      and not exists (select 1 from automation_runs ar where ar.automation_id = a.id and ar.fire_date = (now() at time zone w.timezone)::date)
  loop
    begin
      perform app.run_one_automation(r.a, null, r.local_date);
      n := n + 1;
    exception when others then
      raise warning 'recurring automation % failed: %', (r.a).id, sqlerrm;
    end;
  end loop;
  return n;
end $$;
