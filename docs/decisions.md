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

## D-015 · 2026-10-28 · Gates and operating rules (from the owner's brief)

Stack and D-006 to D-014 approved as written. Architecture and design are not gates. The build runs autonomously through `/replica-design`, `/replica-build`, `/replica-backend`, `/replica-test` and `/replica-diff`, then stops with a final report. Stop and ask only before: (1) spending money or upgrading any plan beyond free tiers; (2) deploying anything publicly, with a reminder to rename the repository and folder first; (3) sending real emails or invites to anyone other than test addresses; (4) force-pushing, rewriting git history or deleting branches.

Operating rules: develop against local Supabase (`supabase start` in Docker), no hosted project until the owner is asked; preview deploys count as public unless Vercel Deployment Protection is on, so previews wait for approval; invites go to test addresses only and use the copy-link flow until a sending domain is verified; the stale derived text from D-007 is fixed in `/replica-backend` with a trigger that refreshes cells when a label or a person is renamed; commit and push after each phase with short progress updates.

## D-016 · 2026-10-28 · Design system (replica-design)

Tokens are roles in `replica/design/tokens.json` (light) and `tokens.dark.json` (dark), rendered by `scripts/tokens.mjs` into `src/app/tokens.css` as `--tk-*` variables and mapped into Tailwind v4 utilities in `src/app/globals.css`. No screenshots of the original exist (D-002), so every value is ours: Inter (SIL OFL) through `next/font`, Lucide icons, a placeholder indigo accent that `/replica-brand` replaces, our own 12-colour label palette, and a 4-px spacing scale. Contrast: 34 light pairs and 32 dark pairs, zero AA failures. Primitives come from shadcn/ui on the Radix base (style `radix-nova`), with shadcn's variable names aliased to the same roles; the brand role is exposed to Tailwind as `brand-*` because shadcn already uses `accent` for its hover colour. The theme is a `data-theme` attribute managed by next-themes (light, dark, system). Every primitive is rendered with its states on `/design`; the screenshots are `replica/design/design-light.png` and `design-dark.png`. Button sizes follow shadcn (28, 32, 36 px) rather than the 28, 32, 40 in `components.md`, and the destructive button is shadcn's soft style; both are recorded in `components.md` under Checks.

## D-017 · 2026-10-28 · Build approach

No fake data layer. The schema is done and tested, local Supabase is free, so screens are built against the real database from the first commit; `supabase/migrations/20261028000000_init.sql` is the schema's home and `replica/schema.sql` becomes a symlink to it. Routes follow the recon (`/boards/:id`, `/boards/:id/items/:itemId`, `/boards/:id/automations`, `/dashboards/:id`, `/my-work`, `/inbox`, `/search`, `/trash`, `/login`, `/signup`, `/invite/:token`); the current workspace for the workspace-scoped pages is a cookie set by the sidebar switcher, falling back to the user's first workspace. Column types are modules in one registry (`src/lib/columns`), each with its cell renderer and editor, zod shape, text derivation, filter operators and footer functions, so the table, the item panel, My Work, filters and the automation builder share one definition per type. Board state lives in TanStack Query, loaded as six queries per board and patched by the realtime channel; views compute filters, sort and group-by on that in-memory model.

## D-018 · 2026-10-28 · Build-phase deviations

Recorded while building: `cacheComponents` is off in `next.config.ts` because every page is per-user and Next.js 16's prerender checks flagged auth reads; four React Compiler lint rules (`set-state-in-effect`, `purity`, `exhaustive-deps`, `preserve-manual-memoization`) are warnings, not errors, because the draft-state and memo patterns they flag are intentional; two small RPCs were added for the client (`board_access`, `workspace_people`) plus the `item_update_counts` view; the board table's drag and drop is not built yet (menus and the selection bar cover reorder and move, `move_rows` is ready for it); the bell is a page rather than a popover; the Files tab lists files but uploads go through Files columns.

## D-019 · 2026-10-28 · Backend step

`duplicate_board(p_board, p_mode)` copies structure, items or items and updates with ids rewritten and automations switched off; files are not copied. The D-007 gap is closed: renaming a label, option, person or tag re-derives the text of the cells that show it (`app.refresh_cell_text`), and `app.notify` stays silent during copies and reindexing. The 30-day purge is `GET /api/cron/purge` behind `CRON_SECRET`, which runs `purge_trash()` with the service role and then clears the returned storage paths; schedule it daily in Vercel. The PWA ships a manifest and icon; the service worker and offline queue are still to do. Invite emails stay off (copy-link flow) until a sending domain exists. The seed script (`pnpm seed`) creates three demo users, a workspace, three boards, an automation and a dashboard against local Supabase.

## D-020 · 2026-10-28 · Test and parity step

Playwright with Chromium runs 18 end-to-end cases against the local dev server and the seed data (`e2e/`), each failing on console errors and 5xx responses and scanning with axe at WCAG 2 A/AA. The last full run reported 17 of 18 passing: F03-H1 failed its axe step on the table grid roles. The grid roles were then completed and that case was re-run on its own and passed, but the full suite was not re-run before the commit, so the honest figure at commit time is 17 of 18 with the 18th fixed and re-verified alone. Round two re-runs the whole suite. Three accessibility defects it found were fixed (views bar roles, kanban card semantics, unnamed read-only editors). Parity from `features.csv`: 83.1 / 100 with 87 of 107 must-haves done, so the verdict is not shippable yet; the gaps are listed in `replica/parity.md`, drag and drop and the offline PWA first. No layout diff was run because no screenshots of the original exist in the repo (D-002).

## D-021 · 2026-10-28 · Round two scope

Owner asked for: Vitest unit tests (column validation, `move_rows` ordering, automation rule evaluation, permission rules, progress roll-ups) behind a `test` script; the missing Playwright cases including two browsers seeing each other's edits and RLS cases (a viewer cannot edit, a non-member cannot read); the open edge cases (two tabs on one cell, offline edits, a seeded 2,000-item board); the parity top five except Resend email; README and `.env.example`; the 17 versus 18 explanation (added to D-020); `project_id = "taskraft"` in `supabase/config.toml`. Then `/replica-test` until no S1 or S2 remains and `/replica-diff` again, under the D-015 gates. The brief's sections 7 and 9 are not in the repository; they are read as "the README contents" and "the per-flow test case list", and any case the owner's list has that this round misses can be added on request.

## D-022 · 2026-10-28 · Round two outcome

- B-004 root cause: the cell editing lock was taken on any focus inside the cell, including the trigger button that Radix refocuses after a picker closes, so the page that had just picked a value deferred every remote change to that cell. The lock now follows text entry only (input, textarea, contenteditable). The held-cell case still passes.
- Drag and drop uses dnd-kit's core hooks over the existing `move_rows`; the virtualised grid cannot use the sortable preset, so rows and group headers are plain draggables with a drop line, and keyboard moves work through the keyboard sensor (Space, arrows, Space). Widgets use the sortable preset; their order is `layout.y`.
- Offline: an in-memory ordered queue behind the mutation runner keeps the optimistic state and replays on reconnect, with a badge in the top bar. Queued edits are lost on a reload while offline; IndexedDB persistence is the upgrade if it matters. The service worker (`@serwist/turbopack`, `serwist`, `esbuild` as dev dependencies) caches the shell and serves an offline page; it is registered in production builds only, so `pnpm dev` and the tests run without it.
- Storage policies recreated (migration `20261028040000_storage_policies.sql`): the unqualified `name` in the init policies pointed at `assets.name`, so no upload had ever succeeded (B-007). Uploads now go through `XMLHttpRequest` for progress events; failed files stay listed with Retry.
- Workspace trash: owners only, never the last live workspace (there would be no page left to restore it from); restore lives on the Trash page. Purge does not touch workspaces yet.
- Parity after this round: 90.3 / 100, must-haves 99 of 107, no open S1 or S2. Still "not shippable" by the skill's rule until the 8 partial must-haves close; see `replica/parity.md` for the list.

## D-023 · 2026-10-28 · Round three outcome

Owner asked for the seven partial must-haves except invite email, then `/replica-test`, `/replica-diff` and `/replica-entrepreneur`, under the D-015 gates. All seven are closed:

- Views bar reorder uses dnd-kit's sortable preset on the tabs with a grip per tab (hidden until hover or focus), over the existing `move_rows` with `p_table = 'views'`.
- Search and the person filter now live in the view's `settings` (`search`, `person_filter`), which the model already honoured. People who can edit the board's structure save them 600 ms after the last change; viewers keep them for the session. Each view remembers its own.
- Stacked bars: `chart.type = 'stacked'` with `stack_column_id`; one series per value of the stack column (keys prefixed `s:` so they cannot collide with `name`, `value` or `fill`). With only one groupable column the chart falls back to plain bars and says why.
- `duplicate_group(p_group)` copies live, unarchived items with their cells and subitems and places the copy right after the original. It sets `app.silent`, and `app.run_automations` now returns at once while that flag is set (B-008). `duplicate_board` inherits the same quiet; the bulk bar's Duplicate does not set the flag and still fires automations on its copies.
- Tab and Shift+Tab move along the row inside the grid and wrap to the next or previous row; Tab from an open text editor commits it on blur; past the last cell Tab leaves the grid. This is spreadsheet Tab rather than a strict roving tabindex: inner controls of a cell are reached with Enter or arrows, not Tab.
- Profile photo: public bucket `avatars`, one object per person at `{uid}/avatar`, RLS limits writes to the owner's folder, 2 MB and image types enforced in the policy and in the action. The public URL is stored on the profile with a cache-busting query. Server actions accept 3 MB (`experimental.serverActions.bodySizeLimit`). Removing the photo deletes the object and clears the URL.
- Export CSV: client side from the bulk bar, the view's visible columns as the cells read on screen, RFC 4180 quoting, UTF-8 BOM so spreadsheets open it with accents intact. Excel and PDF stay out of scope.
- Parity after this round: 93.2 / 100, must-haves 106 of 107, no open bugs. The one partial must-have is invite email, which the owner gated on a verified sending domain (D-015), so by the skill's rule the verdict stays "not shippable" until the email ships; by the owner's own gate the product is otherwise complete at must-have level.

