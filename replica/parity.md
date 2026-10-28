# Parity: Taskraft Management against the original

Date 2026-10-28, after round three. Feature parity from `python3 parity.py replica/features.csv` (must 3, should 2, could 1; partial counts half; skip rows and our own additions are not scored).

**Feature score: 93.2 / 100 (round two 90.3, round one 83.1). Must-haves done: 106 of 107. Verdict: not shippable by the skill's rule**, because one must-have is still partial: invite emails. That one is gated by the owner (D-015) on a verified sending domain, and the copy-link invite flow stands in. No open bugs at any severity; B-001 to B-008 are fixed.

Layout score: not measured. No screenshots of the original were saved (D-002: public sources only, nothing of theirs in the repo), so `imgdiff.py` has nothing to compare against. The clone's own screenshots are in `replica/clone-screens/` for a later side-by-side from the owner's own account.

## What round three closed
Views bar reorder by drag or keyboard; search and person filter saved per view; stacked bars in the chart view; duplicate group; Tab and Shift+Tab across the grid; profile photo upload; Export CSV from the bulk bar. One bug found and fixed on the way (B-008: copies fired automations).

## The 1 must-have still partial
1. Invite emails: gated on a verified sending domain (D-015); the copy-link flow stands in. When the domain exists: Resend, one template, the same token link the copy flow uses today.

## Should-haves and could-haves still open, in build order
1. My Work: views by date, status, priority and board; hide boards (weakest area, 37.5).
2. Subitems: roll-up summary on the parent (numbers, dates, status, tags); convert item to subitem and back.
3. Search: command palette (the search page and ⌘K exist; the palette with actions does not).
4. Dashboards: filters; main versus private toggle in the UI; table widget.
5. Workspace: favourites star; pending invites resend (needs email); notification preferences applied when notifying; mute a board.
6. Google login keys (wired, not configured); offline queue in IndexedDB; purge for trashed workspaces.

## Behaviour differences worth keeping
- Positions are assigned by the server (numeric midpoints), so two people dragging at once never collide.
- Automations run inside the database with a loop guard; a broken recipe never blocks an edit, it shows up in Run history. Copies (duplicate group, duplicate board) run silent: no automations, no notifications.
- Search and the person filter are saved on the view for editors, so a view opened tomorrow looks the way it was left; viewers keep their own for the session.
- Tab in the grid behaves like a spreadsheet (next cell, wrap to the next row) rather than stepping through every control.
- Edits made offline stay on screen and replay in order on reconnect; the badge says how many are waiting.
- Invites are links you copy, not emails, until a sending domain exists (D-015).
- Timeline, Gantt, automations and multi-board dashboards are free at every tier.

## Top five to build next
1. Invite email through Resend the day the domain is verified: closes the last must-have.
2. My Work views and hide boards.
3. Subitem roll-ups on the parent row.
4. Command palette over the existing search RPC.
5. Dashboard filters and the main/private toggle.

Then the fixes from `/replica-entrepreneur`.
Parity: 93.2 / 100

features 93.2  (130 counted, must-haves 106 of 107 done)

Not shippable yet: 1 must-have features are not done.

By area, weakest first
- my work                       37.5  (4 features)
- subitems                      50.0  (3 features)
- search                        60.0  (2 features)
- dashboards                    82.6  (9 features)
- workspace                     84.1  (8 features)
- notifications                 85.7  (5 features)
- auth                          87.5  (3 features)
- settings                      87.5  (3 features)
- item panel                    92.0  (10 features)
- automations                   97.7  (16 features)
- boards                       100.0  (9 features)
- permissions                  100.0  (4 features)
- groups                       100.0  (3 features)
- items                        100.0  (8 features)
- columns                      100.0  (20 features)
- editing                      100.0  (3 features)
- views                        100.0  (12 features)
- realtime                     100.0  (5 features)
- mobile                       100.0  (2 features)
- trash                        100.0  (1 features)

Missing, in build order
- [must] workspace: Invite teammates by email with a role, partial  (invite created and link copied by hand; no email yet (D-015))
- [should] dashboards: Dashboard filters, no
- [should] my work: Hide boards from My Work, no
- [should] my work: My Work views by date status priority board, no
- [should] notifications: Mute a board, no
- [should] search: Command palette, no
- [should] subitems: Subitem roll-up summary on the parent, no  (numbers date status tags)
- [should] auth: Log in with Google, partial  (button and callback wired; provider keys not configured)
- [should] dashboards: Main vs private dashboards, partial  (kind stored and enforced; toggle in the UI pending)
- [should] settings: Notification preferences, partial  (saved on the profile; not yet applied when notifying)
- [should] workspace: Favorites section, partial  (sidebar section; star toggle UI pending)
- [should] workspace: Pending invites list with resend and remove, partial  (list and withdraw; resend = share the link again)
- [could] automations: Cross-board automations, no
- [could] dashboards: Table widget, no
- [could] item panel: Checklists inside updates, no
- [could] item panel: GIF picker in updates, no  (external service; skip unless free and keyless)
- [could] my work: Add an item from My Work, no
- [could] subitems: Convert subitem to item and item to subitem, no

Left out on purpose (not scored)
- Email notifications and digests: out of scope v1 and needs an email service
- Share a view publicly or embed it: out of scope v1
- Export to Excel or PDF: out of scope v1
- Formula column: out of scope v1
- Time tracking column: out of scope v1
- Connect boards mirror and dependency columns: out of scope v1
- Location country world clock phone email hour week vote rating color picker button auto number columns: not needed by a small team in v1
- Column permissions: enterprise feature
- Guest accounts: out of scope v1
- Forms: out of scope v1
- WorkDocs: out of scope v1
- monday AI and AI columns: out of scope v1
- CRM dev service and campaigns products: out of scope v1
- Integrations marketplace and partner apps: their partner network is not part of the product you can rebuild
- Slack Gmail GitHub and other integrations: out of scope v1
- Billing and plans: v1 is free-tier only
- Native iOS and Android apps: PWA instead
- SSO audit log DLP HIPAA and account permission matrices: enterprise only
- Workload capacity schedules and work weeks: simple per-person count in v1
- Their templates illustrations palette wordmark and marketing copy: never copied; we make our own

Yours, not in the original (not scored)
- Loop guard so automations cannot trigger each other endlessly
- Seed script with a demo workspace three boards automations and a dashboard
