# Taskraft Management

Boards, items and automations for a small team working together in real time. Each board is a table of items in coloured groups with typed columns (status, people, dates, timelines, numbers, text, dropdowns, tags, files and more). Everyone edits cells inline and sees each other's changes live, talks inside an item's updates, and the same cells feed Kanban, Calendar, Gantt and Chart views, automations and dashboards.

## Stack

Next.js 16 (App Router, TypeScript, Tailwind v4, shadcn/ui on Radix) on Vercel, and one Supabase project for Postgres, Auth, Realtime, Storage and pg_cron. Row level security is the only authorisation layer; the cell validator, activity log, notifications, realtime fan-out and the automation engine live in the database as triggers and functions. Architecture and decisions: `replica/architecture.md`, `docs/decisions.md`.

## Run it locally

Prerequisites: Node 22+, pnpm, Docker, the Supabase CLI (`brew install supabase/tap/supabase`).

```bash
pnpm install
supabase start                      # local Postgres, Auth, Realtime, Storage; applies supabase/migrations
supabase status -o env              # copy API_URL, PUBLISHABLE_KEY, SECRET_KEY into .env.local (see .env.example)
pnpm db:types                       # regenerate src/lib/db/types.ts
pnpm seed                           # demo workspace: three people, three boards, an automation, a dashboard
pnpm dev                            # http://localhost:3000
```

Demo login after `pnpm seed`: `demo.ana@example.com` / `taskraft-demo-1` (owner), `demo.ben@example.com` (member), `demo.viv@example.com` (viewer), same password.

Offline and install: edits made offline stay on screen and sync when the connection returns (the top bar shows how many are waiting). The service worker (`src/app/sw.ts`, served at `/serwist/sw.js`) is registered in production builds only, so `pnpm dev` and the tests run without it; `pnpm build && pnpm start` to try the installable app and the offline page.

## Scripts

| script | what it does |
| --- | --- |
| `pnpm dev` / `pnpm build` / `pnpm start` | Next.js |
| `pnpm lint` / `pnpm typecheck` | ESLint, `tsc --noEmit` |
| `pnpm test` | Vitest: unit tests, plus database tests when local Supabase is up |
| `pnpm exec playwright test` | end-to-end tests against `pnpm dev` and the seed data (console errors, 5xx and axe checks included) |
| `pnpm db:types` | regenerate the database types |
| `pnpm db:reset` | wipe and re-apply migrations (also wipes local users) |
| `pnpm db:check` | run the schema against Postgres 17 in Docker with the SQL smoke test |
| `pnpm seed` | seed the demo workspace |
| `pnpm tokens` | render `replica/design/tokens*.json` into `src/app/tokens.css` |

## Environment

See `.env.example`. `NEXT_PUBLIC_*` values are safe in the browser; `SUPABASE_SECRET_KEY` and `CRON_SECRET` are server only. `RESEND_API_KEY` stays empty until a sending domain is verified; invites work as copied links.

## Project layout

```
supabase/migrations/   the schema: tables, validators, triggers, RLS, RPCs, cron
src/app/               routes (App Router), server actions, API routes (/api/assets, /api/cron/purge)
src/components/        shell, board (table, header, views bar, toolbar), views, item panel, automations, dashboards, ui primitives
src/lib/columns/       one module per column type: cell, validator, text, filters, summaries
src/lib/board/         board snapshot loader, view model, optimistic mutations, realtime channel
replica/               recon map, architecture, design tokens, feature matrix, build log, test plan, bugs, parity
docs/decisions.md      one entry per significant decision
```

## Deploying

Not yet deployed by design (see D-015). When the owner approves: rename the folder and repository to `taskraft`, create a hosted Supabase project and run `supabase db push`, set the environment variables on Vercel, turn on Vercel Deployment Protection for previews, schedule `GET /api/cron/purge` daily, configure Resend as Supabase's SMTP and set `RESEND_API_KEY`. Supabase free tier pauses after a week idle; Vercel Hobby forbids commercial use, so move to Pro before selling.

## Clean room

This is a rebuild of a category of product's features and flows, written from a public recon map (`replica/recon.md`). It uses its own name, design tokens, copy, icons (Lucide) and font (Inter). Nothing is copied from any other product's code, assets or content.
