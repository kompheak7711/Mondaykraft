# Parity: Taskraft Management against the original

Date 2026-10-28, after round two. Feature parity from `python3 parity.py replica/features.csv` (must 3, should 2, could 1; partial counts half; skip rows and our own additions are not scored).

**Feature score: 90.3 / 100 (was 83.1). Must-haves done: 99 of 107 (was 87). Verdict: not shippable yet** by the rule that every must-have has to be done: 8 must-haves are still partial. No open S1 or S2 bugs; B-001 to B-007 are fixed.

Layout score: not measured. No screenshots of the original were saved (D-002: public sources only, nothing of theirs in the repo), so `imgdiff.py` has nothing to compare against. The clone's own screenshots are in `replica/clone-screens/` for a later side-by-side from the owner's own account.

## What round two closed
Drag and drop for rows, groups, columns and widgets; offline queue with a connection badge; the card list under 768 px; the service worker and offline page; keyboard shortcuts; workspace rename and trash; board members panel with owner crowns; board activity log; upload progress ring with retry; and the storage policy bug (B-007) that had blocked every upload.

## The 8 must-haves still partial, in build order
1. Saved views: drag to reorder the views bar (menu order works through position).
2. Per-view search and person filter saved with the view (today they last for the session).
3. Chart view: stacked bars.
4. Duplicate a group (board duplicate and item duplicate exist).
5. Tab order inside the grid as a roving tabindex (arrows, Enter and Escape work; Tab follows DOM order).
6. Avatar upload on the profile.
7. Export from the bulk bar (CSV at least; the full export was declared out of scope).
8. Invite emails: gated on a verified sending domain (D-015); the copy-link flow stands in.

## Behaviour differences worth keeping
- Positions are assigned by the server (numeric midpoints), so two people dragging at once never collide.
- Automations run inside the database with a loop guard; a broken recipe never blocks an edit, it shows up in Run history.
- Edits made offline stay on screen and replay in order on reconnect; the badge says how many are waiting.
- Invites are links you copy, not emails, until a sending domain exists (D-015).
- Timeline, Gantt, automations and multi-board dashboards are free at every tier.

## Top five to build next
1. The four small view and group gaps above (1 to 4): each is under an hour and lifts must-haves to 103 of 107.
2. Roving tabindex in the grid and avatar upload.
3. Resend email for invites and notification digests once the domain is verified.
4. My Work views and hide-boards, subitem roll-ups, command palette (the weakest areas by score).
5. Persist the offline queue in IndexedDB so edits survive a reload while offline.


features 90.3  (130 counted, must-haves 99 of 107 done)

Not shippable yet: 8 must-have features are not done.

## By area, weakest first
- my work                       37.5  (4 features)
- subitems                      50.0  (3 features)
- search                        60.0  (2 features)
- settings                      68.8  (3 features)
- dashboards                    82.6  (9 features)
- groups                        83.3  (3 features)
- editing                       83.3  (3 features)
- workspace                     84.1  (8 features)
- notifications                 85.7  (5 features)
- auth                          87.5  (3 features)
- views                         87.5  (12 features)
- item panel                    92.0  (10 features)
- items                         93.5  (8 features)
- automations                   97.7  (16 features)
- boards                       100.0  (9 features)
- permissions                  100.0  (4 features)
- columns                      100.0  (20 features)
- realtime                     100.0  (5 features)
- mobile                       100.0  (2 features)
- trash                        100.0  (1 features)

## Missing, in build order
- [must] editing: Keyboard navigation in the table arrows tab enter escape, partial  (arrows, Enter, Escape; Tab follows DOM order)
- [must] groups: Add rename recolor duplicate move archive delete a group, partial  (no duplicate group yet)
- [must] items: Multi-select with a bulk action bar duplicate move archive delete export, partial  (no export (out of scope))
- [must] settings: Profile name avatar timezone, partial  (name, title, time zone; avatar upload pending)
- [must] views: Chart view bar stacked line pie by column with count sum avg, partial  (bar, line, pie; stacked bars pending)
- [must] views: Filter sort search hide group-by saved per view, partial  (search and person filter are per session)
- [must] views: Saved views add rename duplicate set default delete reorder, partial  (no drag reorder)
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
