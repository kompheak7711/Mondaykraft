# Parity: Taskraft Management against the original

Date 2026-10-28. Feature parity from `python3 parity.py replica/features.csv` (must 3, should 2, could 1; partial counts half; skip rows and our own additions are not scored).

**Feature score: 83.1 / 100. Must-haves done: 87 of 107. Verdict: not shippable yet** (20 must-haves are partial or missing; no open S1 or S2 bugs, one open S3).

Layout score: not measured. No screenshots of the original were saved (D-002: public sources only, nothing of theirs in the repo), so `imgdiff.py` has nothing to compare against. The clone's own screenshots are in `replica/clone-screens/` (S03, S06, S08, S11, S14, S16) for a later side-by-side from the owner's own account.

## Behaviour differences worth keeping
- Positions are assigned by the server (numeric midpoints), so two people dragging at once never collide.
- Automations run inside the database with a loop guard; a broken recipe never blocks an edit, it shows up in Run history.
- Invites are links you copy, not emails, until a sending domain exists (D-015).
- Timeline, Gantt, automations and multi-board dashboards are free at every tier.

## Top five to build next
1. Drag and drop for rows, groups, columns and widgets (dnd-kit on `move_rows`, which already exists).
2. Service worker, offline queue and the card layout for the table under 768 px.
3. Keyboard shortcuts and Tab order inside the grid; workspace rename and trash in settings.
4. Board members panel with owner crowns, and the file column's progress ring and retry.
5. Invite emails through Resend once the domain is verified, and per-view search and person filter.

## Parity: 83.1 / 100

features 83.1  (130 counted, must-haves 87 of 107 done)

Not shippable yet: 20 must-have features are not done.

## By area, weakest first
- my work                       37.5  (4 features)
- subitems                      50.0  (3 features)
- editing                       50.0  (3 features)
- mobile                        50.0  (2 features)
- search                        60.0  (2 features)
- groups                        66.7  (3 features)
- settings                      68.8  (3 features)
- workspace                     70.5  (8 features)
- items                         73.9  (8 features)
- dashboards                    76.1  (9 features)
- realtime                      80.0  (5 features)
- notifications                 85.7  (5 features)
- boards                        86.0  (9 features)
- auth                          87.5  (3 features)
- views                         87.5  (12 features)
- item panel                    92.0  (10 features)
- columns                       95.0  (20 features)
- automations                   97.7  (16 features)
- permissions                  100.0  (4 features)
- trash                        100.0  (1 features)

## Missing, in build order
- [must] editing: Keyboard shortcuts for common actions, no  (shortcut sheet in settings)
- [must] items: Reorder items by drag-and-drop, no  (server-side move_rows ready; drag pending)
- [must] realtime: Offline indicator with queued edits and resync, no
- [must] workspace: Rename and delete a workspace, no  (workspace settings pending)
- [must] boards: Board members with owner crown, partial  (roles in DB; members panel pending)
- [must] columns: Files column with upload progress and retry, partial  (upload and list; progress ring and retry pending)
- [must] columns: Rename resize reorder duplicate delete a column, partial  (reorder via menu; drag pending)
- [must] dashboards: Resize and reorder widgets, partial  (size steps from the widget settings; drag to reorder pending)
- [must] editing: Keyboard navigation in the table arrows tab enter escape, partial  (arrows, Enter, Escape; Tab follows DOM order)
- [must] groups: Add rename recolor duplicate move archive delete a group, partial  (no duplicate group yet)
- [must] groups: Reorder groups by drag-and-drop, partial  (menu move up/down; drag pending)
- [must] items: Move items between groups by drag-and-drop, partial  (bulk bar move to group; drag pending)
- [must] items: Multi-select with a bulk action bar duplicate move archive delete export, partial  (no export (out of scope))
- [must] mobile: Installable PWA with manifest and service worker, partial  (manifest and icon; service worker and offline queue pending)
- [must] mobile: Responsive layout with card list on small screens, partial  (shell and pages adapt; the table card layout is pending)
- [must] settings: Profile name avatar timezone, partial  (name, title, time zone; avatar upload pending)
- [must] views: Chart view bar stacked line pie by column with count sum avg, partial  (bar, line, pie; stacked bars pending)
- [must] views: Filter sort search hide group-by saved per view, partial  (search and person filter are per session)
- [must] views: Saved views add rename duplicate set default delete reorder, partial  (no drag reorder)
- [must] workspace: Invite teammates by email with a role, partial  (invite created and link copied by hand; no email yet (D-015))
- [should] boards: Board activity log, no
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

## Left out on purpose (not scored)
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

## Yours, not in the original (not scored)
- Loop guard so automations cannot trigger each other endlessly
- Seed script with a demo workspace three boards automations and a dashboard
