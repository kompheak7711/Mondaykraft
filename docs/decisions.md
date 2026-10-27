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
