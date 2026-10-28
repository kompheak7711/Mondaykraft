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
| F14-H1 | mobile | shell works at 390px with the drawer; the table is a card list | automated, pass (e2e/offline.spec.ts) |
| F02-H2 | groups | duplicate a group: copy has the same items; trash the copy | automated, pass (e2e/board.spec.ts) |
| F03-E2 | keyboard | Tab and Shift+Tab walk the cells of a row | automated, pass (e2e/board.spec.ts) |
| F05-H2 | bulk | export the selected rows as CSV: header, one line per row, file name | automated, pass (e2e/board.spec.ts) |
| F07-H2 | views | reorder the views bar by keyboard; order survives a reload | automated, pass (e2e/views.spec.ts) |
| F07-H3 | views | board search is saved on the view and cleared again | automated, pass (e2e/views.spec.ts) |
| F07-H4 | views | chart view: stacked bars by a second column, axe clean, survives a reload | automated, pass (e2e/views.spec.ts) |
| F14-H2 | profile | upload a photo, see it, remove it | automated, pass (e2e/settings.spec.ts) |
| F05-H3 | board menu | export the whole board as CSV: Item, Group, Parent, then columns; subitems under their parent | automated, pass (e2e/fixes.spec.ts) |
| F14-H3 | settings | export every board in the workspace as a zip of CSV files | automated, pass (e2e/fixes.spec.ts) |
| F03-H5 | columns | wrap text per column: rows grow, setting survives a reload, can be switched off | automated, pass (e2e/fixes.spec.ts) |
| F07-H5 | views | hide a view: editors still see it greyed, a viewer in a second browser does not; show it again | automated, pass (e2e/fixes.spec.ts) |
| F08-H2 | automations | recurring starter: trigger, weekday, month day and time fields, plain-words description, remove | automated, pass (e2e/fixes.spec.ts) |
| F08-D1 | automations | recurring trigger fires once per local day from the cron tick, never twice, rejects a bad period | automated, pass (tests/db.test.ts) |
| F10-H2 | activity | revert the newest cell change from the activity log; the revert is itself logged | automated, pass (e2e/fixes.spec.ts) |
| F15-H1 | board menu | duplicate with items, archive, trash | duplicate by hand; archive/trash (m) |
| A11y | all | axe serious/critical = 0 on login, home, board, kanban, item panel, my work, notifications, inbox, members, trash, settings | automated, pass |

Edge cases now automated: two tabs on one cell (held cell waits), offline edits (queued and synced), the 2,000-row board. Still open (to check): time zones around midnight for date automations, screen reader pass on the table grid, upload retry after a real network failure (the Retry button is exercised only by code review).

Run: `pnpm seed` once, then `pnpm exec playwright test`.

Round two additions: e2e/collab.spec.ts (two-browser live edits, held cell, viewer locked, non-member private board, 2,000-item board), e2e/drag.spec.ts (rows and groups, columns, widgets by keyboard), e2e/offline.spec.ts (offline edit queued and synced, phone card list), e2e/settings.spec.ts (shortcuts, workspace rename), e2e/members.spec.ts (members panel with roles and crown, activity log, file upload and removal); Vitest tests/*.test.ts: 12 unit and database tests. Last full run: 33 passed, 0 skipped.

Round three additions: e2e/views.spec.ts (views bar reorder, saved search, stacked chart), three cases in e2e/board.spec.ts (duplicate group, Tab order, CSV export), one in e2e/settings.spec.ts (profile photo); tests/csv.test.ts (CSV quoting).

Round four additions: e2e/fixes.spec.ts (whole-board CSV, workspace zip, wrap text, hide view, recurring starter, revert from activity); tests/export.test.ts (board CSV shape, zip signatures and CRC); one database case in tests/db.test.ts (recurring tick). Last full run: 46 passed, 0 skipped; Vitest 18 of 18.
