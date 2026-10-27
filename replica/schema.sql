-- Taskraft Management: first migration.
-- Postgres 15+ on Supabase. Everything a user owns carries a workspace_id or board_id;
-- row level security is the only authorization layer (see architecture.md, "Access rules").
-- Run after the Supabase project exists: supabase db push, or paste into the SQL editor.

create extension if not exists pgcrypto;
do $$ begin create extension if not exists pg_cron; exception when others then raise notice 'pg_cron not available here: %', sqlerrm; end $$;

-- Internal helpers live in "app" so PostgREST never exposes them. RPCs stay in "public".
create schema if not exists app;
grant usage on schema app to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Enums: stable sets only. Growing lists (activity kinds) use text + check.
-- ---------------------------------------------------------------------------
create type workspace_role as enum ('owner', 'admin', 'member', 'viewer');
create type board_role as enum ('owner', 'member', 'viewer');
create type board_kind as enum ('main', 'private');
create type permission_set as enum ('edit_everything', 'edit_content', 'edit_assigned', 'view_comment');
create type column_scope as enum ('item', 'subitem');
create type column_type as enum (
  'status', 'priority', 'people', 'date', 'timeline', 'numbers', 'text', 'long_text',
  'dropdown', 'tags', 'checkbox', 'link', 'files', 'progress', 'creation_log', 'last_updated');
create type view_type as enum ('table', 'kanban', 'calendar', 'timeline', 'chart');
create type notification_kind as enum ('mention', 'assigned', 'reply', 'update', 'automation', 'deleted', 'archived');
create type run_status as enum ('ok', 'failed', 'skipped');
create type widget_type as enum ('numbers', 'chart', 'battery', 'workload', 'table');

-- ---------------------------------------------------------------------------
-- People and tenancy
-- ---------------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text not null check (length(name) between 1 and 120),
  avatar_url text,
  title text,
  timezone text not null default 'UTC',
  theme text not null default 'system' check (theme in ('light', 'dark', 'system')),
  notification_prefs jsonb not null default '{}',
  my_work_hidden_board_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 120),
  description text,
  color text,
  timezone text not null default 'UTC',          -- date automations fire in this zone
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table workspace_members (
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role workspace_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create index on workspace_members (user_id);

create table invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  email text not null check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  role workspace_role not null default 'member' check (role <> 'owner'),
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  invited_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '14 days',
  accepted_at timestamptz,
  accepted_by uuid references profiles(id) on delete set null
);
create unique index invites_one_open_per_email on invites (workspace_id, lower(email)) where accepted_at is null;

create table folders (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  parent_folder_id uuid references folders(id) on delete cascade,
  name text not null check (length(name) between 1 and 120),
  color text,
  position numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on folders (workspace_id, parent_folder_id, position);

-- ---------------------------------------------------------------------------
-- Boards and their structure
-- ---------------------------------------------------------------------------
create table boards (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  folder_id uuid references folders(id) on delete set null,
  name text not null check (length(name) between 1 and 200),
  description text,
  kind board_kind not null default 'main',
  permission_set permission_set not null default 'edit_everything',
  position numeric not null default 0,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  deleted_at timestamptz
);
create index on boards (workspace_id, folder_id, position) where deleted_at is null;
create index on boards (deleted_at) where deleted_at is not null;

create table board_members (
  board_id uuid not null references boards(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role board_role not null default 'member',
  subscribed boolean not null default true,     -- gets "new update" notifications
  muted boolean not null default false,         -- gets nothing from this board
  created_at timestamptz not null default now(),
  primary key (board_id, user_id)
);
create index on board_members (user_id);

create table groups (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references boards(id) on delete cascade,
  title text not null check (length(title) between 1 and 200),
  color text not null default 'blue',
  position numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  deleted_at timestamptz
);
create index on groups (board_id, position) where deleted_at is null;

create table columns (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references boards(id) on delete cascade,
  scope column_scope not null default 'item',
  title text not null check (length(title) between 1 and 120),
  type column_type not null,
  settings jsonb not null default '{}',          -- shape per type: see architecture.md
  width integer not null default 140 check (width between 60 and 1000),
  position numeric not null default 0,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index on columns (board_id, scope, position) where deleted_at is null;

create table items (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references boards(id) on delete cascade,
  group_id uuid references groups(id) on delete cascade,          -- null for subitems
  parent_item_id uuid references items(id) on delete cascade,     -- set for subitems
  name text not null check (length(name) between 1 and 500),
  position numeric not null default 0,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  deleted_at timestamptz,
  name_tsv tsvector generated always as (to_tsvector('simple', name)) stored,
  constraint items_subitem_shape check ((parent_item_id is null) = (group_id is not null))
);
create index on items (board_id, group_id, position) where deleted_at is null and parent_item_id is null;
create index on items (parent_item_id, position) where deleted_at is null;
create index on items (board_id, deleted_at) where deleted_at is not null;
create index on items using gin (name_tsv);

create table column_values (
  item_id uuid not null references items(id) on delete cascade,
  column_id uuid not null references columns(id) on delete cascade,
  board_id uuid not null references boards(id) on delete cascade,   -- filled by trigger, for RLS and realtime
  value jsonb not null,                           -- validated per column type by app.validate_column_value
  text text not null default '',                  -- derived by the same trigger: search and plain display
  updated_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  text_tsv tsvector generated always as (to_tsvector('simple', text)) stored,
  primary key (item_id, column_id)
);
create index on column_values (column_id);
create index on column_values (board_id);
create index on column_values using gin (value jsonb_path_ops);   -- people/tags/dropdown containment
create index on column_values using gin (text_tsv);

create table views (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references boards(id) on delete cascade,
  type view_type not null default 'table',
  name text not null check (length(name) between 1 and 120),
  position numeric not null default 0,
  is_default boolean not null default false,
  settings jsonb not null default '{}',           -- filters, sort, hidden_column_ids, group_by, per-type keys
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index on views (board_id, position) where deleted_at is null;
create unique index views_one_default_per_board on views (board_id) where is_default and deleted_at is null;

-- ---------------------------------------------------------------------------
-- Conversation and files
-- ---------------------------------------------------------------------------
create table updates (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references items(id) on delete cascade,
  board_id uuid not null references boards(id) on delete cascade,   -- filled by trigger
  author_id uuid references profiles(id) on delete set null,
  body jsonb not null,                            -- TipTap document
  body_text text not null default '',             -- derived by trigger: search, notification text
  parent_update_id uuid references updates(id) on delete cascade,  -- one level of replies
  pinned boolean not null default false,
  edited_at timestamptz,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  body_tsv tsvector generated always as (to_tsvector('simple', body_text)) stored
);
create index on updates (item_id, created_at);
create index on updates (board_id, created_at desc) where parent_update_id is null and deleted_at is null;
create index on updates using gin (body_tsv);

create table reactions (
  update_id uuid not null references updates(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  emoji text not null check (length(emoji) between 1 and 16),
  created_at timestamptz not null default now(),
  primary key (update_id, user_id, emoji)
);

create table assets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  board_id uuid not null references boards(id) on delete cascade,
  item_id uuid not null references items(id) on delete cascade,
  column_id uuid references columns(id) on delete set null,      -- files column, or
  update_id uuid references updates(id) on delete set null,      -- attachment on an update
  name text not null check (length(name) between 1 and 255),
  size bigint not null check (size between 1 and 26214400),      -- 25 MB, also set on the bucket
  mime text not null,
  storage_path text not null unique,              -- {workspace_id}/{board_id}/{asset_id}
  uploaded_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint assets_one_parent check (num_nonnulls(column_id, update_id) = 1)
);
create index on assets (item_id) where deleted_at is null;
create index on assets (board_id);

-- ---------------------------------------------------------------------------
-- History, automations, notifications
-- ---------------------------------------------------------------------------
create table activities (
  id bigint generated always as identity primary key,   -- append-only log: identity, not uuid
  board_id uuid not null references boards(id) on delete cascade,
  item_id uuid references items(id) on delete cascade,
  actor_id uuid references profiles(id) on delete set null,
  automation_id uuid,                              -- set when an automation made the change
  kind text not null check (kind in (
    'item_created', 'item_renamed', 'item_moved', 'item_archived', 'item_deleted', 'item_restored',
    'cell_changed', 'cell_cleared',
    'group_created', 'group_changed', 'group_deleted', 'group_restored',
    'column_added', 'column_changed', 'column_deleted',
    'board_changed', 'board_permissions_changed', 'board_archived', 'board_deleted', 'board_restored',
    'member_added', 'member_changed', 'member_removed',
    'automation_created', 'automation_changed', 'automation_deleted')),
  column_id uuid references columns(id) on delete set null,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);
create index on activities (board_id, created_at desc);
create index on activities (item_id, created_at desc) where item_id is not null;

create table automations (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references boards(id) on delete cascade,
  name text not null check (length(name) between 1 and 200),
  enabled boolean not null default true,
  trigger jsonb not null,                          -- {type, column_id?, label_id?, user_id?, at_time?, offset_days?}
  conditions jsonb not null default '[]' check (jsonb_typeof(conditions) = 'array'),
  actions jsonb not null check (jsonb_typeof(actions) = 'array' and jsonb_array_length(actions) between 1 and 10),
  created_by uuid references profiles(id) on delete set null,
  run_count integer not null default 0,
  last_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index on automations (board_id) where deleted_at is null and enabled;
create index on automations ((trigger ->> 'type')) where deleted_at is null and enabled;

create table automation_runs (
  id uuid primary key default gen_random_uuid(),
  automation_id uuid not null references automations(id) on delete cascade,
  board_id uuid not null references boards(id) on delete cascade,
  item_id uuid references items(id) on delete set null,
  status run_status not null,
  error text,
  depth smallint not null default 0,
  fire_date date,                                  -- date triggers only: one fire per item per day
  started_at timestamptz not null default now(),
  finished_at timestamptz
);
create index on automation_runs (automation_id, started_at desc);
create index on automation_runs (board_id, started_at desc);
create unique index automation_runs_one_fire_per_day on automation_runs (automation_id, item_id, fire_date) where fire_date is not null;

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  kind notification_kind not null,
  actor_id uuid references profiles(id) on delete set null,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  board_id uuid references boards(id) on delete cascade,
  item_id uuid references items(id) on delete cascade,
  update_id uuid references updates(id) on delete cascade,
  automation_id uuid references automations(id) on delete set null,
  text text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index on notifications (user_id, created_at desc);
create index on notifications (user_id) where read_at is null;

-- ---------------------------------------------------------------------------
-- Dashboards, favorites, tags
-- ---------------------------------------------------------------------------
create table dashboards (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  folder_id uuid references folders(id) on delete set null,
  name text not null check (length(name) between 1 and 200),
  kind board_kind not null default 'main',         -- private: creator only
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index on dashboards (workspace_id) where deleted_at is null;

create table dashboard_boards (
  dashboard_id uuid not null references dashboards(id) on delete cascade,
  board_id uuid not null references boards(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (dashboard_id, board_id)
);
create index on dashboard_boards (board_id);

create table widgets (
  id uuid primary key default gen_random_uuid(),
  dashboard_id uuid not null references dashboards(id) on delete cascade,
  type widget_type not null,
  title text not null default '' check (length(title) <= 120),
  settings jsonb not null default '{}',           -- per type: see architecture.md
  layout jsonb not null default '{"x":0,"y":0,"w":4,"h":3}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on widgets (dashboard_id);

create table favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  board_id uuid references boards(id) on delete cascade,
  dashboard_id uuid references dashboards(id) on delete cascade,
  position numeric not null default 0,
  created_at timestamptz not null default now(),
  constraint favorites_one_target check (num_nonnulls(board_id, dashboard_id) = 1)
);
create unique index favorites_board_once on favorites (user_id, board_id) where board_id is not null;
create unique index favorites_dashboard_once on favorites (user_id, dashboard_id) where dashboard_id is not null;

create table tags (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null check (length(name) between 1 and 60),
  color text not null default 'gray',
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index tags_unique_name on tags (workspace_id, lower(name));

-- ===========================================================================
-- Helpers: who is asking, and what may they do
-- ===========================================================================
create or replace function app.actor() returns uuid
language sql stable as $$
  select coalesce(nullif(current_setting('app.actor', true), '')::uuid, auth.uid())
$$;

create or replace function app.workspace_role(p_workspace uuid) returns workspace_role
language sql stable security definer set search_path = public as $$
  select role from workspace_members where workspace_id = p_workspace and user_id = auth.uid()
$$;

-- The one rule every board policy uses. null = no access.
-- workspace viewer -> viewer. private board -> explicit members only.
-- board owner, or workspace owner/admin -> owner.
-- It takes the board's columns as arguments so it also works on a row that is being inserted:
-- RETURNING checks the select policy before the new row (or the owner row its trigger adds) is visible.
-- A board with no member rows yet is therefore readable by its creator.
create or replace function app.board_role_from(p_board uuid, p_workspace uuid, p_kind board_kind, p_created_by uuid, p_user uuid) returns board_role
language sql stable security definer set search_path = public as $$
  select case
    when wm.role is null then null
    when p_kind = 'private' and bm.role is null
         and not (p_created_by = p_user and not exists (select 1 from board_members where board_id = p_board)) then null
    when wm.role = 'viewer' then 'viewer'::board_role
    when bm.role = 'owner' or wm.role in ('owner', 'admin') then 'owner'::board_role
    when bm.role is null and p_created_by = p_user and not exists (select 1 from board_members where board_id = p_board) then 'owner'::board_role
    when bm.role = 'member' or p_kind = 'main' then 'member'::board_role
    else bm.role
  end
  from (select 1) x
  left join workspace_members wm on wm.workspace_id = p_workspace and wm.user_id = p_user
  left join board_members bm on bm.board_id = p_board and bm.user_id = p_user
$$;

create or replace function app.board_role_for(p_board uuid, p_user uuid) returns board_role
language sql stable security definer set search_path = public as $$
  select app.board_role_from(b.id, b.workspace_id, b.kind, b.created_by, p_user) from boards b where b.id = p_board
$$;

create or replace function app.board_role(p_board uuid) returns board_role
language sql stable security definer set search_path = public as $$
  select app.board_role_for(p_board, auth.uid())
$$;

-- Same idea for workspaces (the owner row arrives in an after-insert trigger) and dashboards.
create or replace function app.workspace_access(p_workspace uuid, p_created_by uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select app.workspace_role(p_workspace) is not null
      or (p_created_by = auth.uid() and not exists (select 1 from workspace_members where workspace_id = p_workspace))
$$;

create or replace function app.dashboard_access(p_workspace uuid, p_kind board_kind, p_created_by uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select app.workspace_role(p_workspace) is not null and (p_kind = 'main' or p_created_by = auth.uid())
$$;

create or replace function app.can_read_board(p_board uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select app.board_role(p_board) is not null
$$;

-- Structure: columns, groups, views, automations, board settings.
create or replace function app.can_edit_structure(p_board uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select r = 'owner' or (r = 'member' and b.permission_set = 'edit_everything')
  from boards b, lateral (select app.board_role(p_board) r) x where b.id = p_board
$$;

-- Content: create, move, delete items and edit any cell.
create or replace function app.can_edit_items(p_board uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select r = 'owner' or (r = 'member' and b.permission_set in ('edit_everything', 'edit_content'))
  from boards b, lateral (select app.board_role(p_board) r) x where b.id = p_board
$$;

-- One item: content rights, or "edit assigned" and a people column names me (on the item or its parent).
create or replace function app.can_edit_item(p_item uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select app.can_edit_items(i.board_id)
      or (app.board_role(i.board_id) = 'member' and b.permission_set = 'edit_assigned' and exists (
            select 1 from column_values cv join columns c on c.id = cv.column_id
            where cv.item_id in (i.id, i.parent_item_id) and c.type = 'people'
              and cv.value -> 'ids' ? auth.uid()::text))
  from items i join boards b on b.id = i.board_id where i.id = p_item
$$;

-- Updates and reactions: every member, whatever the permission set. Viewers read only.
create or replace function app.can_comment(p_board uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select app.board_role(p_board) in ('owner', 'member')
$$;

create or replace function app.can_read_dashboard(p_dashboard uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select app.dashboard_access(d.workspace_id, d.kind, d.created_by) from dashboards d where d.id = p_dashboard
$$;

create or replace function app.can_edit_dashboard(p_dashboard uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select d.created_by = auth.uid() or app.workspace_role(d.workspace_id) in ('owner', 'admin')
  from dashboards d where d.id = p_dashboard and app.workspace_role(d.workspace_id) <> 'viewer'
$$;

-- ===========================================================================
-- Row triggers: bookkeeping and invariants the schema cannot express
-- ===========================================================================
create or replace function app.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- A new auth user gets a profile. Name falls back to the email's local part.
create or replace function app.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, name, avatar_url)
  values (new.id, new.email,
          coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1)),
          new.raw_user_meta_data ->> 'avatar_url')
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function app.handle_new_user();

-- Creating a workspace makes you its owner; creating a board makes you its owner.
create or replace function app.workspace_after_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into workspace_members (workspace_id, user_id, role) values (new.id, coalesce(new.created_by, auth.uid()), 'owner');
  return new;
end $$;
create trigger workspaces_owner after insert on workspaces for each row execute function app.workspace_after_insert();

create or replace function app.board_after_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into board_members (board_id, user_id, role) values (new.id, coalesce(new.created_by, auth.uid()), 'owner')
  on conflict do nothing;
  return new;
end $$;
create trigger boards_owner after insert on boards for each row execute function app.board_after_insert();

-- Never remove the last owner of a workspace or a board.
create or replace function app.guard_last_owner() returns trigger
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if tg_table_name = 'workspace_members' then
    if old.role = 'owner' and (tg_op = 'DELETE' or new.role <> 'owner') then
      select count(*) into n from workspace_members where workspace_id = old.workspace_id and role = 'owner' and user_id <> old.user_id;
      if n = 0 then raise exception 'a workspace keeps at least one owner' using errcode = 'check_violation'; end if;
    end if;
  else
    if old.role = 'owner' and (tg_op = 'DELETE' or new.role <> 'owner') then
      select count(*) into n from board_members where board_id = old.board_id and role = 'owner' and user_id <> old.user_id;
      if n = 0 then raise exception 'a board keeps at least one owner' using errcode = 'check_violation'; end if;
    end if;
  end if;
  return coalesce(new, old);
end $$;
create trigger workspace_members_last_owner before update or delete on workspace_members for each row execute function app.guard_last_owner();
create trigger board_members_last_owner before update or delete on board_members for each row execute function app.guard_last_owner();

-- Board settings only an owner may change, even where the row is otherwise editable.
create or replace function app.boards_guard() returns trigger
language plpgsql as $$
begin
  if (new.permission_set, new.kind, new.workspace_id, new.deleted_at, new.archived_at)
     is distinct from (old.permission_set, old.kind, old.workspace_id, old.deleted_at, old.archived_at)
     and app.board_role(old.id) <> 'owner' then
    raise exception 'only a board owner can change permissions, type, archive or delete' using errcode = 'insufficient_privilege';
  end if;
  return new;
end $$;
create trigger boards_guard before update on boards for each row execute function app.boards_guard();

-- Items: subitems nest one level, stay on the parent's board, and carry no group of their own.
create or replace function app.items_guard() returns trigger
language plpgsql as $$
declare p items%rowtype;
begin
  if new.parent_item_id is not null then
    select * into p from items where id = new.parent_item_id;
    if p.parent_item_id is not null then raise exception 'subitems cannot have subitems' using errcode = 'check_violation'; end if;
    if p.board_id <> new.board_id then raise exception 'subitem must be on its parent''s board' using errcode = 'check_violation'; end if;
  elsif not exists (select 1 from groups g where g.id = new.group_id and g.board_id = new.board_id) then
    raise exception 'group belongs to another board' using errcode = 'check_violation';
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger items_guard before insert or update on items for each row execute function app.items_guard();

-- Updates: one level of replies, board_id from the item, plain text from the TipTap document.
create or replace function app.updates_guard() returns trigger
language plpgsql as $$
declare p updates%rowtype;
begin
  select board_id into new.board_id from items where id = new.item_id;
  if new.parent_update_id is not null then
    select * into p from updates where id = new.parent_update_id;
    if p.parent_update_id is not null then raise exception 'replies cannot be nested' using errcode = 'check_violation'; end if;
    if p.item_id <> new.item_id then raise exception 'reply must stay on the same item' using errcode = 'check_violation'; end if;
  end if;
  select coalesce(btrim(regexp_replace(string_agg(t #>> '{}', ' '), '\s+', ' ', 'g')), '') into new.body_text
  from jsonb_path_query(new.body, 'strict $.** ? (@.type == "text").text') t;
  if tg_op = 'UPDATE' and new.body is distinct from old.body then new.edited_at := now(); end if;
  return new;
end $$;
create trigger updates_guard before insert or update on updates for each row execute function app.updates_guard();

-- Assets: board and workspace from the item; the storage path is fixed by the id.
create or replace function app.assets_guard() returns trigger
language plpgsql as $$
begin
  select i.board_id, b.workspace_id into new.board_id, new.workspace_id
  from items i join boards b on b.id = i.board_id where i.id = new.item_id;
  new.storage_path := new.workspace_id || '/' || new.board_id || '/' || new.id;
  return new;
end $$;
create trigger assets_guard before insert on assets for each row execute function app.assets_guard();

create trigger profiles_updated before update on profiles for each row execute function app.set_updated_at();
create trigger workspaces_updated before update on workspaces for each row execute function app.set_updated_at();
create trigger folders_updated before update on folders for each row execute function app.set_updated_at();
create trigger boards_updated before update on boards for each row execute function app.set_updated_at();
create trigger groups_updated before update on groups for each row execute function app.set_updated_at();
create trigger columns_updated before update on columns for each row execute function app.set_updated_at();
create trigger views_updated before update on views for each row execute function app.set_updated_at();
create trigger automations_updated before update on automations for each row execute function app.set_updated_at();
create trigger dashboards_updated before update on dashboards for each row execute function app.set_updated_at();
create trigger widgets_updated before update on widgets for each row execute function app.set_updated_at();

-- ===========================================================================
-- Column values: one validator for all 14 stored types. The client mirrors it
-- with zod for instant feedback; this function is the source of truth.
-- ===========================================================================
create or replace function app.validate_column_value() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  c columns%rowtype;
  it items%rowtype;
  v jsonb := new.value;
  ws uuid;
  n integer;
  d date; d2 date; tm time;
begin
  select * into c from columns where id = new.column_id and deleted_at is null;
  if not found then raise exception 'column not found' using errcode = 'foreign_key_violation'; end if;
  select * into it from items where id = new.item_id;
  if it.board_id <> c.board_id then raise exception 'column belongs to another board' using errcode = 'check_violation'; end if;
  if (it.parent_item_id is not null) <> (c.scope = 'subitem') then
    raise exception 'column scope does not match the item' using errcode = 'check_violation';
  end if;
  if jsonb_typeof(v) <> 'object' then raise exception 'value must be an object' using errcode = 'check_violation'; end if;
  select workspace_id into ws from boards where id = c.board_id;

  new.board_id := c.board_id;
  new.updated_at := now();
  new.updated_by := coalesce(app.actor(), new.updated_by);

  case c.type
    when 'status', 'priority' then
      select l ->> 'label' into new.text from jsonb_array_elements(c.settings -> 'labels') l where l ->> 'id' = v ->> 'label_id';
      if new.text is null then raise exception 'unknown label' using errcode = 'check_violation'; end if;
      new.value := jsonb_build_object('label_id', v ->> 'label_id');

    when 'people' then
      if jsonb_typeof(v -> 'ids') <> 'array' then raise exception 'people needs ids[]' using errcode = 'check_violation'; end if;
      select count(*) into n from jsonb_array_elements_text(v -> 'ids') e
      where not exists (select 1 from workspace_members wm where wm.workspace_id = ws and wm.user_id = e::uuid);
      if n > 0 then raise exception 'people must be workspace members' using errcode = 'check_violation'; end if;
      if (c.settings ->> 'max') is not null and jsonb_array_length(v -> 'ids') > (c.settings ->> 'max')::int then
        raise exception 'too many people for this column' using errcode = 'check_violation';
      end if;
      new.value := jsonb_build_object('ids', (select coalesce(jsonb_agg(distinct e), '[]'::jsonb) from jsonb_array_elements_text(v -> 'ids') e));
      select coalesce(string_agg(p.name, ', ' order by p.name), '') into new.text
      from profiles p where p.id::text in (select jsonb_array_elements_text(new.value -> 'ids'));

    when 'date' then
      d := (v ->> 'date')::date;
      if v ->> 'time' is not null then tm := (v ->> 'time')::time; end if;
      new.value := jsonb_strip_nulls(jsonb_build_object('date', d::text, 'time', to_char(tm, 'HH24:MI')));
      new.text := d::text || coalesce(' ' || to_char(tm, 'HH24:MI'), '');

    when 'timeline' then
      d := (v ->> 'from')::date; d2 := (v ->> 'to')::date;
      if d2 < d then raise exception 'timeline ends before it starts' using errcode = 'check_violation'; end if;
      new.value := jsonb_build_object('from', d::text, 'to', d2::text);
      new.text := d::text || ' - ' || d2::text;

    when 'numbers' then
      if jsonb_typeof(v -> 'number') <> 'number' then raise exception 'numbers needs a number' using errcode = 'check_violation'; end if;
      new.value := jsonb_build_object('number', v -> 'number');
      new.text := v ->> 'number';

    when 'text', 'long_text' then
      if jsonb_typeof(v -> 'text') <> 'string' then raise exception 'text needs a string' using errcode = 'check_violation'; end if;
      if length(v ->> 'text') > (case c.type when 'text' then 4000 else 100000 end) then
        raise exception 'text too long' using errcode = 'check_violation';
      end if;
      new.value := jsonb_build_object('text', v ->> 'text');
      new.text := left(v ->> 'text', 4000);

    when 'dropdown' then
      if jsonb_typeof(v -> 'ids') <> 'array' then raise exception 'dropdown needs ids[]' using errcode = 'check_violation'; end if;
      select count(*) into n from jsonb_array_elements_text(v -> 'ids') e
      where not exists (select 1 from jsonb_array_elements(c.settings -> 'options') o where o ->> 'id' = e);
      if n > 0 then raise exception 'unknown dropdown option' using errcode = 'check_violation'; end if;
      if (c.settings ->> 'limit') is not null and jsonb_array_length(v -> 'ids') > (c.settings ->> 'limit')::int then
        raise exception 'too many options selected' using errcode = 'check_violation';
      end if;
      new.value := jsonb_build_object('ids', (select coalesce(jsonb_agg(distinct e), '[]'::jsonb) from jsonb_array_elements_text(v -> 'ids') e));
      select coalesce(string_agg(o ->> 'label', ', '), '') into new.text
      from jsonb_array_elements(c.settings -> 'options') o where new.value -> 'ids' ? (o ->> 'id');

    when 'tags' then
      if jsonb_typeof(v -> 'ids') <> 'array' then raise exception 'tags needs ids[]' using errcode = 'check_violation'; end if;
      select count(*) into n from jsonb_array_elements_text(v -> 'ids') e
      where not exists (select 1 from tags t where t.id = e::uuid and t.workspace_id = ws);
      if n > 0 then raise exception 'unknown tag' using errcode = 'check_violation'; end if;
      new.value := jsonb_build_object('ids', (select coalesce(jsonb_agg(distinct e), '[]'::jsonb) from jsonb_array_elements_text(v -> 'ids') e));
      select coalesce(string_agg(t.name, ', ' order by t.name), '') into new.text
      from tags t where t.id::text in (select jsonb_array_elements_text(new.value -> 'ids'));

    when 'checkbox' then
      if jsonb_typeof(v -> 'checked') <> 'boolean' then raise exception 'checkbox needs checked' using errcode = 'check_violation'; end if;
      new.value := jsonb_build_object('checked', v -> 'checked');
      new.text := case when (v ->> 'checked')::boolean then 'checked' else '' end;

    when 'link' then
      if coalesce(v ->> 'url', '') !~* '^https?://' or length(v ->> 'url') > 2048 then
        raise exception 'link needs an http(s) url' using errcode = 'check_violation';
      end if;
      new.value := jsonb_strip_nulls(jsonb_build_object('url', v ->> 'url', 'text', nullif(left(v ->> 'text', 500), '')));
      new.text := coalesce(new.value ->> 'text', new.value ->> 'url');

    when 'files' then
      if jsonb_typeof(v -> 'ids') <> 'array' then raise exception 'files needs ids[]' using errcode = 'check_violation'; end if;
      select count(*) into n from jsonb_array_elements_text(v -> 'ids') e
      where not exists (select 1 from assets a where a.id = e::uuid and a.item_id = new.item_id and a.column_id = c.id and a.deleted_at is null);
      if n > 0 then raise exception 'unknown file for this cell' using errcode = 'check_violation'; end if;
      new.value := jsonb_build_object('ids', v -> 'ids');
      select coalesce(string_agg(a.name, ', '), '') into new.text
      from assets a where a.id::text in (select jsonb_array_elements_text(v -> 'ids'));

    else
      raise exception 'column type % is derived and stores no value', c.type using errcode = 'check_violation';
  end case;

  -- A cleared cell is a deleted row, never a stored empty value.
  if (c.type in ('people', 'dropdown', 'tags', 'files') and jsonb_array_length(new.value -> 'ids') = 0)
     or (c.type in ('text', 'long_text') and new.value ->> 'text' = '') then
    raise exception 'empty value: delete the row instead' using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger column_values_validate before insert or update on column_values
  for each row execute function app.validate_column_value();

-- Column settings: labels and options keep stable ids, and a status label that is
-- still in use cannot vanish (the label editor moves items first, see rpc delete_label).
create or replace function app.validate_column_settings() returns trigger
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if new.type in ('status', 'priority') then
    if jsonb_typeof(new.settings -> 'labels') <> 'array' or jsonb_array_length(new.settings -> 'labels') = 0 then
      raise exception 'status columns need labels[]' using errcode = 'check_violation';
    end if;
    if tg_op = 'UPDATE' then
      select count(*) into n from column_values cv
      where cv.column_id = new.id and not exists (
        select 1 from jsonb_array_elements(new.settings -> 'labels') l where l ->> 'id' = cv.value ->> 'label_id');
      if n > 0 then raise exception '% items still use a removed label', n using errcode = 'check_violation'; end if;
    end if;
  elsif new.type = 'dropdown' and jsonb_typeof(new.settings -> 'options') <> 'array' then
    raise exception 'dropdown columns need options[]' using errcode = 'check_violation';
  elsif new.type = 'progress' and jsonb_typeof(new.settings -> 'source_column_ids') <> 'array' then
    raise exception 'progress columns need source_column_ids[]' using errcode = 'check_violation';
  end if;
  if tg_op = 'UPDATE' and new.type <> old.type then
    raise exception 'changing a column type is not supported in v1' using errcode = 'feature_not_supported';
  end if;
  return new;
end $$;
create trigger columns_validate before insert or update on columns for each row execute function app.validate_column_settings();

-- ===========================================================================
-- Activity log: who changed what, old -> new. Written only by triggers.
-- ===========================================================================
create or replace function app.log_activity() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  k text; b uuid; it uuid; col uuid; ov jsonb; nv jsonb;
  aid uuid := nullif(current_setting('app.automation_id', true), '')::uuid;
begin
  case tg_table_name
    when 'column_values' then
      b := coalesce(new.board_id, old.board_id); it := coalesce(new.item_id, old.item_id); col := coalesce(new.column_id, old.column_id);
      if tg_op = 'DELETE' then k := 'cell_cleared'; ov := old.value;
      else
        if tg_op = 'UPDATE' and new.value = old.value then return null; end if;
        k := 'cell_changed'; nv := new.value; if tg_op = 'UPDATE' then ov := old.value; end if;
      end if;
    when 'items' then
      b := new.board_id; it := new.id;
      if tg_op = 'INSERT' then k := 'item_created'; nv := to_jsonb(new.name);
      elsif new.deleted_at is not null and old.deleted_at is null then k := 'item_deleted';
      elsif new.deleted_at is null and old.deleted_at is not null then k := 'item_restored';
      elsif new.archived_at is not null and old.archived_at is null then k := 'item_archived';
      elsif new.name <> old.name then k := 'item_renamed'; ov := to_jsonb(old.name); nv := to_jsonb(new.name);
      elsif new.group_id is distinct from old.group_id then k := 'item_moved'; ov := to_jsonb(old.group_id); nv := to_jsonb(new.group_id);
      else return null; end if;
    when 'groups' then
      b := new.board_id;
      if tg_op = 'INSERT' then k := 'group_created'; nv := to_jsonb(new.title);
      elsif new.deleted_at is not null and old.deleted_at is null then k := 'group_deleted'; ov := to_jsonb(old.title);
      elsif new.deleted_at is null and old.deleted_at is not null then k := 'group_restored';
      elsif (new.title, new.color) <> (old.title, old.color) then k := 'group_changed'; ov := jsonb_build_object('title', old.title, 'color', old.color); nv := jsonb_build_object('title', new.title, 'color', new.color);
      else return null; end if;
    when 'columns' then
      b := new.board_id; col := new.id;
      if tg_op = 'INSERT' then k := 'column_added'; nv := jsonb_build_object('title', new.title, 'type', new.type);
      elsif new.deleted_at is not null and old.deleted_at is null then k := 'column_deleted'; ov := to_jsonb(old.title);
      elsif (new.title, new.settings) is distinct from (old.title, old.settings) then k := 'column_changed'; ov := jsonb_build_object('title', old.title, 'settings', old.settings); nv := jsonb_build_object('title', new.title, 'settings', new.settings);
      else return null; end if;
    when 'boards' then
      b := new.id;
      if (new.permission_set, new.kind) <> (old.permission_set, old.kind) then k := 'board_permissions_changed'; ov := jsonb_build_object('permission_set', old.permission_set, 'kind', old.kind); nv := jsonb_build_object('permission_set', new.permission_set, 'kind', new.kind);
      elsif new.deleted_at is not null and old.deleted_at is null then k := 'board_deleted';
      elsif new.deleted_at is null and old.deleted_at is not null then k := 'board_restored';
      elsif new.archived_at is not null and old.archived_at is null then k := 'board_archived';
      elsif (new.name, new.description) is distinct from (old.name, old.description) then k := 'board_changed'; ov := to_jsonb(old.name); nv := to_jsonb(new.name);
      else return null; end if;
    when 'board_members' then
      b := coalesce(new.board_id, old.board_id);
      k := case tg_op when 'INSERT' then 'member_added' when 'DELETE' then 'member_removed' else 'member_changed' end;
      if tg_op = 'UPDATE' and new.role = old.role then return null; end if;
      ov := case when old is null then null else jsonb_build_object('user_id', old.user_id, 'role', old.role) end;
      nv := case when new is null then null else jsonb_build_object('user_id', new.user_id, 'role', new.role) end;
    when 'automations' then
      b := new.board_id;
      if tg_op = 'INSERT' then k := 'automation_created'; nv := to_jsonb(new.name);
      elsif new.deleted_at is not null and old.deleted_at is null then k := 'automation_deleted'; ov := to_jsonb(old.name);
      elsif (new.name, new.enabled, new.trigger, new.conditions, new.actions) is distinct from (old.name, old.enabled, old.trigger, old.conditions, old.actions) then
        k := 'automation_changed'; nv := jsonb_build_object('name', new.name, 'enabled', new.enabled);
      else return null; end if;
  end case;
  insert into activities (board_id, item_id, actor_id, automation_id, kind, column_id, old_value, new_value)
  values (b, it, app.actor(), aid, k, col, ov, nv);
  return null;
end $$;
create trigger column_values_activity after insert or update or delete on column_values for each row execute function app.log_activity();
create trigger items_activity after insert or update on items for each row execute function app.log_activity();
create trigger groups_activity after insert or update on groups for each row execute function app.log_activity();
create trigger columns_activity after insert or update on columns for each row execute function app.log_activity();
create trigger boards_activity after update on boards for each row execute function app.log_activity();
create trigger board_members_activity after insert or update or delete on board_members for each row execute function app.log_activity();
create trigger automations_activity after insert or update on automations for each row execute function app.log_activity();

-- ===========================================================================
-- Notifications: mentions, replies, new updates to followers, assignments.
-- ===========================================================================
create or replace function app.notify(p_user uuid, p_kind notification_kind, p_board uuid, p_item uuid, p_update uuid, p_text text, p_automation uuid default null) returns void
language plpgsql security definer set search_path = public as $$
declare ws uuid;
begin
  if p_user is null or p_user = app.actor() then return; end if;
  if app.board_role_for(p_board, p_user) is null then return; end if;
  if exists (select 1 from board_members where board_id = p_board and user_id = p_user and muted) then return; end if;
  select workspace_id into ws from boards where id = p_board;
  insert into notifications (user_id, kind, actor_id, workspace_id, board_id, item_id, update_id, automation_id, text)
  values (p_user, p_kind, app.actor(), ws, p_board, p_item, p_update, p_automation, left(p_text, 500));
end $$;

create or replace function app.notify_on_update() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  item_name text; author text; parent_author uuid; u uuid;
  mentioned uuid[] := '{}';
begin
  select i.name into item_name from items i where i.id = new.item_id;
  select p.name into author from profiles p where p.id = new.author_id;
  -- 1. mentions
  for u in select distinct (m #>> '{}')::uuid from jsonb_path_query(new.body, 'strict $.** ? (@.type == "mention").attrs.id') m loop
    mentioned := mentioned || u;
    perform app.notify(u, 'mention', new.board_id, new.item_id, new.id, coalesce(author, 'Someone') || ' mentioned you in ' || item_name);
  end loop;
  -- 2. reply to the parent's author
  if new.parent_update_id is not null then
    select author_id into parent_author from updates where id = new.parent_update_id;
    if parent_author <> all (mentioned) then
      perform app.notify(parent_author, 'reply', new.board_id, new.item_id, new.id, coalesce(author, 'Someone') || ' replied on ' || item_name);
    end if;
  end if;
  -- 3. followers: board subscribers, the item creator, people assigned on it, earlier authors
  for u in
    select distinct f from (
      select bm.user_id f from board_members bm where bm.board_id = new.board_id and bm.subscribed and not bm.muted
      union select i.created_by from items i where i.id = new.item_id
      union select e::uuid from column_values cv join columns c on c.id = cv.column_id, jsonb_array_elements_text(cv.value -> 'ids') e
            where cv.item_id = new.item_id and c.type = 'people'
      union select up.author_id from updates up where up.item_id = new.item_id and up.id <> new.id
    ) s where f is not null and f <> all (mentioned) and f is distinct from parent_author
  loop
    perform app.notify(u, 'update', new.board_id, new.item_id, new.id, coalesce(author, 'Someone') || ' posted on ' || item_name);
  end loop;
  return null;
end $$;
create trigger updates_notify after insert on updates for each row execute function app.notify_on_update();

create or replace function app.notify_on_assign() returns trigger
language plpgsql security definer set search_path = public as $$
declare u uuid; item_name text; actor_name text;
begin
  if not exists (select 1 from columns where id = new.column_id and type = 'people') then return null; end if;
  select name into item_name from items where id = new.item_id;
  select name into actor_name from profiles where id = app.actor();
  for u in
    select e::uuid from jsonb_array_elements_text(new.value -> 'ids') e
    where tg_op = 'INSERT' or not (old.value -> 'ids' ? e)
  loop
    perform app.notify(u, 'assigned', new.board_id, new.item_id, null, coalesce(actor_name, 'Someone') || ' assigned you to ' || item_name);
  end loop;
  return null;
end $$;
create trigger column_values_notify_assign after insert or update on column_values for each row execute function app.notify_on_assign();

-- ===========================================================================
-- Realtime: one private topic per board, one per user. Broadcast from the database.
-- ===========================================================================
create or replace function app.broadcast_row() returns trigger
language plpgsql security definer set search_path = public as $$
declare rec jsonb := to_jsonb(coalesce(new, old)); b uuid;
begin
  if tg_table_name = 'reactions' then
    select board_id into b from updates where id = (rec ->> 'update_id')::uuid;
  elsif tg_table_name = 'boards' then
    b := (rec ->> 'id')::uuid;
  else
    b := (rec ->> 'board_id')::uuid;
  end if;
  if tg_table_name = 'column_values' then
    -- Slim payload: a long text cell could exceed the 256 KB message cap.
    perform realtime.send(
      jsonb_build_object('op', tg_op, 'item_id', rec ->> 'item_id', 'column_id', rec ->> 'column_id',
                         'updated_by', rec ->> 'updated_by', 'updated_at', rec ->> 'updated_at',
                         'value', case when tg_op <> 'DELETE' and pg_column_size(new.value) < 16384 then new.value end,
                         'text', case when tg_op <> 'DELETE' and pg_column_size(new.value) < 16384 then new.text end),
      'cell', 'board:' || b, true);
  else
    perform realtime.broadcast_changes('board:' || b, tg_table_name, tg_op, tg_table_name, tg_table_schema, new, old);
  end if;
  return null;
end $$;
create trigger items_broadcast after insert or update or delete on items for each row execute function app.broadcast_row();
create trigger column_values_broadcast after insert or update or delete on column_values for each row execute function app.broadcast_row();
create trigger groups_broadcast after insert or update or delete on groups for each row execute function app.broadcast_row();
create trigger columns_broadcast after insert or update or delete on columns for each row execute function app.broadcast_row();
create trigger views_broadcast after insert or update or delete on views for each row execute function app.broadcast_row();
create trigger updates_broadcast after insert or update or delete on updates for each row execute function app.broadcast_row();
create trigger reactions_broadcast after insert or delete on reactions for each row execute function app.broadcast_row();
create trigger boards_broadcast after update on boards for each row execute function app.broadcast_row();
create trigger automations_broadcast after insert or update on automations for each row execute function app.broadcast_row();

create or replace function app.broadcast_notification() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform realtime.send(jsonb_build_object('id', new.id, 'kind', new.kind, 'text', new.text, 'board_id', new.board_id, 'item_id', new.item_id),
                        'notification', 'user:' || new.user_id, true);
  return null;
end $$;
create trigger notifications_broadcast after insert on notifications for each row execute function app.broadcast_notification();

-- ===========================================================================
-- Automation engine. Runs inside the writing transaction (event triggers) or
-- from pg_cron (date triggers). A failing automation never fails the user's
-- edit: each run is a subtransaction and failures land in automation_runs.
-- Loop guard: app.automation_depth, max 5 automations deep per originating change.
-- ===========================================================================
create or replace function app.column_type_on(p_board uuid, p_column uuid) returns column_type
language sql stable security definer set search_path = public as $$
  select type from columns where id = p_column and board_id = p_board and deleted_at is null
$$;

create or replace function app.validate_automation() returns trigger
language plpgsql security definer set search_path = public as $$
declare t text := new.trigger ->> 'type'; cid uuid; x jsonb; ty column_type;
begin
  if t not in ('item_created', 'status_changed', 'person_assigned', 'date_arrived') then
    raise exception 'unknown trigger %', t using errcode = 'check_violation';
  end if;
  if t <> 'item_created' then
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
create trigger automations_validate before insert or update on automations for each row execute function app.validate_automation();

-- Deleting a column or group switches off every automation that refers to it.
create or replace function app.disable_orphan_automations() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.deleted_at is not null and old.deleted_at is null then
    update automations set enabled = false
    where board_id = new.board_id and enabled
      and (trigger::text || conditions::text || actions::text) like '%' || new.id || '%';
  end if;
  return null;
end $$;
create trigger columns_orphan_automations after update on columns for each row execute function app.disable_orphan_automations();
create trigger groups_orphan_automations after update on groups for each row execute function app.disable_orphan_automations();

create or replace function app.automation_conditions_met(a automations, p_item uuid) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare x jsonb; ok boolean; v jsonb;
begin
  for x in select * from jsonb_array_elements(a.conditions) loop
    select value into v from column_values where item_id = p_item and column_id = (x ->> 'column_id')::uuid;
    ok := case x ->> 'type'
      when 'status_is' then v ->> 'label_id' = x ->> 'label_id'
      when 'status_is_not' then v ->> 'label_id' is distinct from x ->> 'label_id'
      when 'person_is' then coalesce(v -> 'ids' ? (x ->> 'user_id'), false)
      when 'checkbox_is' then coalesce((v ->> 'checked')::boolean, false) = (x ->> 'checked')::boolean
      when 'group_is' then exists (select 1 from items where id = p_item and group_id = (x ->> 'group_id')::uuid)
    end;
    if not coalesce(ok, false) then return false; end if;
  end loop;
  return true;
end $$;

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
      msg := replace(replace(coalesce(act ->> 'message', '{item}'), '{item}', it.name), '{board}', bname);
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
      values (a.board_id, gid, replace(coalesce(act ->> 'name', 'New item'), '{item}', it.name),
              (select coalesce(max(position), 0) + 1 from items where group_id = gid and deleted_at is null), app.actor());
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

create or replace function app.run_one_automation(a automations, p_item uuid, p_fire_date date default null) returns void
language plpgsql security definer set search_path = public as $$
declare depth integer := coalesce(nullif(current_setting('app.automation_depth', true), '')::int, 0); act jsonb;
begin
  if depth >= 5 then
    insert into automation_runs (automation_id, board_id, item_id, status, error, depth, fire_date, finished_at)
    values (a.id, a.board_id, p_item, 'skipped', 'loop guard: five automations deep', depth, p_fire_date, now());
    return;
  end if;
  if not app.automation_conditions_met(a, p_item) then return; end if;
  begin
    perform set_config('app.automation_depth', (depth + 1)::text, true);
    perform set_config('app.automation_id', a.id::text, true);
    for act in select * from jsonb_array_elements(a.actions) loop
      perform app.run_action(a, act, p_item);
    end loop;
    insert into automation_runs (automation_id, board_id, item_id, status, depth, fire_date, finished_at)
    values (a.id, a.board_id, p_item, 'ok', depth, p_fire_date, now());
    update automations set run_count = run_count + 1, last_run_at = now() where id = a.id;
  exception when others then
    insert into automation_runs (automation_id, board_id, item_id, status, error, depth, fire_date, finished_at)
    values (a.id, a.board_id, p_item, 'failed', sqlerrm, depth, p_fire_date, now());
  end;
  perform set_config('app.automation_depth', depth::text, true);
  perform set_config('app.automation_id', '', true);
end $$;

create or replace function app.run_automations(p_board uuid, p_item uuid, p_event text, p_column uuid, p_payload jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare a automations%rowtype;
begin
  for a in select * from automations where board_id = p_board and enabled and deleted_at is null and trigger ->> 'type' = p_event order by created_at loop
    if p_event in ('status_changed', 'person_assigned') and (a.trigger ->> 'column_id')::uuid is distinct from p_column then continue; end if;
    if p_event = 'status_changed' and a.trigger ->> 'label_id' is not null and a.trigger ->> 'label_id' <> p_payload ->> 'label_id' then continue; end if;
    if p_event = 'person_assigned' and a.trigger ->> 'user_id' is not null and not (p_payload -> 'added' ? (a.trigger ->> 'user_id')) then continue; end if;
    perform app.run_one_automation(a, p_item);
  end loop;
end $$;

create or replace function app.automations_on_item() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.parent_item_id is null then perform app.run_automations(new.board_id, new.id, 'item_created', null, '{}'); end if;
  return null;
end $$;
create trigger items_automations after insert on items for each row execute function app.automations_on_item();

create or replace function app.automations_on_cell() returns trigger
language plpgsql security definer set search_path = public as $$
declare ty column_type; added jsonb;
begin
  select type into ty from columns where id = new.column_id;
  if ty in ('status', 'priority') and (tg_op = 'INSERT' or new.value ->> 'label_id' is distinct from old.value ->> 'label_id') then
    perform app.run_automations(new.board_id, new.item_id, 'status_changed', new.column_id, new.value);
  elsif ty = 'people' then
    select coalesce(jsonb_agg(e), '[]'::jsonb) into added from jsonb_array_elements_text(new.value -> 'ids') e
    where tg_op = 'INSERT' or not (old.value -> 'ids' ? e);
    if jsonb_array_length(added) > 0 then
      perform app.run_automations(new.board_id, new.item_id, 'person_assigned', new.column_id, jsonb_build_object('added', added));
    end if;
  end if;
  return null;
end $$;
create trigger column_values_automations after insert or update on column_values for each row execute function app.automations_on_cell();

-- pg_cron, every minute. One fire per automation, item and local date.
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
  return n;
end $$;

-- ===========================================================================
-- Access rules: row level security on every table. Helpers are wrapped in
-- (select ...) so Postgres evaluates them once per statement, not per row.
-- ===========================================================================
alter table profiles enable row level security;
alter table workspaces enable row level security;
alter table workspace_members enable row level security;
alter table invites enable row level security;
alter table folders enable row level security;
alter table boards enable row level security;
alter table board_members enable row level security;
alter table groups enable row level security;
alter table columns enable row level security;
alter table items enable row level security;
alter table column_values enable row level security;
alter table views enable row level security;
alter table updates enable row level security;
alter table reactions enable row level security;
alter table assets enable row level security;
alter table activities enable row level security;
alter table automations enable row level security;
alter table automation_runs enable row level security;
alter table notifications enable row level security;
alter table dashboards enable row level security;
alter table dashboard_boards enable row level security;
alter table widgets enable row level security;
alter table favorites enable row level security;
alter table tags enable row level security;

-- profiles: me, and anyone who shares a workspace with me
create policy profiles_select on profiles for select to authenticated using (
  id = (select auth.uid()) or exists (
    select 1 from workspace_members a join workspace_members b on a.workspace_id = b.workspace_id
    where a.user_id = (select auth.uid()) and b.user_id = profiles.id));
create policy profiles_update on profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- workspaces: members read; anyone signed in creates (trigger makes them owner); owners and admins change
create policy workspaces_select on workspaces for select to authenticated using ((select app.workspace_access(id, created_by)));
create policy workspaces_insert on workspaces for insert to authenticated with check (created_by = (select auth.uid()));
create policy workspaces_update on workspaces for update to authenticated using ((select app.workspace_role(id)) in ('owner', 'admin'));

create policy workspace_members_select on workspace_members for select to authenticated using ((select app.workspace_role(workspace_id)) is not null);
create policy workspace_members_insert on workspace_members for insert to authenticated with check ((select app.workspace_role(workspace_id)) in ('owner', 'admin'));
create policy workspace_members_update on workspace_members for update to authenticated using ((select app.workspace_role(workspace_id)) in ('owner', 'admin'));
create policy workspace_members_delete on workspace_members for delete to authenticated using (
  user_id = (select auth.uid()) or (select app.workspace_role(workspace_id)) in ('owner', 'admin'));

create policy invites_all on invites for all to authenticated
  using ((select app.workspace_role(workspace_id)) in ('owner', 'admin'))
  with check ((select app.workspace_role(workspace_id)) in ('owner', 'admin'));

create policy folders_select on folders for select to authenticated using ((select app.workspace_role(workspace_id)) is not null);
create policy folders_write on folders for all to authenticated
  using ((select app.workspace_role(workspace_id)) in ('owner', 'admin', 'member'))
  with check ((select app.workspace_role(workspace_id)) in ('owner', 'admin', 'member'));

-- boards: readers see them (deleted ones too, for the trash); members create; structure editors update;
-- owner-only fields are guarded by the boards_guard trigger. Hard delete only by the purge job.
create policy boards_select on boards for select to authenticated using ((select app.board_role_from(id, workspace_id, kind, created_by, (select auth.uid()))) is not null);
create policy boards_insert on boards for insert to authenticated with check (
  created_by = (select auth.uid()) and (select app.workspace_role(workspace_id)) in ('owner', 'admin', 'member'));
create policy boards_update on boards for update to authenticated using ((select app.can_edit_structure(id)));

create policy board_members_select on board_members for select to authenticated using ((select app.can_read_board(board_id)));
create policy board_members_write on board_members for all to authenticated
  using ((select app.board_role(board_id)) = 'owner') with check ((select app.board_role(board_id)) = 'owner');

create policy groups_select on groups for select to authenticated using ((select app.can_read_board(board_id)));
create policy groups_write on groups for all to authenticated
  using ((select app.can_edit_structure(board_id))) with check ((select app.can_edit_structure(board_id)));

create policy columns_select on columns for select to authenticated using ((select app.can_read_board(board_id)));
create policy columns_write on columns for all to authenticated
  using ((select app.can_edit_structure(board_id))) with check ((select app.can_edit_structure(board_id)));

create policy views_select on views for select to authenticated using ((select app.can_read_board(board_id)));
create policy views_write on views for all to authenticated
  using ((select app.can_edit_structure(board_id))) with check ((select app.can_edit_structure(board_id)));

-- items: content editors create; "edit assigned" members touch only their own items
create policy items_select on items for select to authenticated using ((select app.can_read_board(board_id)));
create policy items_insert on items for insert to authenticated with check (
  (select app.can_edit_items(board_id)) or (parent_item_id is not null and (select app.can_edit_item(parent_item_id))));
create policy items_update on items for update to authenticated using ((select app.can_edit_item(id)));

create policy column_values_select on column_values for select to authenticated using ((select app.can_read_board(board_id)));
create policy column_values_write on column_values for all to authenticated
  using ((select app.can_edit_item(item_id))) with check ((select app.can_edit_item(item_id)));

-- updates: every member may post; authors edit their own; owners may remove anything
create policy updates_select on updates for select to authenticated using ((select app.can_read_board(board_id)));
create policy updates_insert on updates for insert to authenticated with check (
  author_id = (select auth.uid()) and (select app.can_comment((select board_id from items where id = item_id))));
create policy updates_update on updates for update to authenticated using (
  author_id = (select auth.uid()) or (select app.board_role(board_id)) = 'owner');

create policy reactions_select on reactions for select to authenticated using (
  (select app.can_read_board((select board_id from updates where id = update_id))));
create policy reactions_insert on reactions for insert to authenticated with check (
  user_id = (select auth.uid()) and (select app.can_comment((select board_id from updates where id = update_id))));
create policy reactions_delete on reactions for delete to authenticated using (user_id = (select auth.uid()));

create policy assets_select on assets for select to authenticated using ((select app.can_read_board(board_id)));
create policy assets_insert on assets for insert to authenticated with check (
  uploaded_by = (select auth.uid()) and (
    (column_id is not null and (select app.can_edit_item(item_id))) or
    (update_id is not null and (select app.can_comment((select board_id from items where id = item_id))))));
create policy assets_update on assets for update to authenticated using (
  uploaded_by = (select auth.uid()) or (select app.board_role(board_id)) = 'owner');

create policy activities_select on activities for select to authenticated using ((select app.can_read_board(board_id)));

create policy automations_select on automations for select to authenticated using ((select app.can_read_board(board_id)));
create policy automations_write on automations for all to authenticated
  using ((select app.can_edit_structure(board_id))) with check ((select app.can_edit_structure(board_id)));
create policy automation_runs_select on automation_runs for select to authenticated using ((select app.can_read_board(board_id)));

create policy notifications_select on notifications for select to authenticated using (user_id = (select auth.uid()));
create policy notifications_update on notifications for update to authenticated using (user_id = (select auth.uid()));
create policy notifications_delete on notifications for delete to authenticated using (user_id = (select auth.uid()));

create policy dashboards_select on dashboards for select to authenticated using ((select app.dashboard_access(workspace_id, kind, created_by)));
create policy dashboards_insert on dashboards for insert to authenticated with check (
  created_by = (select auth.uid()) and (select app.workspace_role(workspace_id)) in ('owner', 'admin', 'member'));
create policy dashboards_update on dashboards for update to authenticated using ((select app.can_edit_dashboard(id)));

create policy dashboard_boards_select on dashboard_boards for select to authenticated using ((select app.can_read_dashboard(dashboard_id)));
create policy dashboard_boards_write on dashboard_boards for all to authenticated
  using ((select app.can_edit_dashboard(dashboard_id)))
  with check ((select app.can_edit_dashboard(dashboard_id)) and (select app.can_read_board(board_id)));

create policy widgets_select on widgets for select to authenticated using ((select app.can_read_dashboard(dashboard_id)));
create policy widgets_write on widgets for all to authenticated
  using ((select app.can_edit_dashboard(dashboard_id))) with check ((select app.can_edit_dashboard(dashboard_id)));

create policy favorites_all on favorites for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy tags_select on tags for select to authenticated using ((select app.workspace_role(workspace_id)) is not null);
create policy tags_insert on tags for insert to authenticated with check ((select app.workspace_role(workspace_id)) in ('owner', 'admin', 'member'));
create policy tags_update on tags for update to authenticated using (
  created_by = (select auth.uid()) or (select app.workspace_role(workspace_id)) in ('owner', 'admin'));
create policy tags_delete on tags for delete to authenticated using ((select app.workspace_role(workspace_id)) in ('owner', 'admin'));

-- Realtime: board topics for readers, the user topic for its owner. Presence is the only client send.
create or replace function app.topic_board() returns uuid
language sql stable as $$
  select case when realtime.topic() ~ '^board:[0-9a-f-]{36}$' then substr(realtime.topic(), 7)::uuid end
$$;
create policy realtime_receive on realtime.messages for select to authenticated using (
  (select app.can_read_board(app.topic_board())) or realtime.topic() = 'user:' || (select auth.uid()));
create policy realtime_presence on realtime.messages for insert to authenticated with check (
  extension = 'presence' and (select app.can_read_board(app.topic_board())));

-- Storage: one private bucket; the asset row is inserted first, then the file is uploaded to its path.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('assets', 'assets', false, 26214400, null) on conflict (id) do nothing;
create policy assets_read on storage.objects for select to authenticated using (
  bucket_id = 'assets' and exists (select 1 from assets a where a.storage_path = name and app.can_read_board(a.board_id)));
create policy assets_upload on storage.objects for insert to authenticated with check (
  bucket_id = 'assets' and exists (select 1 from assets a where a.storage_path = name and a.uploaded_by = (select auth.uid())));
create policy assets_remove on storage.objects for delete to authenticated using (
  bucket_id = 'assets' and exists (select 1 from assets a where a.storage_path = name
    and (a.uploaded_by = (select auth.uid()) or app.board_role(a.board_id) = 'owner')));

-- ===========================================================================
-- RPCs (public schema, called with supabase.rpc). "security invoker" means
-- RLS still applies inside; only invites and cron work run as definer.
-- ===========================================================================

-- F01 / F11: join a workspace from an invite link. The signed-in email must match.
create or replace function public.accept_invite(p_token text) returns uuid
language plpgsql security definer set search_path = public as $$
declare inv invites%rowtype; my_email text;
begin
  select email into my_email from profiles where id = auth.uid();
  if my_email is null then raise exception 'sign in first' using errcode = 'insufficient_privilege'; end if;
  select * into inv from invites where token = p_token for update;
  if not found or inv.accepted_at is not null or inv.expires_at < now() then
    raise exception 'this invite is invalid or has expired' using errcode = 'invalid_parameter_value';
  end if;
  if lower(inv.email) <> lower(my_email) then
    raise exception 'this invite was sent to a different email address' using errcode = 'insufficient_privilege';
  end if;
  insert into workspace_members (workspace_id, user_id, role) values (inv.workspace_id, auth.uid(), inv.role) on conflict do nothing;
  update invites set accepted_at = now(), accepted_by = auth.uid() where id = inv.id;
  return inv.workspace_id;
end $$;

-- F02 / S24: a board, blank or from a template definition, in one transaction.
-- definition: {description, kind, columns:[{key,title,type,scope,settings}], groups:[{title,color,items:[{name,values:{key:value},subitems:[...]}]}],
--              views:[{type,name,settings}]}  view settings may use "{col:key}" placeholders for column ids.
create or replace function public.create_board(p_workspace uuid, p_folder uuid, p_name text, p_definition jsonb default '{}') returns uuid
language plpgsql security invoker set search_path = public as $$
declare
  bid uuid; gid uuid; iid uuid; sid uuid; cid uuid;
  colmap jsonb := '{}'; c jsonb; g jsonb; it jsonb; sub jsonb; v jsonb; vw jsonb; k text; s text; pos integer;
begin
  insert into boards (workspace_id, folder_id, name, description, kind, created_by)
  values (p_workspace, p_folder, p_name, p_definition ->> 'description', coalesce((p_definition ->> 'kind')::board_kind, 'main'), auth.uid())
  returning id into bid;

  pos := 0;
  for c in select * from jsonb_array_elements(coalesce(p_definition -> 'columns', '[]'::jsonb)) loop
    pos := pos + 1;
    insert into columns (board_id, scope, title, type, settings, position)
    values (bid, coalesce((c ->> 'scope')::column_scope, 'item'), c ->> 'title', (c ->> 'type')::column_type, coalesce(c -> 'settings', '{}'::jsonb), pos)
    returning id into cid;
    colmap := colmap || jsonb_build_object(coalesce(c ->> 'key', cid::text), cid);
  end loop;
  if colmap = '{}'::jsonb then
    insert into columns (board_id, title, type, settings, position) values
      (bid, 'Status', 'status', '{"labels":[{"id":"todo","label":"Not started","color":"gray"},{"id":"working","label":"Working on it","color":"orange"},{"id":"stuck","label":"Stuck","color":"red"},{"id":"done","label":"Done","color":"green","is_done":true}]}', 1),
      (bid, 'Owner', 'people', '{}', 2),
      (bid, 'Due', 'date', '{}', 3);
  end if;

  pos := 0;
  for g in select * from jsonb_array_elements(coalesce(nullif(p_definition -> 'groups', '[]'::jsonb), '[{"title":"Group 1","color":"blue"}]'::jsonb)) loop
    pos := pos + 1;
    insert into groups (board_id, title, color, position) values (bid, g ->> 'title', coalesce(g ->> 'color', 'blue'), pos) returning id into gid;
    for it in select * from jsonb_array_elements(coalesce(g -> 'items', '[]'::jsonb)) loop
      insert into items (board_id, group_id, name, position, created_by)
      values (bid, gid, it ->> 'name', (select coalesce(max(position), 0) + 1 from items where group_id = gid), auth.uid()) returning id into iid;
      for k, v in select * from jsonb_each(coalesce(it -> 'values', '{}'::jsonb)) loop
        insert into column_values (item_id, column_id, value) values (iid, (colmap ->> k)::uuid, v);
      end loop;
      for sub in select * from jsonb_array_elements(coalesce(it -> 'subitems', '[]'::jsonb)) loop
        insert into items (board_id, parent_item_id, name, position, created_by)
        values (bid, iid, sub ->> 'name', (select coalesce(max(position), 0) + 1 from items where parent_item_id = iid), auth.uid()) returning id into sid;
        for k, v in select * from jsonb_each(coalesce(sub -> 'values', '{}'::jsonb)) loop
          insert into column_values (item_id, column_id, value) values (sid, (colmap ->> k)::uuid, v);
        end loop;
      end loop;
    end loop;
  end loop;

  insert into views (board_id, type, name, position, is_default, created_by) values (bid, 'table', 'Main table', 0, true, auth.uid());
  pos := 0;
  for vw in select * from jsonb_array_elements(coalesce(p_definition -> 'views', '[]'::jsonb)) loop
    pos := pos + 1;
    s := coalesce(vw -> 'settings', '{}'::jsonb)::text;
    for k in select jsonb_object_keys(colmap) loop s := replace(s, '{col:' || k || '}', colmap ->> k); end loop;
    insert into views (board_id, type, name, position, settings, created_by)
    values (bid, (vw ->> 'type')::view_type, vw ->> 'name', pos, s::jsonb, auth.uid());
  end loop;
  return bid;
end $$;

-- F07: exactly one default view per board, switched atomically.
create or replace function public.set_default_view(p_view uuid) returns void
language plpgsql security invoker set search_path = public as $$
declare bid uuid;
begin
  select board_id into bid from views where id = p_view and deleted_at is null;
  if bid is null or not app.can_edit_structure(bid) then raise exception 'not allowed' using errcode = 'insufficient_privilege'; end if;
  update views set is_default = false where board_id = bid and is_default;
  update views set is_default = true where id = p_view;
end $$;

-- S05: remove a status label; items using it move to another label or lose the value.
create or replace function public.delete_label(p_column uuid, p_label_id text, p_move_to text default null) returns integer
language plpgsql security invoker set search_path = public as $$
declare n integer;
begin
  if not app.can_edit_structure((select board_id from columns where id = p_column)) then
    raise exception 'not allowed' using errcode = 'insufficient_privilege';
  end if;
  if p_move_to is null then
    delete from column_values where column_id = p_column and value ->> 'label_id' = p_label_id;
  else
    update column_values set value = jsonb_build_object('label_id', p_move_to) where column_id = p_column and value ->> 'label_id' = p_label_id;
  end if;
  get diagnostics n = row_count;
  update columns set settings = jsonb_set(settings, '{labels}',
    (select coalesce(jsonb_agg(l), '[]'::jsonb) from jsonb_array_elements(settings -> 'labels') l where l ->> 'id' <> p_label_id))
  where id = p_column;
  return n;
end $$;

-- F04: drag and drop. The server owns positions: numeric midpoints, renumbered when the gap closes.
-- p_table: items | subitems | groups | columns | views | folders. p_container: group, parent item, board or parent folder.
create or replace function public.move_rows(p_table text, p_ids uuid[], p_container uuid default null, p_after uuid default null) returns void
language plpgsql security invoker set search_path = public as $$
declare
  tbl text; parent_col text; live text; prev numeric; nxt numeric; step numeric; i integer := 0; id uuid;
begin
  tbl := case p_table when 'subitems' then 'items' else p_table end;
  parent_col := case p_table
    when 'items' then 'group_id' when 'subitems' then 'parent_item_id' when 'folders' then 'parent_folder_id'
    when 'groups' then 'board_id' when 'columns' then 'board_id' when 'views' then 'board_id' end;
  if parent_col is null then raise exception 'cannot move %', p_table using errcode = 'invalid_parameter_value'; end if;
  live := case when p_table = 'folders' then 'true' else 'deleted_at is null' end;
  perform pg_advisory_xact_lock(hashtext(tbl || ':' || coalesce(p_container::text, 'root')));

  if p_after is null then
    execute format('select coalesce(min(position), 1) - 1 from %I where %I is not distinct from $1 and %s and id <> all($2)', tbl, parent_col, live) into prev using p_container, p_ids;
  else
    execute format('select position from %I where id = $1', tbl) into prev using p_after;
  end if;
  execute format('select min(position) from %I where %I is not distinct from $1 and position > $2 and %s and id <> all($3)', tbl, parent_col, live) into nxt using p_container, prev, p_ids;

  if nxt is not null and (nxt - prev) / (array_length(p_ids, 1) + 1) < 0.000001 then
    -- renumber the container 1..n, then place again
    execute format('with o as (select id, row_number() over (order by position, created_at, id) rn from %I where %I is not distinct from $1 and %s) update %I t set position = o.rn from o where o.id = t.id', tbl, parent_col, live, tbl) using p_container;
    if p_after is null then prev := 0; else execute format('select position from %I where id = $1', tbl) into prev using p_after; end if;
    execute format('select min(position) from %I where %I is not distinct from $1 and position > $2 and %s and id <> all($3)', tbl, parent_col, live) into nxt using p_container, prev, p_ids;
  end if;
  step := case when nxt is null then 1 else (nxt - prev) / (array_length(p_ids, 1) + 1) end;

  foreach id in array p_ids loop
    i := i + 1;
    execute format('update %I set position = $1, %I = $2 where id = $3', tbl, parent_col) using prev + step * i, p_container, id;
  end loop;
end $$;

-- F13: bring back a board, group or item from the trash (an item's deleted group comes back with it).
create or replace function public.restore(p_kind text, p_id uuid) returns integer
language plpgsql security invoker set search_path = public as $$
declare n integer;
begin
  case p_kind
    when 'board' then update boards set deleted_at = null, archived_at = null where id = p_id;
    when 'group' then update groups set deleted_at = null, archived_at = null where id = p_id;
    when 'item' then
      update groups set deleted_at = null where id = (select group_id from items where id = p_id) and deleted_at is not null;
      update items set deleted_at = null, archived_at = null where id = p_id or parent_item_id = p_id;
    else raise exception 'unknown kind %', p_kind using errcode = 'invalid_parameter_value';
  end case;
  get diagnostics n = row_count;
  return n;
end $$;

-- F05 / S29: bulk bar. RLS silently drops rows the caller may not edit; the count says how many changed.
create or replace function public.bulk_items(p_action text, p_ids uuid[], p_target uuid default null) returns integer
language plpgsql security invoker set search_path = public as $$
declare n integer := 0; src items%rowtype; nid uuid; sid uuid; sub items%rowtype;
begin
  case p_action
    when 'delete' then
      update items set deleted_at = now() where (id = any(p_ids) or parent_item_id = any(p_ids)) and deleted_at is null;
      get diagnostics n = row_count;
    when 'archive' then
      update items set archived_at = now() where (id = any(p_ids) or parent_item_id = any(p_ids)) and archived_at is null;
      get diagnostics n = row_count;
    when 'restore' then
      update items set deleted_at = null, archived_at = null where id = any(p_ids) or parent_item_id = any(p_ids);
      get diagnostics n = row_count;
    when 'move_to_group' then
      perform public.move_rows('items', p_ids, p_target,
        (select id from items where group_id = p_target and deleted_at is null and id <> all(p_ids) order by position desc, created_at desc limit 1));
      n := array_length(p_ids, 1);
    when 'duplicate' then
      for src in select * from items where id = any(p_ids) and parent_item_id is null order by position loop
        insert into items (board_id, group_id, name, position, created_by)
        values (src.board_id, src.group_id, src.name || ' (copy)',
                (src.position + coalesce((select min(position) from items where group_id = src.group_id and position > src.position and deleted_at is null), src.position + 2)) / 2,
                auth.uid())
        returning id into nid;
        insert into column_values (item_id, column_id, value) select nid, column_id, value from column_values where item_id = src.id;
        for sub in select * from items where parent_item_id = src.id and deleted_at is null order by position loop
          insert into items (board_id, parent_item_id, name, position, created_by) values (src.board_id, nid, sub.name, sub.position, auth.uid()) returning id into sid;
          insert into column_values (item_id, column_id, value) select sid, column_id, value from column_values where item_id = sub.id;
        end loop;
        n := n + 1;
      end loop;
    else raise exception 'unknown action %', p_action using errcode = 'invalid_parameter_value';
  end case;
  return n;
end $$;

-- F12 / S21: one search across boards, items (name and cells), updates and people. RLS hides what you cannot read.
create or replace function public.search(q text, lim integer default 20)
returns table (kind text, id uuid, title text, snippet text, board_id uuid, item_id uuid, rank real)
language sql stable security invoker set search_path = public as $$
  with tsq as (select websearch_to_tsquery('simple', q) tq)
  select * from (
    select 'board'::text kind, b.id, b.name title, coalesce(b.description, '') snippet, b.id board_id, null::uuid item_id, 1.0::real rank
    from boards b where b.deleted_at is null and b.name ilike '%' || q || '%'
    union all
    select 'item', i.id, i.name,
           coalesce((select string_agg(cv.text, ' / ') from column_values cv, tsq where cv.item_id = i.id and cv.text_tsv @@ tq), ''),
           i.board_id, i.id, (ts_rank(i.name_tsv, tq) + 0.5)::real
    from items i, tsq
    where i.deleted_at is null and (i.name_tsv @@ tq or exists (select 1 from column_values cv where cv.item_id = i.id and cv.text_tsv @@ tq))
    union all
    select 'update', u.id, i.name, left(u.body_text, 160), u.board_id, u.item_id, ts_rank(u.body_tsv, tq)::real
    from updates u join items i on i.id = u.item_id, tsq
    where u.deleted_at is null and u.body_tsv @@ tq
    union all
    select 'person', p.id, p.name, p.email, null::uuid, null::uuid, 0.8::real
    from profiles p where p.name ilike '%' || q || '%' or p.email ilike '%' || q || '%'
  ) s order by rank desc, title limit lim
$$;

-- F10 / S18: everything assigned to me, with each board's first status and date column.
-- ponytail: subitems report the item-scope columns of their board, so their own status/date come back null; add subitem columns when it matters.
create or replace function public.my_work(p_show_done boolean default false)
returns table (item_id uuid, item_name text, parent_item_id uuid, parent_name text, board_id uuid, board_name text, group_id uuid, group_title text,
               status_column_id uuid, status jsonb, status_label text, is_done boolean, date_column_id uuid, due date, people_column_id uuid)
language sql stable security invoker set search_path = public as $$
  with mine as (
    select distinct cv.item_id, cv.column_id people_column_id
    from column_values cv join columns c on c.id = cv.column_id and c.type = 'people' and c.deleted_at is null
    where cv.value -> 'ids' ? auth.uid()::text
  ),
  cols as (
    select b.id board_id,
      (select c.id from columns c where c.board_id = b.id and c.scope = 'item' and c.type = 'status' and c.deleted_at is null order by c.position limit 1) status_col,
      (select c.id from columns c where c.board_id = b.id and c.scope = 'item' and c.type = 'date' and c.deleted_at is null order by c.position limit 1) date_col
    from boards b where b.deleted_at is null and b.archived_at is null
  ),
  hidden as (select coalesce((select my_work_hidden_board_ids from profiles where id = auth.uid()), '{}'::uuid[]) ids)
  select i.id, i.name, i.parent_item_id, pi.name, i.board_id, b.name, coalesce(i.group_id, pi.group_id), g.title,
         cols.status_col, sv.value, sv.text, coalesce(d.done, false), cols.date_col, (dv.value ->> 'date')::date, m.people_column_id
  from mine m
  join items i on i.id = m.item_id and i.deleted_at is null and i.archived_at is null
  left join items pi on pi.id = i.parent_item_id
  join boards b on b.id = i.board_id
  join cols on cols.board_id = i.board_id
  left join groups g on g.id = coalesce(i.group_id, pi.group_id)
  left join column_values sv on sv.item_id = i.id and sv.column_id = cols.status_col
  left join column_values dv on dv.item_id = i.id and dv.column_id = cols.date_col
  left join lateral (
    select (l ->> 'is_done')::boolean done from columns sc, jsonb_array_elements(sc.settings -> 'labels') l
    where sc.id = cols.status_col and l ->> 'id' = sv.value ->> 'label_id') d on true,
  hidden h
  where i.board_id <> all (h.ids) and (p_show_done or not coalesce(d.done, false))
  order by (dv.value ->> 'date')::date nulls last, i.name
$$;

-- F09 / S16-S17: one widget's numbers, computed in the database under the caller's RLS.
-- settings: numbers {fn, sources:[{board_id,column_id}]}  battery {sources:[{board_id,column_id}]}
--           chart {fn, sources:[{board_id,column_id,value_column_id?}]}  workload {sources:[{board_id,people_column_id,date_column_id}]}
create or replace function public.widget_data(p_widget uuid) returns jsonb
language plpgsql stable security invoker set search_path = public as $$
declare w widgets%rowtype; s jsonb; fn text; out jsonb; total bigint;
begin
  select * into w from widgets where id = p_widget;
  if not found then return null; end if;
  s := w.settings;
  case w.type
    when 'numbers' then
      fn := coalesce(s ->> 'fn', 'sum');
      select jsonb_build_object('count', count(*), 'value',
        case fn when 'avg' then avg(n) when 'min' then min(n) when 'max' then max(n) when 'count' then count(*) else sum(n) end)
      into out
      from (select (cv.value ->> 'number')::numeric n
            from jsonb_array_elements(s -> 'sources') src
            join column_values cv on cv.column_id = (src ->> 'column_id')::uuid
            join items i on i.id = cv.item_id and i.deleted_at is null and i.archived_at is null) x;
    when 'battery' then
      select count(*) into total
      from jsonb_array_elements(s -> 'sources') src
      join items i on i.board_id = (src ->> 'board_id')::uuid and i.parent_item_id is null and i.deleted_at is null and i.archived_at is null;
      select jsonb_build_object('total', total, 'labels', coalesce(jsonb_agg(jsonb_build_object('label', label, 'color', color, 'is_done', is_done, 'count', cnt) order by cnt desc), '[]'::jsonb))
      into out
      from (select cv.text label, l.lab ->> 'color' color, coalesce((l.lab ->> 'is_done')::boolean, false) is_done, count(*) cnt
            from jsonb_array_elements(s -> 'sources') src
            join columns c on c.id = (src ->> 'column_id')::uuid
            join column_values cv on cv.column_id = c.id
            join items i on i.id = cv.item_id and i.parent_item_id is null and i.deleted_at is null and i.archived_at is null
            left join lateral (select lb.value lab from jsonb_array_elements(c.settings -> 'labels') lb where lb.value ->> 'id' = cv.value ->> 'label_id') l on true
            group by 1, 2, 3) x;
    when 'chart' then
      select coalesce(jsonb_agg(jsonb_build_object('x', x, 'y', y) order by y desc), '[]'::jsonb) into out
      from (select coalesce(nullif(cv.text, ''), 'Empty') x,
                   case when s ->> 'fn' = 'sum' then coalesce(sum((vv.value ->> 'number')::numeric), 0) else count(*) end y
            from jsonb_array_elements(s -> 'sources') src
            join items i on i.board_id = (src ->> 'board_id')::uuid and i.parent_item_id is null and i.deleted_at is null and i.archived_at is null
            left join column_values cv on cv.item_id = i.id and cv.column_id = (src ->> 'column_id')::uuid
            left join column_values vv on vv.item_id = i.id and vv.column_id = (src ->> 'value_column_id')::uuid
            group by 1) q;
    when 'workload' then
      select coalesce(jsonb_agg(jsonb_build_object('user_id', q.uid, 'name', p.name, 'week', q.wk, 'count', q.cnt) order by p.name, q.wk), '[]'::jsonb) into out
      from (select e::uuid uid, date_trunc('week', coalesce((dv.value ->> 'date')::date, (dv.value ->> 'from')::date)::timestamp)::date wk, count(*) cnt
            from jsonb_array_elements(s -> 'sources') src
            join column_values pv on pv.column_id = (src ->> 'people_column_id')::uuid
            join items i on i.id = pv.item_id and i.deleted_at is null and i.archived_at is null
            left join column_values dv on dv.item_id = i.id and dv.column_id = (src ->> 'date_column_id')::uuid
            cross join jsonb_array_elements_text(pv.value -> 'ids') e
            group by 1, 2) q join profiles p on p.id = q.uid;
    else out := null;   -- table widgets read items through the normal queries
  end case;
  return out;
end $$;

-- Deleting a group takes its items along, with the same timestamp, so restoring the group brings exactly those back.
create or replace function app.groups_cascade_delete() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.deleted_at is not null and old.deleted_at is null then
    update items set deleted_at = new.deleted_at where group_id = new.id and deleted_at is null;
    update items set deleted_at = new.deleted_at where parent_item_id in (select id from items where group_id = new.id and deleted_at = new.deleted_at) and deleted_at is null;
  elsif new.deleted_at is null and old.deleted_at is not null then
    update items set deleted_at = null where (group_id = new.id or parent_item_id in (select id from items where group_id = new.id)) and deleted_at = old.deleted_at;
  end if;
  return null;
end $$;
create trigger groups_cascade_delete after update of deleted_at on groups for each row execute function app.groups_cascade_delete();

-- F13: the 30-day purge. Called daily by the Vercel cron route with the service role, which then
-- removes the returned storage paths through the Storage API (rows here never delete files).
create or replace function public.purge_trash(p_days integer default 30) returns jsonb
language plpgsql security definer set search_path = public as $$
declare cutoff timestamptz := now() - make_interval(days => p_days); paths text[]; nb integer; ng integer; ni integer;
begin
  select coalesce(array_agg(a.storage_path), '{}') into paths
  from assets a
  join boards b on b.id = a.board_id
  join items i on i.id = a.item_id
  left join items pi on pi.id = i.parent_item_id
  left join groups g on g.id = coalesce(i.group_id, pi.group_id)
  left join workspaces w on w.id = b.workspace_id
  where a.deleted_at < cutoff or b.deleted_at < cutoff or i.deleted_at < cutoff or pi.deleted_at < cutoff or g.deleted_at < cutoff or w.deleted_at < cutoff;
  delete from workspaces where deleted_at < cutoff;
  delete from boards where deleted_at < cutoff; get diagnostics nb = row_count;
  delete from groups where deleted_at < cutoff; get diagnostics ng = row_count;
  delete from items where deleted_at < cutoff; get diagnostics ni = row_count;
  delete from assets where deleted_at < cutoff;
  delete from dashboards where deleted_at < cutoff;
  delete from automation_runs where started_at < now() - interval '90 days';
  delete from notifications where read_at < now() - interval '90 days';
  delete from invites where accepted_at is null and expires_at < now() - interval '30 days';
  return jsonb_build_object('boards', nb, 'groups', ng, 'items', ni, 'storage_paths', to_jsonb(paths));
end $$;

-- ===========================================================================
-- Grants and schedules
-- ===========================================================================
grant execute on all functions in schema app to authenticated, service_role;
alter default privileges in schema app grant execute on functions to authenticated, service_role;
-- Cron and purge run as the database owner or the service role only.
revoke execute on function public.run_date_automations() from public, anon, authenticated;
revoke execute on function public.purge_trash(integer) from public, anon, authenticated;

-- pg_cron: date triggers every minute. The purge is a daily Vercel cron (it must also delete storage files).
select cron.schedule('taskraft_automation_tick', '* * * * *', 'select public.run_date_automations()');
