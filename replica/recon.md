# Recon map: monday.com work management (web, plus iPhone/iPad as a PWA)

Scope: boards, groups, items, subitems, column types, views, inline editing, real-time collaboration, item updates, notifications, My Work, automations, dashboards, board permissions, search, templates.
For: a small team working together in real time; a clean-room rebuild of the features and flows, with our own name, design, words and code.
Date: 2026-10-27

Clean-room notes. Everything below comes from public pages: the help center, the pricing page, the public API reference, the App Store listing and public tutorial videos linked from the help center. No account was used, nothing was logged into, no JavaScript bundle was read, no network traffic was captured. The help center returns HTTP 403 to plain HTTP clients; pages were read one at a time through a reader service, not crawled. No screenshots were saved; `replica/screens/` is empty and git-ignored. The help-center images referenced below are theirs and are never copied into the clone.

## Sources

| # | source | URL | notes |
| --- | --- | --- | --- |
| 1 | help center: column types index | https://support.monday.com/hc/en-us/articles/115005310285-Available-column-types-on-monday-com | essential / power-up / combo groupings |
| 2 | help center: Board elements section | https://support.monday.com/hc/en-us/sections/12052553955474-Board-elements | links to every column article, subitems, data validations, column templates, undo |
| 3 | help center: Status column | https://support.monday.com/hc/en-us/articles/360001269685-The-Status-column | custom labels and colors |
| 4 | help center: People column | https://support.monday.com/hc/en-us/articles/360002281539-The-People-Column | assign people and teams |
| 5 | help center: Numbers column | https://support.monday.com/hc/en-us/articles/115005310565-The-Numbers-Column | unit, format, footer sum/avg/min/max/median/count |
| 6 | help center: Date column | https://support.monday.com/hc/en-us/articles/360000317520-The-Date-Column | date + optional time, deadline mode with a status column |
| 7 | help center: Timeline column | https://support.monday.com/hc/en-us/articles/115005333969-The-Timeline-Column | start/end range, battery-style fill, hide weekends, first day of week |
| 8 | help center: Dropdown column | https://support.monday.com/hc/en-us/articles/360004162179-The-Dropdown-Column | multi-select labels |
| 9 | help center: Link column | https://support.monday.com/hc/en-us/articles/360001139125-The-Link-Column | url + display text |
| 10 | help center: Board views | https://support.monday.com/hc/en-us/articles/360001267945-The-board-views | view list, 100 views per board, hide main table, set default, export |
| 11 | help center: Kanban view | https://support.monday.com/hc/en-us/articles/360000661379-The-Kanban-View | pick the status column, choose card columns (incl. subitem columns), sort |
| 12 | help center: Gantt view and widget | https://support.monday.com/hc/en-us/articles/360015643840-The-Gantt-Chart-View-and-Widget | zoom days/weeks/months/quarters/years, today line, colors from board, PDF export |
| 13 | help center: Timeline view/widget | https://support.monday.com/hc/en-us/articles/360017206280-The-Timeline-Widget | bars across a calendar, today line |
| 14 | help center: Calendar view/widget | https://support.monday.com/hc/en-us/articles/360001262965-The-Calendar-Widget | day/week/month, today highlighted, item card on click |
| 15 | help center: Chart view/widget | https://support.monday.com/hc/en-us/articles/360001262665-The-Chart-Widget | chart gallery, group dates, split mode |
| 16 | help center: Board filters | https://support.monday.com/hc/en-us/articles/360003624660-The-Board-Filters | search bar, person filter, quick filter, advanced filter, automatic filtering, hide columns |
| 17 | help center: Group by | https://support.monday.com/hc/en-us/articles/4452237638546-Group-your-board-by-anything | supported columns for group-by |
| 18 | help center: Automations start | https://support.monday.com/hc/en-us/articles/360001222900-Get-started-with-monday-automations | trigger / condition / action vocabulary |
| 19 | help center: Custom automation builder | https://support.monday.com/hc/en-us/articles/360012254440-Build-your-own-custom-automation | sentence builder, "only if" conditions, notify text, save as template, action counting |
| 20 | help center: Managing board automations | https://support.monday.com/hc/en-us/articles/15485449493394-Managing-your-board-Automations | edit, duplicate, turn off, delete |
| 21 | help center: Status change automations | https://support.monday.com/hc/en-us/articles/360011528299-Status-change-automations | which columns status-change recipes can set |
| 22 | help center: Dashboards | https://support.monday.com/hc/en-us/articles/360002187819-The-Dashboards | connect boards (1 / 5 / 20 / 50 per plan), 30 widgets, 20,000 items, quick + advanced filters, main vs private |
| 23 | help center: Dashboards section | https://support.monday.com/hc/en-us/sections/360000754119-Dashboards | configure, filters, share/present |
| 24 | help center: My Work | https://support.monday.com/hc/en-us/articles/360019300579-My-Work | needs a status + date column; views by date/status/priority/board/single list; hide boards; add item |
| 25 | help center: Bell notifications | https://support.monday.com/hc/en-us/articles/360015535060-Bell-Notifications | event list, tabs, person filter, search, mark read, mute board |
| 26 | help center: Update feed (Inbox) | https://support.monday.com/hc/en-us/articles/115005309885-The-Update-Feed-Inbox | all updates from followed boards in one feed |
| 27 | help center: Updates section | https://support.monday.com/hc/en-us/articles/115005900249-The-Updates-Section | rich text, @mentions, files, GIFs, emoji, checklists, replies, reactions, pin |
| 28 | help center: Activity log | https://support.monday.com/hc/en-us/articles/115005310745-The-Activity-Log | board / item / subitem logs, automation and permission changes, export |
| 29 | help center: Subitems | https://support.monday.com/hc/en-us/articles/360011905480-All-about-subitems | own column set, roll-up "show summary on parent", move, convert |
| 30 | help center: Board permissions | https://support.monday.com/hc/en-us/articles/115005315809-Board-permissions | four permission sets, owners bypass, crown icon |
| 31 | help center: Permissions overview | https://support.monday.com/hc/en-us/articles/360019222479-Permissions-on-monday-com | board types, dashboard main/private, workspace open/closed |
| 32 | help center: Workspaces | https://support.monday.com/hc/en-us/articles/360010785460-Getting-started-with-workspaces | account > workspace > folder > board/dashboard; sidebar, favorites, search |
| 33 | help center: Folders | https://support.monday.com/hc/en-us/articles/115005316845-Folders | folders and sub-folders in the sidebar |
| 34 | help center: Templates | https://support.monday.com/hc/en-us/articles/360001362625-monday-com-templates | template center, use template into a workspace |
| 35 | help center: Share a view publicly | https://support.monday.com/hc/en-us/articles/360009695080-How-to-share-a-board-view-publicly | out of scope, listed for completeness |
| 36 | help center: Mobile board views | https://support.monday.com/hc/en-us/articles/360015740220-Mobile-app-board-views | what survives on a phone: table, calendar, kanban, battery; no Gantt/Chart |
| 37 | help center: Undo | https://support.monday.com/hc/en-us/articles/360011810600-How-to-undo-something | undo after delete, trash/restore |
| 38 | pricing page | https://monday.com/pricing | what is gated: Timeline & Gantt (Standard), automations and integrations action quotas, dashboards combining boards, private boards / time tracking / formula (Pro) |
| 39 | public API reference: column types | https://developer.monday.com/api-reference/reference/column-types-reference | the data model almost for free: every column type and its value shape |
| 40 | App Store listing | https://apps.apple.com/us/app/monday-com-work-platform/id1290128888 | pitch: real-time updates, @mention, big picture, quick setup; 4.8 from 48K ratings |
| 41 | public tutorial videos (monday.com YouTube channel, linked from the articles) | Kanban https://www.youtube.com/watch?v=_GPq2t2hHlo ; My Work https://www.youtube.com/watch?v=vSsBjt9di5o ; Timeline https://www.youtube.com/watch?v=9ftpgmJluqo ; Filters https://www.youtube.com/watch?v=shiga7VjjOQ ; Group by https://www.youtube.com/watch?v=XIO_VpC_dXE ; Activity log https://www.youtube.com/watch?v=mWZjpip1jJw | real flows, click by click |

## Core loop

A team keeps its work as rows (items) inside colored groups on a board. Everyone edits cells inline, sees each other's changes live, talks inside the item's Updates, and views, automations and dashboards all run off the same cells.

## Screens

| ID | screen | route / how to reach | purpose | key components | states seen |
| --- | --- | --- | --- | --- | --- |
| S01 | Sign up / Log in | `/login`, `/signup`, invite link | get into a workspace | email + password form, Google button, invite acceptance | empty, loading, error (bad password, used email, expired invite) |
| S02 | Workspace shell (left sidebar + top bar) | `/` and every page | navigate | workspace switcher, Home, My Work, Inbox, bell, search, favorites, folder tree, "+ Add" (board / dashboard / folder), profile menu | loading skeleton, empty workspace, collapsed sidebar, mobile drawer |
| S03 | Board: Main table | `/boards/:id` | the core loop | board header (name, description, members avatars, Activity, Automate, more menu), views bar, toolbar (New item, Search, Person, Filter, Sort, Hide, Group by), groups, rows, cells, column footers, add-item row, add group, "+" add column | loading skeleton, empty board, filtered-empty, no permission, offline, read-only (viewer), 2,000+ rows |
| S04 | Column center (add column) | "+" at the end of the header row | pick a column type | searchable list grouped essential / more / combo | default, search-empty |
| S05 | Column settings | column header menu | rename, edit labels and colors, set unit/format, defaults, width, duplicate, delete, change type | label editor (add / rename / recolor / reorder / delete label with "move items to" prompt) | default, confirm delete with values |
| S06 | Item card (side panel) | click item name or the chat bubble; `/boards/:id/items/:itemId` | everything about one item | tabs Updates / Files / Activity log; name; all columns editable; subitems; "+ New update" editor; replies; reactions; pin | empty updates, loading, files empty, no permission |
| S07 | Subitems (inline) | chevron at the left of a row | child tasks with their own columns | subitem table, add subitem, subitem column set, roll-up summary on the parent | collapsed, expanded, empty |
| S08 | Kanban view | views bar | work by status lanes | lane per label, cards with chosen columns, drag between lanes, sort, add card | empty lanes, filtered |
| S09 | Calendar view | views bar | work by date | day / week / month grid, item chips, drag to change the date, click opens S06 | empty, no date column (setup prompt) |
| S10 | Timeline / Gantt view | views bar | plan across time | item list left, bars right, zoom days / weeks / months / quarters / years, today line, drag to move / resize bar, color by group or status | empty, no timeline column (setup prompt) |
| S11 | Chart view | views bar | report on the board | chart type (bar, stacked bar, line, pie), x-axis column, y-axis function (count / sum / avg / min / max), group dates by day / week / month, filter | empty, too many categories |
| S12 | Filter panel | toolbar Filter | narrow the board | quick filters per column, advanced rules (and / or, operator per column type), person filter, "Filtered" chip, Save as new view, clear | no filter, active, zero results |
| S13 | Views bar | under the board name | switch / manage views | "+ Add view", tabs, rename, duplicate, set as default, delete, reorder | one view, many views (overflow menu) |
| S14 | Automations center | board header Automate; `/boards/:id/automations` | manage recipes | tabs Create (template gallery by category + Custom) / Manage (list with on-off, run count, edit, duplicate, delete) / Run history | empty, list, failed run |
| S15 | Custom automation builder | S14 Create > Custom | compose a rule | sentence "When [trigger] and only if [condition] then [action]", field pickers, "+ add action", notify message editor, Create automation | incomplete (disabled button), ready |
| S16 | Dashboard | `/dashboards/:id` | see across boards | widget grid, Add widget, Connect boards picker, Filter, main / private, present / fullscreen | empty (no boards), empty (no widgets), loading, no permission |
| S17 | Widget settings | widget menu | configure a widget | boards / groups / columns pickers, function, chart type, split by | default |
| S18 | My Work | `/my-work` | everything assigned to me | groups Past dates / Today / This week / Next week / Later / Without a date; views by date / status / priority / board / single list; hide boards; add item; show done toggle | empty, loading |
| S19 | Notifications (bell) | bell icon | what needs me | tabs All / Unread / I was mentioned / Assigned to me, person filter, search, mark read, mute board, settings | empty, unread badge |
| S20 | Inbox (update feed) | sidebar Inbox; `/inbox` | all conversation in one feed | update cards from followed boards, reply inline, filter | empty, loading |
| S21 | Global search | top bar search; `/search?q=` | find anything | results grouped boards / items / updates / people; recent | empty query, no results |
| S22 | Board permissions | board more menu > Permissions | who can do what | permission set radio (Edit everything / Only edit content / Only edit assigned items / View and comment), owners list with crown | default |
| S23 | Invite teammates | header Invite, workspace Members | bring people in | invite by email with role (member / viewer / admin), pending invites, resend, remove | empty, pending |
| S24 | Templates center | "+ Add board" > From template | start fast | categories, preview (columns, groups, sample rows), Use template into a folder | default |
| S25 | Trash & Archive | sidebar more; `/trash` | recover | boards / groups / items deleted in the last 30 days, Restore, Delete forever; archived boards list | empty, list |
| S26 | Profile & settings | profile menu | personal setup | name, avatar, timezone, theme (light / dark), notification preferences, keyboard shortcuts list | default |
| S27 | Board on a small screen (PWA) | same routes on iPhone / iPad | work from a phone | table collapses to a card list per group, bottom nav (Home, My Work, Notifications, More), item card full screen | offline banner, installed PWA |
| S28 | Board more menu | three dots in the board header | board-level actions | rename, description, change type (main / private), duplicate (structure / with items / with items and updates), archive, delete, export, activity log, permissions | default |
| S29 | Bulk action bar | select 2+ rows | act on many items | count, Duplicate, Move to group / board, Archive, Delete, Export, Convert to subitems, clear | 1 selected, many selected, mixed groups |

## Flows

```
F01 New teammate signs up and lands on a board
    S01 -> S02 -> S24 -> S03
    happy path clicks: 6
    edge: invite link already used, email already registered, template preview, no workspace yet (create first)

F02 Create a board from scratch and shape it
    S02 "+ Add" -> S03 (name, first group and a few columns created) -> S04 add Status / Person / Date -> S05 edit labels and colors
    happy path clicks: 8
    edge: duplicate column names, deleting a column with values, change column type with values

F03 Add items and edit every cell inline
    S03 add-item row -> type name -> Enter -> click a cell -> pick / type -> Enter or click away
    happy path clicks: 2 per cell
    edge: two people edit the same cell, remote change arrives while editing, server rejects the value, offline

F04 Reorder and move things
    S03 drag row handle -> drop in another group; drag group header; drag column header; drag subitem
    happy path clicks: 1 drag
    edge: concurrent reorders (fractional index), a filter or sort is active (drop target hidden), drag on touch

F05 Bulk edit
    S03 select checkboxes -> S29 -> Move to group / Delete / Duplicate / Archive
    happy path clicks: 3
    edge: selection across groups, selection includes items the user cannot edit, undo

F06 Discuss an item and mention a teammate
    S03 chat bubble -> S06 Updates -> write + @mention -> Post -> teammate sees S19 bell and S20 inbox -> Reply -> React
    happy path clicks: 4
    edge: mention someone without board access, edit / delete an update, long thread, file in the update

F07 Switch and save views
    S13 "+ Add view" -> Kanban -> S08 choose status column and card columns -> rename view
    S12 filter -> "Save as new view"
    happy path clicks: 5
    edge: board has no status column, view deleted by someone else, default view hidden for members

F08 Build an automation
    S14 Automate -> Create -> template or Custom -> S15 trigger "When status changes to Done" -> condition -> action "notify / move to group" -> Create automation -> Manage list
    happy path clicks: 7
    edge: trigger column deleted later, automation A changes a status that fires automation B (loop guard), action fails (run history), date trigger at a time zone boundary

F09 Build a dashboard
    S02 "+ Add" dashboard -> S16 Connect boards -> Add widget -> S17 configure Numbers / Chart / Battery / Workload -> resize and reorder
    happy path clicks: 8
    edge: no boards connected, connected board has no status column (battery empty), viewer sees only boards they can access

F10 Check what is on my plate
    S02 My Work -> S18 grouped by date -> open S06 -> set status Done -> item leaves the list
    happy path clicks: 3
    edge: item without a date, several person columns on one board, boards hidden in My Work settings, done items toggle

F11 Invite a teammate and restrict a board
    S23 invite by email with role -> teammate accepts (S01) -> S22 "View and comment" -> viewer can read and post updates only
    happy path clicks: 6
    edge: invite to an unknown email, resend, viewer tries to edit (locked cell), non-member opens the board URL (no-permission screen), owner removes the last owner (blocked)

F12 Find anything
    S21 type "invoice" -> results across boards, items, updates -> open
    happy path clicks: 2
    edge: no results, results the user cannot access are hidden, keyboard navigation

F13 Recover something deleted
    S03 delete -> toast with Undo (seconds) ; later S25 Trash -> Restore (within 30 days)
    happy path clicks: 2
    edge: parent board deleted (items go with it), restore into a deleted group, permanent purge

F14 Work from an iPad
    install PWA -> S27 card list -> open S06 -> edit a cell -> post an update
    happy path clicks: 4
    edge: offline (edits queued, resynced), small-screen table, file upload from the camera roll

F15 Duplicate, archive, delete a board
    S28 Duplicate (structure / with items / with items and updates) -> new board ; Archive -> hidden, restorable ; Delete -> S25
    happy path clicks: 3
    edge: duplicate a board with automations (copy them, turned off), archive a board that feeds a dashboard
```

The number to beat: a new item with a status and an owner is 5 clicks (add row, type, Enter, status, person).

## Components

| component | variants | states | used on |
| --- | --- | --- | --- |
| Button | primary, secondary, ghost, danger, split (New item + menu) | default, hover, focus, disabled, loading | all |
| Icon button | plain, with badge (bell count) | default, hover, active, disabled | S02, S03, S06 |
| Inline cell | one per column type (14 renderers + editors) | view, editing, saving (optimistic), error (rolled back), locked (viewer), remote-changed flash | S03, S06, S07, S18 |
| Status label chip | label list with color, "Done" style, editable labels | default, hover, open picker, editing labels | S03, S05, S06, S08 |
| Person picker | single / multiple avatars, teams | empty (+), filled, open, search-empty | S03, S06, S12, S15 |
| Date picker | date, date + time, today / clear | empty, filled, overdue (red), done (strike) | S03, S06, S09 |
| Timeline range picker | start / end, battery fill of elapsed time | empty, filled, past due | S03, S10 |
| Number cell | unit prefix / suffix, decimals, thousands separator | empty, filled, invalid (rejected) | S03, S05 |
| Column footer summary | sum, avg, median, min, max, count, none | collapsed, shown | S03 |
| Dropdown chips | multi-select, create new option inline | empty, filled, overflow (+n) | S03, S06 |
| Tags chips | workspace-wide tags, create inline | empty, filled | S03 |
| Checkbox cell | - | unchecked, checked, locked | S03 |
| Link cell | url + display text, favicon | empty, filled, invalid url | S03 |
| Files cell | thumbnails, upload progress, retry | empty, uploading, failed, filled | S03, S06 |
| Progress bar | roll-up of status columns | 0%, partial, 100% | S03, S07 |
| Priority chip | label set with colors (Critical / High / Medium / Low) | default | S03, S18 |
| Long text editor | popover with multi-line text | empty, filled, editing | S03 |
| Group header | color dot, collapse chevron, editable title, item count, menu | collapsed, expanded, editing title, dragging | S03 |
| Column header | type icon, title, sort arrow, menu, resize handle, drag | default, sorted, hidden-in-view, dragging | S03 |
| Row | checkbox, drag handle, name cell, chat bubble with count, subitem chevron | default, selected, hover, dragging, read-only, highlighted (remote change) | S03, S07 |
| Add-item row | inline input | empty, typing | S03, S07 |
| Views bar tab | icon + name, active, overflow menu | active, inactive, renaming | S13 |
| Toolbar | New item, Search, Person, Filter, Sort, Hide, Group by | idle, active filter chips | S03, S08-S11 |
| Filter rule row | column, operator, value | incomplete, complete | S12 |
| Side panel | right-docked, full screen on mobile, tabs | open, closed, loading | S06 |
| Rich text editor | toolbar (bold, italic, underline, strike, list, link, checklist), @mention popover, emoji, attach | empty, typing, posting, error | S06, S20 |
| Update card | author, time, body, files, reactions, replies, pin, menu | default, pinned, edited, deleted | S06, S20 |
| Reaction bar | thumbs-up + emoji | none, mine, others | S06 |
| Notification row | icon by type, text, board / item link, time | unread, read | S19 |
| Toast | success, error, with Undo action | visible, hiding | all |
| Modal | confirm delete, invite, column center, template preview | open, loading, error | S04, S23, S24, S28 |
| Popover / menu | context menus everywhere | open, closed | all |
| Avatar stack (presence) | up to 5 + "+n" | live | S03, S16 |
| Skeleton | table, card, dashboard | loading | all |
| Empty state | illustration + one action | per screen | all |
| Kanban lane / card | lane header (label color, count), card (name, chosen columns) | empty lane, dragging card | S08 |
| Calendar grid / chip | month / week / day cells, item chip | today, other month, dragging | S09 |
| Gantt row / bar | bar colored by group / status, resize handles, today line | dragging, resizing | S10 |
| Chart | bar, stacked bar, line, pie (Recharts) | loading, empty | S11, S16 |
| Widget frame | title, menu, resize handle, drag | editing layout, locked | S16 |
| Numbers tile | big number + caption | - | S16 |
| Battery bar | segment per status label with percentage | empty | S16 |
| Workload grid | person x week, capacity dots | - | S16 |
| Sidebar nav | workspace switcher, tree, favorites, collapse | expanded, collapsed, drawer (mobile) | S02 |
| Top bar | search, Inbox, bell, help, profile | - | S02 |
| Command palette | search + actions, keyboard navigation | open | S21 |
| Keyboard shortcut hint | tooltip and shortcuts sheet | - | S26 |
| Bulk action bar | bottom-docked | hidden, visible | S29 |
| Offline banner | top-docked, queued-edit count | offline, resyncing | all |
| Theme toggle | light / dark | - | S26 |

## Inferred data model

```
User            id, email, name, avatar_url, title, timezone, theme
                evidence: S01, S26, People column article
                confidence: high

Workspace       id, name, description, color, created_by, created_at
                evidence: workspaces article (account > workspace > folder > board)
                confidence: high   note: we fold "account" into the workspace; v1 has no account layer

WorkspaceMember workspace_id, user_id, role (owner | admin | member | viewer), joined_at
                evidence: permissions overview, invite flow, "unlimited free viewers" on pricing
                confidence: high

Invite          id, workspace_id, email, role, token, invited_by, created_at, accepted_at
                evidence: S23
                confidence: medium (shape is ours)

Folder          id, workspace_id, parent_folder_id, name, color, position
                evidence: folders article (sub-folders exist)
                confidence: high

Board           id, workspace_id, folder_id, name, description, kind (main | private),
                permission_set (edit_everything | edit_content | edit_assigned | view_comment),
                default_view_id, position, created_by, archived_at, deleted_at
                evidence: S03, S22, S28, board permissions article
                confidence: high

BoardMember     board_id, user_id, role (owner | member | viewer), subscribed, muted
                evidence: owners with crown, "subscribe", mute board notifications
                confidence: high

Group           id, board_id, title, color, position (fractional), archived_at, deleted_at
                evidence: S03
                confidence: high   note: collapsed state is per user, kept client-side

Column          id, board_id, scope (item | subitem), title, type, settings (jsonb),
                width, position, description, created_at
                evidence: column articles, API column types reference, subitems article (subitems have their own column set)
                confidence: high
                settings by type: status/priority {labels:[{id,label,color,is_done}]}, numbers {unit, unit_position, decimals, summary},
                dropdown {options:[{id,label,color}], limit}, date {with_time}, link {}, progress {source_column_ids},
                tags {}, text {}, long_text {}, checkbox {}, files {}, people {max}, timeline {}, creation_log {}, last_updated {}

Item            id, board_id, group_id, parent_item_id (null for top-level, set for subitems),
                name, position (fractional), created_by, created_at, updated_at, archived_at, deleted_at
                evidence: S03, S07, API "subtasks" column
                confidence: high   note: original keeps subitems on a hidden sub-board; we keep one table with parent_item_id

ColumnValue     item_id, column_id, value (jsonb, validated per type), text (denormalized for search and sort),
                updated_by, updated_at
                evidence: API value shapes: status {index,label}; people {persons_and_teams}; timeline {from,to};
                          numbers number; dropdown ids[]; date {date,time}; checkbox {checked}; link {url,text};
                          files [{asset_id,name,url}]; tags ids[]; creation_log / last_updated derived
                confidence: high

View            id, board_id, type (table | kanban | calendar | timeline | chart), name, position, is_default,
                settings (jsonb: filters, sort, hidden_column_ids, group_by, kanban_column_id, card_column_ids,
                          calendar_column_id, timeline_column_id, chart {type, x, y, fn, group_dates}), created_by
                evidence: S08-S13, board views article (100 views per board, hide main table)
                confidence: high

Update          id, item_id, author_id, body (rich text json), parent_update_id (reply), pinned, edited_at, deleted_at, created_at
                evidence: updates section article
                confidence: high
Reaction        update_id, user_id, emoji                                      confidence: high
Mention         update_id, user_id                                             confidence: high

Asset           id, workspace_id, item_id, column_id, update_id, name, size, mime, storage_path, uploaded_by, created_at
                evidence: files column, files tab, files in updates
                confidence: high

Activity        id, board_id, item_id, user_id, kind (cell_changed | item_created | item_moved | item_deleted | column_added | ... ),
                column_id, old_value, new_value, created_at
                evidence: activity log article (who, what, old -> new, when; automation and permission changes included)
                confidence: high

Automation      id, board_id, name, enabled, trigger {type, config}, conditions [{type, config}], actions [{type, config}],
                created_by, run_count, last_run_at
                evidence: automations articles (trigger / condition / action, save as template, manage tab)
                confidence: high
AutomationRun   id, automation_id, item_id, status (ok | failed | skipped), error, started_at
                evidence: run history, "actions used" counting
                confidence: medium

Notification    id, user_id, kind (mention | assigned | reply | subscribed | automation | deleted | archived),
                actor_id, board_id, item_id, update_id, text, read_at, created_at
                evidence: bell notifications article (event list and tabs)
                confidence: high

Dashboard       id, workspace_id, folder_id, name, kind (main | private), created_by, deleted_at
                evidence: dashboards article
                confidence: high
DashboardBoard  dashboard_id, board_id                                         confidence: high
Widget          id, dashboard_id, type (numbers | chart | battery | workload | table), settings (jsonb), layout {x,y,w,h}
                evidence: dashboards article (30 widgets), chart / battery / numbers widget articles
                confidence: high

Template        id, name, category, description, definition (jsonb: columns, groups, sample items, views, automations)
                evidence: templates article; our five templates are our own content
                confidence: medium

Favorite        user_id, object_type, object_id                                confidence: medium
Tag             id, workspace_id, name, color                                  confidence: high (tags are account-wide in the original)
Presence        ephemeral: board_id, user_id, last_seen (realtime channel only, not stored)
                confidence: high
```

Relationships: Workspace 1-n Folder, Workspace 1-n Board, Folder 1-n Board, Board 1-n Group, Board 1-n Column, Group 1-n Item, Item 1-n Item (subitems), Item x Column 1-1 ColumnValue, Board 1-n View, Item 1-n Update, Update 1-n Update (replies), Board 1-n Automation, Automation 1-n AutomationRun, Dashboard n-m Board, Dashboard 1-n Widget, User n-m Workspace, User n-m Board, User 1-n Notification, Board 1-n Activity.

Soft delete everywhere (`deleted_at`), with a 30-day trash and a purge job.

## Feature matrix

See `features.csv`. Must: 109, should: 17, could: 6, skip: 20.

What the original gates behind paid plans tells us what matters most: Timeline and Gantt views, automations (counted in actions per month), dashboards that combine several boards, private boards. All of these are in v1 at no charge, which is a real difference for a small team.

## Out of scope (cannot or should not be cloned)

- Their name, wordmark, logo, illustrations, exact color palette and status-label colors, marketing copy, template content. We write our own.
- Their network: the marketplace and its partner apps, integrations (Slack, Gmail, GitHub, ...), the experts catalog, the community, monday academy.
- Their other products: CRM, dev, service, campaigns, WorkDocs, Forms, workflows builder, monday AI and AI columns.
- Enterprise plumbing: SSO, audit, DLP, HIPAA, account-level role matrices, column permissions, workspace open/closed types.
- Cross-board columns: Connect boards, Mirror, Dependency; the Formula column; Time tracking; Location / Country / World clock / Phone / Email / Hour / Week / Vote / Rating / Color picker / Button / Auto number columns (not needed by a small team in v1).
- Guest accounts, billing and plans, public share links and embeds, export to Excel / PDF, email digests and email notifications, native mobile apps.

## Size

Screens 29, flows 15, entities 25. Hard parts: (1) real-time sync that never clobbers the cell someone is typing in, plus offline queueing; (2) 14 column types, each a module with renderer, editor, validator, filter and summary, inside a 2,000-row virtualized table with drag-and-drop; (3) the automation engine (triggers, conditions, actions, loop guard, run history, date triggers on pg_cron inside free-tier limits); (4) Timeline / Gantt and Calendar views built by hand or on a permissive library; (5) row-level security that matches owner / member / viewer across workspace and board. Size: XL as a single pass; L when phased.

Suggested phasing (the Section 4 build order already follows it):

- Phase A, the core loop (L on its own): auth, workspace shell, board table with groups, items, subitems and all 14 column types, inline editing, drag-and-drop, real-time, item panel with updates and notifications, board permissions and invites, My Work, templates, trash.
- Phase B, ways of seeing (M): Kanban, Calendar, Timeline / Gantt, Chart, saved views with filters / sort / hide / group by, global search, bulk bar, keyboard shortcuts, dark mode polish, PWA.
- Phase C, leverage (M): automations (recipe builder, engine, run history, date triggers) and dashboards (Numbers, Chart, Battery, Workload).

Ship and test at the end of each phase. No promise of a perfect clone: the aim is the flow, not the pixel.
