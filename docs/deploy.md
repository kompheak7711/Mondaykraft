# Deploy checklist: free Supabase project + Vercel Hobby

Status: **prepared, not run.** Deploying is a gate (D-015). Nothing below has been executed against a hosted project.
Taskraft is for personal and team use only (D-025), which is what Vercel's Hobby terms allow (no commercial use).

Before step 1, per D-001: rename the folder and the GitHub repository to `taskraft` (`Mondaykraft` must not appear in the deployed URL or the Vercel project name).

Plan limits worth knowing (check the current pages; these change): Supabase Free gives one Postgres of 500 MB, 1 GB of file storage, built-in auth email at a few messages per hour, and **pauses a project after about a week with no traffic**; a paused project is restored from the dashboard. Vercel Hobby gives cron jobs that run at most once a day, serverless functions limited to a 4.5 MB request body (profile photos are capped at 2 MB; board files go straight to Storage), and preview deployments protected by Vercel Authentication by default.

## 1. Supabase project

1. Dashboard → New project. Name `taskraft`, region nearest the team, generate a strong database password and keep it (the CLI needs it once).
2. Database → Extensions: enable **pg_cron**. The first migration schedules the automation tick with `cron.schedule`, so the extension must exist before the push.
3. Project Settings → API: copy the project URL, the **publishable** key and the **secret** key (new key names; the legacy anon and service_role keys work too).
4. Link and push the schema from the repo:

```bash
supabase login
supabase link --project-ref <project-ref>          # asks for the database password
supabase db push                                   # applies supabase/migrations/* in order
```

   Verify after the push, in SQL Editor:

```sql
select jobname, schedule from cron.job;                   -- taskraft_automation_tick, * * * * *
select id, public, file_size_limit from storage.buckets;  -- assets (private, 25 MB), avatars (public, 2 MB)
select count(*) from pg_policies where schemaname = 'storage';  -- 8 policies on storage.objects
select count(*) from pg_policies where schemaname = 'realtime'; -- 2 (receive, presence)
```

   If the push stops at a `create policy ... on storage.objects` statement, create that policy in Storage → Policies with the same expression, then `supabase migration repair --status applied <version>` and push again. This happens on some hosted projects where `postgres` does not own `storage.objects`.
5. Storage buckets come from the migrations; nothing to click. The purge route deletes orphaned objects from `assets` daily; `avatars` objects are replaced in place.
6. Realtime needs no publication: board changes go out through `realtime.broadcast_changes` triggers and presence through `realtime.messages`, both already in the schema.

## 2. Auth

1. Authentication → URL Configuration:
   - Site URL: `https://<project>.vercel.app` (the production alias you get in step 3).
   - Additional redirect URLs: `https://<project>.vercel.app/**` and, if previews stay on, `https://*-<vercel-team>.vercel.app/**`. The app sends people back through `/auth/callback?next=...`, which must match one of these.
2. Authentication → Providers → Email: leave **Confirm email** on. Password reset and confirmation mails use Supabase's built-in sender, which is enough for a small team; do not wire Resend as SMTP until a sending domain is verified (D-015). Google sign-in stays off (the login page already says so).
3. Leave **Allow new users to sign up** on while the team joins (invite links land on `/invite/<token>` and need signup). Turn it off afterwards; existing accounts keep working.
4. Rate limits: Authentication → Rate Limits defaults are fine for a team of ten.

## 3. Vercel project (Hobby)

1. vercel.com → Add New → Project → import the `taskraft` repository. Framework preset Next.js, root `.`, build command `pnpm build`, install `pnpm install`. Node 22.
2. Environment variables (Production, and Preview if previews stay on):

| name | value | scope |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | the project URL | public |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | publishable key | public |
| `SUPABASE_SECRET_KEY` | secret key | server only (asset streaming, purge, seed) |
| `CRON_SECRET` | `openssl rand -hex 32` | server only; Vercel sends it as `Authorization: Bearer` on cron calls |
| `RESEND_API_KEY` | leave unset | invites stay copy-link until a domain is verified |

   `SUPABASE_DB_URL` is **not** set on Vercel; it is only for the seed script and the local tests.
3. Settings → Deployment Protection: confirm **Vercel Authentication** is on for Preview deployments (default on Hobby). Previews count as public otherwise (owner's rule). Simplest: Settings → Git → turn off automatic preview deployments for branches and deploy only `main`.
4. Cron: `vercel.json` in the repo schedules `GET /api/cron/purge` at 03:00 UTC daily. After the first deploy, Settings → Cron Jobs shows it; press **Run** once and expect a JSON body with `boards`, `groups`, `items`, `storage_cleared`. Hobby runs crons once a day with up to an hour of drift, which is fine for a 30-day trash.
5. First deploy: push `main` (or Deploy from the dashboard). Then set the Site URL in step 2.1 to the production URL Vercel shows, if you guessed wrong.

## 4. First real admin account (no demo seed)

Do **not** run `pnpm seed` against the hosted project; it creates three `@example.com` users with a shared password.

1. Open `https://<project>.vercel.app/signup`, sign up with your real email, confirm from the mail. If the mail does not arrive within the hourly limit, Authentication → Users → Add user with **Auto Confirm**, then log in.
2. The first screen is onboarding: name the workspace. You are its owner.
3. Invite the team from Members with the copy-link flow (invites are owner or admin only). Each person signs up through the link and lands in the workspace.
4. Settings → Profile: set your time zone; Workspace: set the workspace time zone (automations and recurring items use it).
5. Optional smoke test after the first login: create a board from a template, add an automation, upload a file, check Activity shows the changes, Export board (CSV) downloads.

## 5. Checks before telling the team

- [ ] `https://<project>.vercel.app/login` loads over HTTPS with no console errors.
- [ ] Signup confirmation mail arrives and the link returns to the app (redirect URL list is right).
- [ ] A file upload works (storage policies) and a profile photo shows (public bucket).
- [ ] Two browsers see each other's edits live (realtime triggers).
- [ ] `select * from automation_runs order by started_at desc limit 5;` fills in once a date or recurring automation is due (pg_cron tick).
- [ ] Cron Jobs → Run on the purge job returns 200.
- [ ] Preview deployments ask for a Vercel login, or are off.
- [ ] `.env.local` was never committed: `git log --all -- .env.local` prints nothing.

## Rollback and routine

- Schema: migrations are forward only; to undo, write a new migration. Keep `supabase db dump --linked --data-only` before any risky one.
- Backups: Supabase Free keeps no automatic backups. Weekly: `supabase db dump --linked -f backups/$(date +%F).sql` locally, plus Settings → Export all boards for a CSV copy anyone can read.
- Pause: if nobody uses it for a week the database pauses; the first visit after that shows errors until it is restored from the dashboard (one click, a minute or two).

## Not done on purpose

Custom domain, Resend SMTP and invite email, Google OAuth, pricing, help form, lapsed-plan policy, trademark work (D-015, D-025).
