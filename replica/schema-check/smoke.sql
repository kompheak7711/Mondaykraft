\set ON_ERROR_STOP on
\set QUIET on
-- Synthetic users. Fixed ids keep the script readable.
insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'ana@example.com', '{"name":"Ana"}'),
  ('22222222-2222-2222-2222-222222222222', 'ben@example.com', '{"name":"Ben"}'),
  ('33333333-3333-3333-3333-333333333333', 'viv@example.com', '{"name":"Viv"}');

create function act_as(u text) returns void language sql as $$ select set_config('request.jwt.claim.sub', u, false) $$;
create function chk(ok boolean, msg text) returns text language plpgsql as $$
begin if not coalesce(ok, false) then raise exception 'FAILED: %', msg; end if; return 'ok: ' || msg; end $$;
grant execute on function act_as(text), chk(boolean, text) to authenticated;
\set QUIET off
\pset tuples_only on

set role authenticated;
select act_as('11111111-1111-1111-1111-111111111111');

-- F01/F02: workspace and a blank board
insert into workspaces (id, name, created_by) values ('aaaaaaaa-0000-0000-0000-000000000001', 'Acme', '11111111-1111-1111-1111-111111111111');
select chk((select role from workspace_members where workspace_id = 'aaaaaaaa-0000-0000-0000-000000000001' and user_id = '11111111-1111-1111-1111-111111111111') = 'owner', 'workspace creator is owner');
select create_board('aaaaaaaa-0000-0000-0000-000000000001', 'Launch', '{}', null) as bid \gset
select id as gid from groups where board_id = :'bid' \gset
select id as scol from columns where board_id = :'bid' and type = 'status' \gset
select id as pcol from columns where board_id = :'bid' and type = 'people' \gset
select id as dcol from columns where board_id = :'bid' and type = 'date' \gset
select set_config('t.bid', :'bid', false), set_config('t.scol', :'scol', false), set_config('t.dcol', :'dcol', false), set_config('t.gid', :'gid', false);
select chk((select count(*) from columns where board_id = :'bid') = 3, 'blank board gets 3 columns');
select chk((select count(*) from views where board_id = :'bid' and is_default) = 1, 'blank board gets a default view');
select chk((select role from board_members where board_id = :'bid' and user_id = '11111111-1111-1111-1111-111111111111') = 'owner', 'board creator is board owner');

-- F03: items and cells
insert into items (id, board_id, group_id, name, position, created_by) values ('bbbbbbbb-0000-0000-0000-000000000001', :'bid', :'gid', 'Write spec', 1, '11111111-1111-1111-1111-111111111111');
insert into column_values (item_id, column_id, value) values ('bbbbbbbb-0000-0000-0000-000000000001', :'scol', '{"label_id":"working"}');
select chk((select text from column_values where item_id = 'bbbbbbbb-0000-0000-0000-000000000001' and column_id = :'scol') = 'Working on it', 'status text derived from label');
select chk((select count(*) from activities where board_id = :'bid' and kind in ('item_created', 'cell_changed')) = 2, 'activity log has item_created and cell_changed');
select chk((select count(*) from realtime.messages where topic = 'board:' || :'bid') >= 2, 'realtime broadcasts went to the board topic');

-- validation
do $$ begin
  begin insert into column_values (item_id, column_id, value) values ('bbbbbbbb-0000-0000-0000-000000000001', current_setting('t.scol')::uuid, '{"label_id":"nope"}'); raise exception 'FAILED: unknown label accepted';
  exception when check_violation then null; end;
  begin insert into column_values (item_id, column_id, value) values ('bbbbbbbb-0000-0000-0000-000000000001', current_setting('t.dcol')::uuid, '{"date":"next tuesday"}'); raise exception 'FAILED: bad date accepted';
  exception when invalid_datetime_format or check_violation then null; end;
end $$;
select chk(true, 'validator rejects unknown label and bad date');

-- F11: Ben has no access until invited
select act_as('22222222-2222-2222-2222-222222222222');
select chk((select count(*) from boards) = 0, 'non-member sees no boards');
select act_as('11111111-1111-1111-1111-111111111111');
insert into invites (workspace_id, email, role, invited_by) values ('aaaaaaaa-0000-0000-0000-000000000001', 'Ben@Example.com', 'member', '11111111-1111-1111-1111-111111111111');
select token from invites where lower(email) = 'ben@example.com' \gset
select act_as('22222222-2222-2222-2222-222222222222');
select accept_invite(:'token');
select chk((select count(*) from boards where id = :'bid') = 1, 'invited member sees the main board');
update column_values set value = '{"label_id":"stuck"}' where item_id = 'bbbbbbbb-0000-0000-0000-000000000001' and column_id = :'scol';
select chk((select value ->> 'label_id' from column_values where item_id = 'bbbbbbbb-0000-0000-0000-000000000001' and column_id = :'scol') = 'stuck', 'member edits a cell');

-- permission set "view and comment": cells locked, updates allowed, mentions notify
select act_as('11111111-1111-1111-1111-111111111111');
update boards set permission_set = 'view_comment' where id = :'bid';
select act_as('22222222-2222-2222-2222-222222222222');
update column_values set value = '{"label_id":"done"}' where item_id = 'bbbbbbbb-0000-0000-0000-000000000001' and column_id = :'scol';
select chk((select value ->> 'label_id' from column_values where item_id = 'bbbbbbbb-0000-0000-0000-000000000001' and column_id = :'scol') = 'stuck', 'view_comment member cannot edit a cell');
do $$ begin
  begin insert into column_values (item_id, column_id, value) values ('bbbbbbbb-0000-0000-0000-000000000001', current_setting('t.dcol')::uuid, '{"date":"2026-11-01"}'); raise exception 'FAILED: view_comment member inserted a cell';
  exception when insufficient_privilege then null; end;
end $$;
insert into updates (item_id, author_id, body) values ('bbbbbbbb-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222',
  '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Hi "},{"type":"mention","attrs":{"id":"11111111-1111-1111-1111-111111111111","label":"Ana"}}]}]}');
select chk((select body_text from updates where item_id = 'bbbbbbbb-0000-0000-0000-000000000001') = 'Hi', 'update body_text derived from TipTap json');
select act_as('11111111-1111-1111-1111-111111111111');
select chk((select count(*) from notifications where user_id = '11111111-1111-1111-1111-111111111111' and kind = 'mention') = 1, 'mention notifies Ana');
update boards set permission_set = 'edit_everything' where id = :'bid';

-- F08: automation moves the item and notifies the creator
insert into groups (id, board_id, title, position) values ('cccccccc-0000-0000-0000-000000000002', :'bid', 'Done', 2);
insert into automations (board_id, name, trigger, actions, created_by) values (:'bid', 'Done moves',
  jsonb_build_object('type', 'status_changed', 'column_id', :'scol', 'label_id', 'done'),
  '[{"type":"move_to_group","group_id":"cccccccc-0000-0000-0000-000000000002"},{"type":"notify","to":"creator","message":"{item} is done on {board}"}]', '11111111-1111-1111-1111-111111111111');
select act_as('22222222-2222-2222-2222-222222222222');
update column_values set value = '{"label_id":"done"}' where item_id = 'bbbbbbbb-0000-0000-0000-000000000001' and column_id = :'scol';
select chk((select group_id from items where id = 'bbbbbbbb-0000-0000-0000-000000000001') = 'cccccccc-0000-0000-0000-000000000002', 'automation moved the item to Done');
select chk((select count(*) from automation_runs where status = 'ok') = 1, 'one ok automation run');
select chk((select run_count from automations where name = 'Done moves') = 1, 'run_count incremented');
select act_as('11111111-1111-1111-1111-111111111111');
select chk((select count(*) from notifications where user_id = '11111111-1111-1111-1111-111111111111' and kind = 'automation' and text = 'Write spec is done on Launch') = 1, 'automation notified the creator with the template filled');
select chk((select count(*) from activities where item_id = 'bbbbbbbb-0000-0000-0000-000000000001' and kind = 'item_moved' and automation_id is not null) = 1, 'activity attributes the move to the automation');

-- loop guard: two automations that flip each other stop at depth 5
insert into automations (board_id, name, trigger, actions, created_by) values
  (:'bid', 'A', jsonb_build_object('type', 'status_changed', 'column_id', :'scol', 'label_id', 'done'), jsonb_build_array(jsonb_build_object('type', 'change_status', 'column_id', :'scol', 'label_id', 'todo')), '11111111-1111-1111-1111-111111111111'),
  (:'bid', 'B', jsonb_build_object('type', 'status_changed', 'column_id', :'scol', 'label_id', 'todo'), jsonb_build_array(jsonb_build_object('type', 'change_status', 'column_id', :'scol', 'label_id', 'done')), '11111111-1111-1111-1111-111111111111');
update column_values set value = '{"label_id":"todo"}' where item_id = 'bbbbbbbb-0000-0000-0000-000000000001' and column_id = :'scol';
select chk((select count(*) from automation_runs where status = 'skipped' and error like 'loop guard%') >= 1, 'loop guard stopped the ping-pong');
select chk((select count(*) from automation_runs where status = 'failed') = 0, 'no failed runs');
update automations set enabled = false where name in ('A', 'B');

-- viewer role: reads, cannot write or comment
insert into invites (workspace_id, email, role, invited_by) values ('aaaaaaaa-0000-0000-0000-000000000001', 'viv@example.com', 'viewer', '11111111-1111-1111-1111-111111111111');
select token as vtoken from invites where email = 'viv@example.com' \gset
select act_as('33333333-3333-3333-3333-333333333333');
select accept_invite(:'vtoken');
select chk((select count(*) from items where board_id = :'bid') >= 1, 'viewer reads items');
do $$ begin
  begin insert into updates (item_id, author_id, body) values ('bbbbbbbb-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', '{"type":"doc","content":[]}'); raise exception 'FAILED: viewer posted an update';
  exception when insufficient_privilege then null; end;
end $$;
select chk(true, 'viewer cannot post updates');

-- F04: server-side ordering
select act_as('11111111-1111-1111-1111-111111111111');
insert into items (id, board_id, group_id, name, position, created_by) values
  ('bbbbbbbb-0000-0000-0000-000000000002', :'bid', :'gid', 'Design', 2, '11111111-1111-1111-1111-111111111111'),
  ('bbbbbbbb-0000-0000-0000-000000000003', :'bid', :'gid', 'Build', 3, '11111111-1111-1111-1111-111111111111'),
  ('bbbbbbbb-0000-0000-0000-000000000004', :'bid', :'gid', 'Ship', 4, '11111111-1111-1111-1111-111111111111');
select move_rows('items', array['bbbbbbbb-0000-0000-0000-000000000004'::uuid], :'gid', 'bbbbbbbb-0000-0000-0000-000000000002');
select chk((select string_agg(name, ',' order by position, created_at) from items where group_id = :'gid' and deleted_at is null) = 'Design,Ship,Build', 'move_rows placed Ship after Design');
select move_rows('items', array['bbbbbbbb-0000-0000-0000-000000000003'::uuid], :'gid', null);
select chk((select string_agg(name, ',' order by position, created_at) from items where group_id = :'gid' and deleted_at is null) = 'Build,Design,Ship', 'move_rows to the top works');

-- F10: assignment notifies and feeds My Work
insert into column_values (item_id, column_id, value) values ('bbbbbbbb-0000-0000-0000-000000000002', :'pcol', '{"ids":["22222222-2222-2222-2222-222222222222"]}');
select act_as('22222222-2222-2222-2222-222222222222');
select chk((select count(*) from notifications where user_id = '22222222-2222-2222-2222-222222222222' and kind = 'assigned') = 1, 'assignment notifies Ben');
select chk((select count(*) from my_work()) = 1, 'my_work lists the assigned item');
select chk((select item_name from my_work()) = 'Design', 'my_work returns the right item');

-- date automation fires once per day
select act_as('11111111-1111-1111-1111-111111111111');
insert into automations (board_id, name, trigger, actions, created_by) values (:'bid', 'Due today',
  jsonb_build_object('type', 'date_arrived', 'column_id', :'dcol', 'at_time', '00:00', 'offset_days', 0),
  jsonb_build_array(jsonb_build_object('type', 'change_status', 'column_id', :'scol', 'label_id', 'stuck')), '11111111-1111-1111-1111-111111111111');
insert into column_values (item_id, column_id, value) values ('bbbbbbbb-0000-0000-0000-000000000002', :'dcol', jsonb_build_object('date', current_date::text));
reset role;
select chk(run_date_automations() = 1, 'date tick fired once');
select chk(run_date_automations() = 0, 'date tick does not fire twice the same day');
select chk((select value ->> 'label_id' from column_values where item_id = 'bbbbbbbb-0000-0000-0000-000000000002' and column_id = current_setting('t.scol')::uuid) = 'stuck', 'date automation changed the status');
set role authenticated;
select act_as('11111111-1111-1111-1111-111111111111');

-- F12: search; F05: duplicate; F13: group delete cascade and restore
select chk((select count(*) from search('spec')) >= 1, 'search finds the item');
select chk(bulk_items('duplicate', array['bbbbbbbb-0000-0000-0000-000000000002'::uuid]) = 1, 'bulk duplicate returns 1');
select chk((select count(*) from column_values cv join items i on i.id = cv.item_id where i.name = 'Design (copy)') = 3, 'duplicate copied the cells');
update groups set deleted_at = now() where id = :'gid';
select chk((select count(*) from items where group_id = :'gid' and deleted_at is null) = 0, 'deleting a group soft-deletes its items');
select restore('group', :'gid');
select chk((select count(*) from items where group_id = :'gid' and deleted_at is null) = 4, 'restoring the group restores its items');

-- last owner guard
do $$ begin
  begin delete from workspace_members where workspace_id = 'aaaaaaaa-0000-0000-0000-000000000001' and user_id = '11111111-1111-1111-1111-111111111111'; raise exception 'FAILED: last owner removed';
  exception when check_violation then null; end;
end $$;
select chk(true, 'last owner cannot leave');

-- dashboards: battery widget under RLS
insert into dashboards (id, workspace_id, name, created_by) values ('dddddddd-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Overview', '11111111-1111-1111-1111-111111111111');
insert into dashboard_boards values ('dddddddd-0000-0000-0000-000000000001', :'bid');
insert into widgets (id, dashboard_id, type, settings) values ('eeeeeeee-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000001', 'battery', jsonb_build_object('sources', jsonb_build_array(jsonb_build_object('board_id', :'bid', 'column_id', :'scol'))));
select chk((widget_data('eeeeeeee-0000-0000-0000-000000000001') ->> 'total')::int = 5, 'battery widget counts the board items');
select act_as('33333333-3333-3333-3333-333333333333');
select chk((select count(*) from dashboards) = 1, 'viewer reads the main dashboard');

-- purge after 30 days
reset role;
update items set deleted_at = now() - interval '31 days' where id = 'bbbbbbbb-0000-0000-0000-000000000004';
select chk((purge_trash() ->> 'items')::int = 1, 'purge removed the 31-day-old item');
select chk((select count(*) from items where id = 'bbbbbbbb-0000-0000-0000-000000000004') = 0, 'purged item is gone');
select 'SMOKE PASSED';
