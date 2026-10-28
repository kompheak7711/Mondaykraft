# Test plan: Taskraft Management

Flows from `replica/recon.md`. Automated cases live in `e2e/*.spec.ts` (Playwright, Chromium, against `pnpm dev` with `pnpm seed` data; every spec fails on console errors and 5xx responses and runs an axe scan at WCAG 2 A/AA, serious and critical). Cases marked (m) are manual.

| case | flow | what | status |
| --- | --- | --- | --- |
| F01-H1 | sign in | email + password lands on the workspace home | automated, pass |
| F01-N1 | sign in | wrong password shows a plain message | automated, pass |
| F01-E1 | sign in | signed-out visit to /my-work goes to login and back | automated, pass |
| F01-E2 | sign up | invite link after login joins the workspace and sets it current | (m) passed by hand 2026-10-28 |
| F01-E3 | sign up | email already registered | (m) covered by the Supabase error map |
| F02-H1 | board | create a board from a template, groups and columns appear | (m) passed by hand (Launch plan, Project tracker) |
| F02-E1 | board | label in use cannot be removed without moving items | (m) enforced by the column validator (smoke test) |
| F03-H1 | cells | add an item, set a status, survives a reload | automated, pass |
| F03-N1 | cells | a non-number is rejected and the cell keeps its value | automated, pass |
| F03-E1 | cells | remote change arrives while editing: the draft is kept | (m) editing registry; covered by code review, not yet by a two-tab test |
| F04-H1 | reorder | move rows with the server-side move_rows | smoke test (SQL) |
| F05-H1 | bulk | select, delete, undo from the toast | (m) and F13-H1 |
| F06-H1 | updates | post with an @mention, card shows the mention | automated, pass |
| F06-E1 | updates | mentioned user gets a bell notification | smoke test (SQL) |
| F07-H1 | views | switch to Kanban and back to the table | automated, pass |
| F08-H1 | automations | status Done moves the item; run history shows ok | automated, pass |
| F08-E1 | automations | two recipes that flip each other stop at depth 5 | smoke test (SQL) |
| F09-H1 | dashboards | connect a board, add a battery and a chart widget | (m) passed by hand |
| F10-H1 | my work | assigned items appear bucketed by date | automated render; data by hand |
| F11-H1 | invites | owner creates an invite link | automated, pass |
| F11-N1 | invites | viewer cannot post updates, non-member sees nothing | smoke test (SQL, RLS) |
| F12-H1 | search | finds a seeded item | automated, pass |
| F12-E1 | search | no hits says so | automated, pass |
| F13-H1 | trash | delete an item, restore it from the trash | automated, pass |
| F14-H1 | mobile | shell works at 390px with the drawer | (m) to check: table card layout pending |
| F15-H1 | board menu | duplicate with items, archive, trash | duplicate by hand; archive/trash (m) |
| A11y | all | axe serious/critical = 0 on login, home, board, kanban, item panel, my work, notifications, inbox, members, trash, settings | automated, pass |

Edge cases still open (to check, not yet reproduced as bugs): two tabs editing the same cell, offline edits, 2,000-row boards, time zones around midnight for date automations, screen reader pass on the table grid.

Run: `pnpm seed` once, then `pnpm exec playwright test`.

Round two additions (e2e/collab.spec.ts, tests/*.test.ts): two-browser live edits (fixme, B-004), held cell while typing (pass), viewer locked (pass), non-member private board (pass), 2,000-item board (fixme in suite, passes alone); Vitest: 12 unit and database tests (pass).
