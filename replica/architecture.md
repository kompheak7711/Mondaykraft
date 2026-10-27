# Architecture: Taskraft Management (a rebuild of monday.com work management's core features)

Inputs: `replica/recon.md` (29 screens, 15 flows, 25 entities) and `replica/features.csv` (109 must, 17 should, 6 could, 20 skip). Decisions D-001 to D-005 in `docs/decisions.md`; the ones made here are D-006 onward.

One line: a Next.js app on Vercel talking straight to one Supabase Postgres through row level security, with the cell validator, the activity log, notifications, realtime fan-out and the automation engine all living in the database as triggers and functions. No ORM, no queue, no second service.

## Stack

| layer | choice | why |
| --- | --- | --- |
| web | Next.js 16 (App Router) + TypeScript, deployed on Vercel | server components for the shell, client components for the board; Vercel is the zero-config host for it. Hobby plan until the app is sold (Hobby forbids commercial use), Pro after. |
| styling | Tailwind + Radix primitives (menus, popovers, dialogs, tooltips) + tokens from `/replica-design` | Radix gives keyboard and screen-reader behaviour for the 20 popovers the recon lists; hand-rolling those is where accessibility dies. |
| mobile | installable PWA: web manifest + Serwist service worker; the same routes, a card list under 768px | `features.csv` skips native apps. The service worker caches the shell only; data goes through TanStack Query's persisted cache (IndexedDB). |
| database | Postgres on Supabase (free tier at zero users) | one managed box gives Postgres, Auth, Realtime, Storage and pg_cron. 500 MB database, 1 GB storage, 50 MB per file, 200 realtime connections and 2M realtime messages a month on the free plan (checked 2026-10-28). |
| data access | `supabase-js` with generated types, straight from client and server components; SQL migrations in `supabase/migrations/`; no ORM | the schema is Postgres-specific (jsonb validators, triggers, RLS, exclusion of ORMs' blind spots). RLS makes direct client reads safe and realtime-friendly. Multi-step writes are Postgres functions called with `rpc`. Swap for Drizzle only if query building in TypeScript ever hurts. |
| auth | Supabase Auth: email + password, Google OAuth; `@supabase/ssr` cookies in Next.js | free, and `auth.uid()` is what every policy keys on. Invites are our own `invites` table plus a token link. |
| payments | none in v1 | `features.csv`: billing is out of scope. Stripe Checkout + Billing when plans exist. |
| email | Resend (free: 3,000 a month, 100 a day) as Supabase's custom SMTP, plus the Resend API for invite emails | Supabase's built-in sender only delivers to project team members, so a real invite needs a provider. Notifications and digests stay in-app (skipped in the matrix). |
| jobs | pg_cron inside Postgres for the date-trigger tick (every minute); one Vercel Cron route a day for the trash purge | pg_cron is free and already next to the data. The purge has to call the Storage API to delete files, so it runs in the app, and Vercel Hobby allows exactly one daily cron. |
| realtime | Supabase Realtime, broadcast from database triggers on a private topic per board, presence on the same channel, one topic per user for the bell | `realtime.broadcast_changes` sends one message per change to a topic our RLS policy on `realtime.messages` authorises; `postgres_changes` would re-check RLS per subscriber per change and cannot filter on joined tables. |
| files | Supabase Storage, one private bucket `assets`, 25 MB per file, signed URLs | the asset row is inserted first (RLS), then the file is uploaded to the path the row fixed; the storage policies read the row. No server hop for uploads. |
| search | Postgres full-text search (`simple` config) on item names, cell text and update text, one `search()` function | good enough for a small team; `pg_trgm` for fuzzy matching later if people ask. |
| hosting | Vercel (app) + Supabase (everything else), both free at the start | nothing to operate. Supabase pauses a free project after a week without traffic; the daily purge cron keeps it awake. |

Libraries the build will add (all MIT or similar): TanStack Query (cache, optimistic updates, offline mutation queue), TanStack Virtual (2,000-row table), dnd-kit (rows, groups, columns, kanban cards, widgets), TipTap (updates editor with mentions), Recharts (chart view and widgets), react-big-calendar with the date-fns localizer (calendar view), date-fns + date-fns-tz, zod (client mirror of the SQL validator), Lucide icons. The Gantt view is our own: a virtualised row list with absolutely positioned bars, because it must share the table's row model and the timeline column's drag behaviour, and the MIT Gantt libraries are either single-pane SVG or unmaintained.

Not chosen, on purpose: an ORM (the schema is SQL), a job queue (triggers and pg_cron cover every job in the recon), a separate realtime server, Edge Functions (nothing needs them yet), Expo (PWA instead), a second database.

## Schema

Tables: 24. Access rules: Postgres row level security on every table, nothing else. The SQL is in `replica/schema.sql` (about 1,700 lines: tables, validators, triggers, policies, RPCs, cron). It ran clean on Postgres 17 with stubs for the Supabase schemas, and a 41-check smoke test covering invites, permission sets, the validator, automations with the loop guard, date triggers, move ordering, My Work, search, duplicate, trash and purge passed.

| group | tables |
| --- | --- |
| people and tenancy | `profiles` (one per `auth.users` row, created by trigger), `workspaces`, `workspace_members`, `invites`, `folders` |
| boards | `boards`, `board_members`, `groups`, `columns`, `items` (subitems are items with `parent_item_id`), `column_values`, `views` |
| conversation and files | `updates` (TipTap json + derived `body_text`), `reactions`, `assets` |
| history and leverage | `activities` (append-only, identity key), `automations`, `automation_runs`, `notifications` |
| dashboards and the rest | `dashboards`, `dashboard_boards`, `widgets`, `favorites`, `tags` |

What the recon's data model had that is not a table: `Mention` (derived from the update body by the notification trigger), `Template` (the five built-in templates are JSON files in the repo, applied by `create_board`), `Presence` (realtime only). `boards.default_view_id` became `views.is_default` with a partial unique index, so there is no circular foreign key.

Conventions, applied everywhere: `id uuid default gen_random_uuid()`, `created_at` and `updated_at timestamptz` in UTC with an `updated_at` trigger, an owner column (`workspace_id` or `board_id`) on every row a user owns, every foreign key with an explicit `on delete` rule and an index, enums for stable sets (`workspace_role`, `board_role`, `board_kind`, `permission_set`, `column_type`, `view_type`, `notification_kind`, `run_status`, `widget_type`) and text + check for the growing one (`activities.kind`), `deleted_at` soft deletes for boards, groups, items, columns, views, updates, automations, dashboards and workspaces with a 30-day purge. No money columns in v1.

### Column values (closes D-004)

Final call: one `column_values` table keyed `(item_id, column_id)` with a jsonb `value` and a derived `text`. The before-insert trigger `app.validate_column_value` is the single validator for the 14 stored types; it rejects bad shapes with `check_violation`, normalises the value, derives `text` (label name, people names, tag names, file names, ISO dates) and stamps `updated_by`. Two column types are derived and store nothing: `creation_log` and `last_updated` read `items.created_at`, `created_by` and `updated_at`; `progress` is computed from its source status columns on the client and in the widget SQL. A cleared cell is a deleted row, never a stored empty value.

| type | value | column `settings` |
| --- | --- | --- |
| status, priority | `{"label_id":"done"}` | `{"labels":[{"id","label","color","is_done"}]}`; label ids are stable, the validator refuses to drop a label still in use (`rpc delete_label` moves the items first) |
| people | `{"ids":[uuid]}`, all workspace members | `{"max": 1}` optional |
| date | `{"date":"2026-10-28","time":"09:30"}`, time optional, no zone | `{"with_time": false}` |
| timeline | `{"from":"2026-10-01","to":"2026-10-15"}`, `to >= from` | |
| numbers | `{"number": 12.5}` | `{"unit","unit_position","decimals","summary"}` |
| text, long_text | `{"text":"..."}` (4,000 and 100,000 chars) | |
| dropdown | `{"ids":["o1"]}` subset of options | `{"options":[{"id","label","color"}], "limit"}` |
| tags | `{"ids":[tag uuid]}` from the workspace's `tags` | |
| checkbox | `{"checked": true}` | |
| link | `{"url":"https://...","text":"..."}` | |
| files | `{"ids":[asset uuid]}`, assets on this item and column | |
| progress, creation_log, last_updated | none (derived) | progress: `{"source_column_ids":[...]}` |

Subitems: rows of `items` with `parent_item_id` set and `group_id` null (a check constraint ties the two together; a trigger forbids a third level). Each board carries a second column set with `columns.scope = 'subitem'`, and the validator refuses a value whose column scope does not match the item. Everything else (realtime, permissions, activity, trash) treats a subitem as an item.

Positions: `numeric` midpoints, owned by the server. `rpc move_rows` takes an advisory lock per container, computes the midpoint between neighbours and renumbers the container when the gap closes below 1e-6. Ties sort by `created_at, id`. No fractional-index library, no retry loop on the client.

Big boards: the client loads a board as six parallel PostgREST reads (board, groups, columns, views, items, column_values, each by `board_id`), keeps them in TanStack Query and patches them from realtime. Filter, sort, group-by, hide and column footers run on that in-memory model, so the 14 column modules exist once, in TypeScript. Only the queries that cross boards live in SQL: `my_work`, `search`, `widget_data`.

### Access rules

Row level security is the only authorisation layer; there is no permission check in TypeScript that the database does not also make. Helpers live in the `app` schema (never exposed by PostgREST), are `security definer` and `stable`, and policies wrap them in `(select ...)`. `app.board_role_from(id, workspace_id, kind, created_by, user)` takes the board's own columns so the select policy also holds for a row that is being inserted (an `insert ... returning` checks the select policy before the new row, or the owner row its trigger adds, is visible). The same trick covers workspaces and dashboards.

| who | read | items and cells | updates and reactions | structure: columns, groups, views, automations | settings, members, permissions, archive, delete |
| --- | --- | --- | --- | --- | --- |
| workspace viewer | main boards; private only if invited | no | no | no | no |
| member, board set to Edit everything | yes | yes | yes | yes | no |
| member, Only edit content | yes | yes | yes | no | no |
| member, Only edit assigned items | yes | only items where a people column names them, or their parent | yes | no | no |
| member, View and comment | yes | no | yes | no | no |
| board owner, workspace owner or admin | yes | yes | yes | yes | yes |

Private boards are visible to `board_members` only; workspace admins are not let in automatically. Owner-only board fields (`permission_set`, `kind`, `archived_at`, `deleted_at`) are protected by a trigger because a policy cannot see which columns changed. A workspace and a board always keep at least one owner (trigger). Dashboards: main ones are readable by every workspace member, private ones by their creator; `widget_data` runs as the caller, so boards they cannot read drop out of the numbers. Notifications and favorites are the user's own rows. Activities and automation runs are readable by board readers and written only by triggers. Storage and realtime policies read `assets` and `app.board_role` respectively, so a file or a channel is exactly as visible as its board.

## API

Mechanisms: `table` is PostgREST through `supabase-js` under RLS (from the browser or a server component), `rpc` is a Postgres function in `replica/schema.sql`, `action` is a Next.js server action, `route` is a Next.js route handler, `auth` is the Supabase Auth client. Every call carries the user's JWT; only the invite email and the purge route use the service role.

| method path | does | who | input | output | flow |
| --- | --- | --- | --- | --- | --- |
| auth signUp, signInWithPassword, signInWithOAuth(google), resetPasswordForEmail | sessions; a trigger creates `profiles` | anyone | email, password | session cookie | F01 |
| route GET /auth/callback | OAuth and magic-link code exchange | anyone | code | redirect | F01 |
| table workspaces insert, update | create (trigger adds the owner), rename, timezone, delete to trash | signed in; owner or admin | name, timezone | row | F01, S02 |
| rpc accept_invite(token) | join a workspace; the signed-in email must match | signed in | token | workspace_id | F01, F11 |
| action inviteMember(workspaceId, email, role) | insert the invite under RLS, send the link with Resend; also resend | owner, admin | email, role | invite | F11, S23 |
| table invites select, delete | pending list, remove | owner, admin | | rows | S23 |
| table workspace_members update, delete | change role, remove, leave; last owner is blocked | owner, admin; self to leave | role | | F11 |
| table profiles select, update | people pickers; name, avatar, timezone, theme, notification prefs, My Work hidden boards | members; self | | row | S26, S18 |
| table folders insert, update, delete; rpc move_rows('folders') | sidebar tree | members | name, color, parent | | S02 |
| table favorites insert, delete | star a board or dashboard | self | | | S02 |
| rpc create_board(workspace, folder, name, definition) | blank board or one of the five templates, in one transaction | members | definition json | board id | F01, F02, S24 |
| table boards update | rename, description, move to folder, change type, permission set, archive, delete to trash | structure editors; owner for the guarded fields | | row | F02, F15, S22, S28 |
| rpc duplicate_board(board, mode) (written in /replica-backend) | copy structure, items, or items and updates; automations copied switched off | owner | mode | board id | F15 |
| table board_members insert, update, delete | owners with crown, subscribe, mute | owner; self for subscribed and muted | role, subscribed, muted | | F11, S19, S22 |
| table groups insert, update; rpc move_rows('groups') | add, rename, recolour, collapse is client-side, archive, delete (items follow), reorder | structure editors | title, color | | F02, F04 |
| table columns insert, update; rpc move_rows('columns') | column center, rename, width, settings, labels, hide is per view, delete, reorder | structure editors | type, settings | | F02, S04, S05 |
| rpc delete_label(column, label, move_to) | remove a label, moving its items first | structure editors | | count | S05 |
| table views insert, update; rpc move_rows('views'); rpc set_default_view(view) | add, rename, duplicate, delete, reorder, default; settings hold filters, sort, hidden columns, group by, and per-type keys | structure editors | settings json | | F07, S12, S13 |
| table items insert | add item, add subitem | content editors; assigned editors on their own items | name, group or parent, position | row | F03, S07 |
| table items update | rename, archive, delete to trash, undo | can edit the item | | | F03, F13 |
| table column_values upsert, delete | edit or clear a cell; the trigger validates, logs, notifies, broadcasts, runs automations | can edit the item | value json | normalised row | F03 |
| rpc move_rows('items' or 'subitems', ids, group, after) | drag rows, move between groups | can edit the items | | | F04 |
| rpc bulk_items(action, ids, target) | delete, archive, restore, move to group, duplicate | content editors | | count changed | F05, S29 |
| rpc restore(kind, id) | undo toast and trash restore for boards, groups, items | editors | | count | F13, S25 |
| table boards, groups, items select where deleted_at is not null | trash listing | readers | | rows | S25 |
| table updates insert, update | post, reply, edit, soft delete, pin; trigger derives text and sends mention, reply and follower notifications | every member, any permission set | TipTap json | row | F06, S06 |
| table reactions insert, delete | like, emoji | members | emoji | | F06 |
| table assets insert, then storage upload to the row's path; storage createSignedUrl | attach to a files cell or an update, preview, download | can edit the item; can comment | name, size, mime | asset row, signed url | S06, files column |
| table activities select | item and board activity log | readers | | rows | S06, S28 |
| table notifications select, update, delete | bell, tabs, mark read, mark all read | self | | rows | S19 |
| table updates select by followed boards | inbox feed | readers | | rows | S20 |
| rpc my_work(show_done) | everything assigned to me, with each board's first status and date column | self | | rows | F10, S18 |
| rpc search(q, limit) | boards, items (name and cells), updates, people | self, under RLS | query | ranked rows | F12, S21 |
| table automations insert, update | recipe builder, toggle, duplicate, delete; a trigger validates the recipe against the board | structure editors | trigger, conditions, actions json | row | F08, S14, S15 |
| table automation_runs select | run history with failures | readers | | rows | S14 |
| table dashboards, dashboard_boards, widgets | create, connect boards, add, configure, resize and reorder widgets (layout json) | creator; workspace owner or admin | settings, layout | rows | F09, S16, S17 |
| rpc widget_data(widget) | numbers, battery, chart, workload, computed under the caller's RLS | dashboard readers | | json | F09 |
| route GET /api/cron/purge | daily: `purge_trash()` then delete the returned storage paths | Vercel Cron with `CRON_SECRET` | | counts | F13 |

Count: 13 RPCs (12 written, `duplicate_board` planned), 22 tables used directly under RLS, 2 route handlers, 1 server action, 4 auth calls. No private endpoint of the original is used anywhere; the only third-party APIs are Supabase, Resend and Google OAuth, all with our own keys.

Webhooks in: none in v1 (no Stripe, no calendar providers). Webhooks out: none (integrations are out of scope). Database-internal events replace both: triggers on `auth.users` (profile), `workspaces` and `boards` (owner rows), `column_values` and `items` (validation, activity, notifications, automations, broadcast), `groups` (soft-delete cascade), `columns` and `groups` (switch off orphaned automations).

Jobs: `taskraft_automation_tick`, pg_cron, every minute, `run_date_automations()`: fires date triggers once per automation, item and local date, under an advisory lock. Daily Vercel Cron `/api/cron/purge`: hard-deletes anything in the trash for more than 30 days, prunes runs and read notifications older than 90 days and expired invites, and removes the orphaned files from Storage. No other background work exists.

Realtime: one private topic per board, `board:{board_id}`, with events `items`, `groups`, `columns`, `views`, `updates`, `reactions`, `boards`, `automations` (full new and old rows via `realtime.broadcast_changes`) and `cell` (slim payload: item_id, column_id, updated_by, updated_at, and the value when under 16 KB, else the client fetches the cell). Presence is tracked on the same channel with user id, name and avatar. One private topic per user, `user:{user_id}`, carries `notification` for the bell. On reconnect the client refetches the board's six queries instead of replaying messages.

## The parts that bite

- time zones: date and timeline cells are wall dates with no zone, stored exactly as typed, so daylight saving never moves them. "Overdue", the calendar and the My Work buckets are computed in the viewer's profile timezone. Date automations fire in the workspace's timezone (`workspaces.timezone`, set from the creator's browser, editable), evaluated once a minute. Only `created_at` and friends are instants, and they are UTC `timestamptz`.
- idempotency: cell writes are upserts, so a replayed offline edit is harmless. Item inserts carry client-generated uuids, so a retry cannot duplicate. A date trigger fires once per automation, item and local date (unique index). `accept_invite` is `on conflict do nothing`. The purge can run twice.
- races: two people editing one cell is last write wins per cell; both end up seeing the final value and the activity log keeps both writes. A remote change to the cell someone is typing in is held until blur, then shown as changed by X while the local draft stays. Positions are assigned by the server under an advisory lock per container and renumbered when the gaps close. Two automations that flip each other stop at depth 5 and show up as skipped runs. The date tick holds an advisory lock, so overlapping cron runs do nothing.
- automation failures: the engine runs inside the user's transaction, but each recipe runs in a subtransaction. A broken action lands in `automation_runs` as failed and never blocks the edit. Deleting a column or group a recipe refers to switches the recipe off. Only successful runs count toward `run_count`.
- free-tier ceilings (Supabase, checked 2026-10-28): 500 MB database (a 2,000-row board with 15 columns is about 30,000 cell rows, a few MB), 200 concurrent realtime connections (fine for a team, not for a public demo), 2 million realtime messages a month (each change is one message per subscriber), 256 KB per message (hence the slim `cell` payload), 50 MB per upload (we cap at 25 MB), 1 GB of storage, 1-day log retention, and projects pause after a week idle. Resend's free plan sends 100 emails a day: invites and auth mail only. Vercel Hobby allows one daily cron, 10-second functions and no commercial use.
- file size limits: 25 MB in the bucket and in the `assets.size` check. Previews use the original image; image transformations are a paid feature. Uploads go browser to Storage, never through Next.js.
- search: `simple` text search is language-neutral but exact-stem, no typo tolerance, 20 results. Cell text is derived at write time, so renaming a label or a person leaves old cells searchable by the old text until they are next written; `/replica-backend` can add a reindex touch on label rename if it matters.
- realtime: every write pays for a broadcast trigger (small). Full rows go out for items, updates and structure; an update body is capped at 64 KB client-side to stay under the message limit. A user removed from a board keeps the socket until the client re-subscribes, so the client re-joins the channel when `board_members` changes. Reconnect refetches the board rather than replaying messages.
- offline: TanStack Query's persister and mutation queue live in IndexedDB per browser profile. Only cell edits, item adds and renames, and updates are queued; structure changes offline get a toast. Replays resolve last write wins.
- email deliverability: Resend needs a verified sending domain (SPF and DKIM), which waits on the domain choice in D-005. Until then invites work as a copied link.
- multi-tenancy: every row carries `workspace_id` or `board_id` and every policy derives from workspace membership. Tags are per workspace. Profiles are visible only to people who share a workspace. Nothing moves across workspaces.
- GDPR deletion: deleting an `auth.users` row cascades to the profile, memberships, notifications and favorites; authored items and updates stay with a null author shown as "Deleted user". Self-service deletion is a confirmed server action calling the Auth admin API. Export is out of v1.
- RLS cost: the helpers are index lookups on the `(workspace_id, user_id)` and `(board_id, user_id)` primary keys, and `column_values`, `updates` and `assets` denormalise `board_id` so no join is needed. Seed a 2,000-row board with the check harness and measure before Phase B.
- the big table: 2,000 rows by 15 cells is virtualised with TanStack Virtual; dnd-kit only mounts handles for visible rows. Group collapse state stays in localStorage.

## Build order

The phases are D-003's A, B and C; each ends with `/replica-test` on its flows and a preview deploy.

1. **Vertical slice** (proves the stack, ugly): S01, S02 with one workspace and a boards list, S03 with three column modules (text, status, people), S06 updates tab only. Tables: profiles, workspaces, workspace_members, boards, board_members, groups, columns, items, column_values, updates, activities, notifications. Routes: the auth calls and `/auth/callback`, `workspaces` insert, `create_board`, `items`, `column_values`, `updates` tables, `move_rows('items')`, the board channel. Done when two browsers edit the same board live and an @mention rings the other one's bell.
2. **Must-haves, Phase A (the core loop)**, by area:
   - auth and workspace: invites (S23, `inviteMember`, `accept_invite`), roles, folders, favorites, profile and settings with light and dark themes (S26).
   - boards: five templates (S24), board menu (S28) with duplicate (`duplicate_board`), permissions (S22), trash with restore and the undo toast (S25).
   - columns: the other eleven modules (date, timeline, numbers, long text, dropdown, priority, tags, checkbox, link, files, progress, creation log, last updated), column center (S04), column settings and label editor (S05, `delete_label`), footers, keyboard navigation and shortcuts.
   - items: subitems (S07), bulk bar (S29, `bulk_items`), drag for groups and columns.
   - item panel: files tab (assets and storage), activity tab, replies, reactions, edit and delete.
   - realtime: presence avatars, remote-change flash, offline banner and queue.
   - notifications: bell tabs (S19), inbox (S20).
   - My Work (S18, `my_work`).
   - mobile: manifest, service worker, card list layout (S27).
3. **Must-haves, Phase B (ways of seeing)**: views bar and saved views (S13, `set_default_view`), filter panel (S12), sort, search, hide and group-by saved per view, Kanban (S08), Calendar (S09), Timeline and Gantt (S10), Chart (S11), global search (S21, `search`).
4. **Must-haves, Phase C (leverage)**: automations center (S14), builder (S15), run history; dashboards (S16, S17) with the numbers, chart, battery and workload widgets (`widget_data`).
5. **Should-haves**, then **could-haves**: Google login, pending-invite list, pin updates, mute a board, board activity log, subitem roll-ups, main vs private boards, My Work views and hidden boards, notification preferences, several actions per recipe (the engine already allows ten), recipe gallery, dashboard filters, private dashboards, command palette. Then convert item and subitem, checklists and GIFs in updates, add item from My Work, cross-board automations, the table widget.
6. **Fixes from `/replica-entrepreneur`** once it has run.

## Checking the schema

`replica/schema-check/run.sh` starts `postgres:17` in Docker, loads stubs for the `auth`, `realtime`, `storage` and `cron` schemas, then `replica/schema.sql`, Supabase's default grants, and `smoke.sql`: 41 checks that act as three users through RLS and end with `SMOKE PASSED`. Run it after every schema change; it takes under a minute.

Next step: `/replica-design`.
