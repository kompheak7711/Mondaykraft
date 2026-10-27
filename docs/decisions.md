# Decisions

One entry per significant decision: what was decided, why, and what it affects. Newest at the bottom.

## D-001 · 2026-10-27 · Repository and remote

Initialized a git repository in `~/Development/Mondaykraft` on branch `main` with `origin` set to `git@github.com:kompheak7711/Mondaykraft.git` (SSH, because the GitHub CLI on this machine is configured for SSH). The GitHub repository already existed and was empty. First commit holds only `.gitignore` (Node, Next.js, Supabase, env files, test output, `replica/screens/`).

The folder and repository name "Mondaykraft" is temporary and internal. The product name is chosen at the App Name Gate and is the only name used in package names, UI, README, PWA manifest and page titles. The repository and folder should be renamed to match before deploy; that rename is left to the owner.

## D-002 · 2026-10-27 · Recon sources and method

Recon used public sources only: the help center, the pricing page, the public API reference, the App Store listing and public tutorial videos linked from the help center. No account, no login, no JavaScript bundles, no network capture. The help center returns HTTP 403 to plain HTTP fetches; individual pages were read one at a time through a reader service rather than crawled. No screenshots were saved; `replica/screens/` stays empty and is git-ignored, so nothing of theirs can ship by accident.

## D-003 · 2026-10-27 · Scope and phasing proposal

The brief's v1 scope is XL as one pass (29 screens, 15 flows, 25 entities, five hard parts: real-time without clobbering edits, 14 column modules in a 2,000-row virtualized table with drag-and-drop, the automation engine with date triggers on pg_cron, Gantt and Calendar views, row-level security across workspace and board roles). Proposed phasing, which matches the brief's build order: A core loop, B views and search, C automations and dashboards. Ship and test at the end of each phase. See `replica/recon.md` for the size section.

## D-004 · 2026-10-27 · Subitems and column values (proposal for replica-architect)

The recon's inferred data model keeps subitems as rows in the same `items` table with a `parent_item_id`, and gives each board a separate column set for subitems (`columns.scope = 'subitem'`). The original uses a hidden sub-board per board; one table is simpler and keeps real-time, permissions and the activity log uniform. Column values are proposed as one `column_values` table keyed by item and column with a typed JSONB `value` validated per column type, plus a denormalized `text` for search and sort. Final call is made in `/replica-architect`.

## D-005 · 2026-10-28 · App name: Taskraft Management

Chosen by the owner at the App Name Gate. Full name "Taskraft Management", short name "Taskraft", identifier `taskraft` (npm package name, PWA `short_name`, database and bucket prefixes). The name is used everywhere the product names itself: UI, page titles, web manifest, README, emails, seed data and the store listing. The original's name never appears in code or copy. Renaming the folder and repository to `taskraft` stays the owner's call (D-001).

Quick conflict check, run 2026-10-28 with automated lookups and a web search. It is a screen, not a legal clearance.

- npm: `taskraft` and `taskraft-management` are unclaimed (the registry returns 404 for both). `taskcraft` is taken. The npm org and user pages could not be checked (403 to scripts).
- Domains (RDAP): `taskraft.com` registered 2018, `taskraft.net` registered 2019, `taskraft.app` registered 2026-10-21 (if that registration was not ours, it is taken). Free at check time: `taskraft.io`, `taskraft.dev`, `taskraft.co`, `taskraft.ai`, `taskraft.so`, `taskraftmanagement.com`, `gettaskraft.com`. `taskcraft.com` has been registered since 2004.
- GitHub: the user or org name `taskraft` is taken. Repositories named taskraft are small hobby projects (a Minecraft mod and a few to-do apps with 0 or 1 stars).
- App stores: no iOS app is named Taskraft or TaskCraft. Google Play lists two apps called "TaskCraft" (`com.taskcraft.app`, a to-do app, and "Sangjani TaskCraft", an offline task and project manager). Same pronunciation, same category: this is the closest conflict found.
- Businesses already using the name: Taskraft (taskraft.co.za, FMCG consulting, South Africa), Taskraft Agency and Taskraft Media (taskraft.digital, digital marketing, Mumbai), Taskraft Organization (South Africa, LinkedIn) and TaskCraft Technologies LLP (IT services, Indore). None of them sells work-management software. "Kraft" is a famous food trademark in unrelated classes; low risk for software, but worth a lawyer's glance.
- Trademark registers: USPTO, EUIPO and WIPO were not queried (no scriptable endpoint). The formal searches in classes 9 and 42 run at `/replica-brand` before launch.

Verdict: usable for v1 and a private beta. Before selling: run the formal trademark search, register one of the free domains (`taskraft.io` or `taskraft.dev` suggested) and confirm who holds `taskraft.app`. Affects `package.json`, the web manifest, page titles, README, the email sender name and the seed script.

## D-006 · 2026-10-28 · Stack (replica-architect)

Next.js 16 (App Router, TypeScript) on Vercel; Tailwind with Radix primitives and the tokens `/replica-design` will produce; Supabase for Postgres, Auth (email and password, Google), Realtime, Storage and pg_cron; `supabase-js` with generated types as the only data layer, SQL migrations, no ORM; Resend as Supabase's SMTP and for invite emails; the mobile app is an installable PWA (Serwist). Reasons: one managed box, free at zero users, and the schema is Postgres-specific (jsonb validators, triggers, RLS) in ways an ORM would only get in the way of. Vercel Hobby forbids commercial use, so the plan moves to Pro before the app is sold. Affects: `replica/architecture.md`, the build and backend steps. Alternatives kept in reserve: Drizzle if query building in TypeScript hurts, Stripe when plans exist.

## D-007 · 2026-10-28 · Schema (closes D-004)

Final calls, all in `replica/schema.sql`: subitems are rows of `items` with `parent_item_id` and a per-board `columns.scope = 'subitem'` column set; column values are one `column_values` table with a jsonb `value` validated and normalised per type by one Postgres trigger, plus a derived `text` for search and display; the derived types (creation log, last updated, progress) store nothing; a cleared cell is a deleted row. 24 tables. Templates are JSON files in the repo applied by `create_board`, not a table; mentions are derived from the update body by the notification trigger, not a table; the default view is `views.is_default` with a partial unique index instead of a column on boards; `activities` uses an identity key because it is an append-only log. Known gap: the derived `text` goes stale when a label or a person is renamed until the cell is next written. The schema loaded on Postgres 17 and passed a 41-check smoke test (`replica/schema-check/`).

## D-008 · 2026-10-28 · Access control is row level security only

Every table has RLS; no TypeScript check stands in for it. Helpers live in a private `app` schema. Role resolution: workspace viewer is read-only everywhere; a main board is open to every workspace member; a private board only to its `board_members`; a board owner, or a workspace owner or admin, bypasses the permission set. The four permission sets map to three rights (edit items and cells, edit structure, post updates) as tabulated in `replica/architecture.md`. Owner-only board fields are protected by a trigger because policies cannot see which columns changed. The select-policy helpers take the row's own columns so `insert ... returning` works on a row whose owner membership arrives in an after-insert trigger; the smoke test caught this.

## D-009 · 2026-10-28 · Ordering is owned by the server

`position` is `numeric`. The client sends intent (these rows, after that row, into that container) to `rpc move_rows`, which takes an advisory lock per container, assigns midpoints and renumbers when the gap closes. Ties sort by `created_at, id`. This replaces the fractional-index strings the recon notes assumed: same idea, no client library, no retry loop, and the automation engine can append items in plain SQL.

## D-010 · 2026-10-28 · Automation engine in Postgres

Event triggers (item created, status changed, person assigned) run the engine inside the writing transaction; date triggers run from a pg_cron tick every minute, once per automation, item and local date. Each recipe runs in a subtransaction: a failing action is logged to `automation_runs` and never blocks the user's edit. Loop guard: a session depth counter stops the chain after five automations. Date triggers fire in the workspace's timezone, so `workspaces.timezone` was added. Deleting a column or group a recipe refers to switches the recipe off. Alternative rejected: a TypeScript engine behind database webhooks (a public endpoint, retries, a second place where permissions live).

## D-011 · 2026-10-28 · Realtime: broadcast from the database

Triggers call `realtime.broadcast_changes` on a private topic per board and `realtime.send` on a topic per user; RLS on `realtime.messages` authorises both. Cell changes go out as a slim payload (value only under 16 KB) to stay under the 256 KB message cap. Conflict rule: last write wins per cell; the client holds a remote change to the focused cell until blur. On reconnect the client refetches the board. Rejected: `postgres_changes`, which re-checks RLS per subscriber per change and cannot filter on a joined board id.

## D-012 · 2026-10-28 · View libraries

Calendar view: react-big-calendar (MIT) with the date-fns localizer and its drag addon. Timeline and Gantt view: our own, a virtualised row list with positioned bars, because it must share the table's row model and the MIT Gantt libraries are either single-pane SVG or unmaintained. Charts: Recharts. Drag and drop: dnd-kit. Table virtualisation: TanStack Virtual. Rich text: TipTap. All swapped only if they fight the design tokens in `/replica-design`.

## D-013 · 2026-10-28 · Trash, purge and files

Soft deletes with a 30-day trash. Deleting a group stamps its items with the same timestamp, so restoring the group restores exactly those items. The purge is `purge_trash()` called once a day by a Vercel Cron route with the service role, which then deletes the returned storage paths through the Storage API (rows never delete files). Files live in one private bucket, 25 MB per file, uploaded browser-to-Storage after the `assets` row exists; storage policies read that row. Automation runs and read notifications are pruned after 90 days.

## D-014 · 2026-10-28 · Build order locked

The phasing proposed in D-003 is now the build order in `replica/architecture.md`: a vertical slice (sign up, one board with three column types, live editing, one mention), then Phase A (core loop), B (views and search), C (automations and dashboards), then should- and could-haves, then the entrepreneur fixes. Each phase ends with `/replica-test` and a preview deploy.
