# Build log: Taskraft Management

One line per screen: ID, date, done or partial, what is missing, what was harder than it looked. Screens are from `replica/recon.md`; the order follows `replica/architecture.md`.

Approach: the data layer is the real one from day one. Local Supabase (`supabase start`) runs the migration in `supabase/migrations/`, the app talks to it through `supabase-js` under RLS, and there is no fake data layer to swap out later. `/replica-backend` then covers auth edges, invites and email, storage, realtime polish, the stale-text trigger and the seed.

| screen | date | status | missing | notes |
| --- | --- | --- | --- | --- |
| S01 | 2026-10-28 | done | Google needs provider keys | email + password, invite acceptance route still a stub |
| S02 | 2026-10-28 | done | bell is a link, not a popover yet | sidebar tree, switcher, add menu, mobile drawer, onboarding |
| S03 | 2026-10-28 | partial | drag and drop of rows, groups and columns (server-side moves exist, menus cover reorder) | virtualised table, 16 column modules, footers, selection bar, keyboard arrows, realtime, presence |
| S04 | 2026-10-28 | done | | column center popover with search |
| S05 | 2026-10-28 | done | change type (not in v1) | label editor with move-items-to on delete |
| S07 | 2026-10-28 | done | roll-up summary on the parent (should) | expand per row, own column set, add subitem |
| S12 | 2026-10-28 | done | | rules per column type, and/or, person filter, search |
| S13 | 2026-10-28 | partial | drag reorder | add, rename, duplicate, default, remove |
| S22 | 2026-10-28 | partial | owners list | permission set and board type in the owner menu |
| S28 | 2026-10-28 | partial | duplicate board (backend step) | rename, description, type, permissions, archive, trash |
| S29 | 2026-10-28 | done | export (out of scope) | duplicate, move to group, archive, delete, Escape clears |

Harder than it looked: Next.js 16's prerender checks (cacheComponents off), the React Compiler lint rules (inline components hoisted), and `insert ... returning` under RLS, which needed the select policies to work from a row's own columns (see D-008).
| S06 | 2026-10-28 | done | attach a file from the composer (files go through Files columns for now) | side sheet, all columns as fields, updates with mentions, replies, reactions, pin, files tab, activity tab |
| S18 | 2026-10-28 | done | views by status/priority/board, hide boards (should) | buckets in the profile time zone; rpc my_work |
| S19 | 2026-10-28 | partial | bell popover (page for now), mute board | tabs, mark read, mark all read |
| S20 | 2026-10-28 | done | inline reply (opens the item panel) | 50 latest top-level updates across readable boards |
| S21 | 2026-10-28 | partial | command palette | rpc search grouped by kind |
| S23 | 2026-10-28 | done | email sending (link is copied; test addresses only per D-015) | roles, take out, leave, invites with withdraw |
| S24 | 2026-10-28 | done | preview of columns and rows before choosing | template picker in the New board dialog |
| S25 | 2026-10-28 | done | delete forever (purge handles it) | trash and archive lists with restore |
| S26 | 2026-10-28 | partial | avatar upload | name, title, time zone, mute kinds, theme, shortcuts |
| S01 invite | 2026-10-28 | done | | /invite/:token accepts after login and sets the workspace |
| S08 | 2026-10-28 | done | sort inside a lane | lanes per label plus a no-value lane, drag between lanes, card columns setting |
| S09 | 2026-10-28 | done | week and day drag of timed events | react-big-calendar on the tokens; chips carry the group colour |
| S10 | 2026-10-28 | done | dependencies (out of scope), PDF export (out of scope) | own Gantt: five zoom levels, today line, drag to move, drag ends to resize |
| S11 | 2026-10-28 | partial | stacked bars, group dates by week/month | bar, line and pie by any groupable column; count or a numbers function |
| S14 | 2026-10-28 | done | failed-run badge on the board header | manage list with on/off, run counts, edit, duplicate, trash; run history tab |
| S15 | 2026-10-28 | done | | sentence builder: four triggers, five condition types, six action types, several actions |
| S16 | 2026-10-28 | partial | drag to reorder widgets, present mode, dashboard filters (should) | connect boards, four widget types over rpc widget_data, 12-column grid |
| S17 | 2026-10-28 | done | | per-board source columns, function, title and size in a popover |
| S27 | 2026-10-28 | partial | service worker, offline queue, card list for the table under 768px | manifest and icon; shell has the mobile drawer |

- 2026-10-28 · round two · drag and drop: rows (grip, multi-select moves together, off while sorted or grouped by column), groups, columns and dashboard widgets, all on dnd-kit with pointer and keyboard sensors over the existing `move_rows`; widget order is `layout.y`. Harder than it looked: the virtualised grid cannot use the sortable preset, so rows are plain draggables with a drop line, and the keyboard sensor coalesces key presses inside one frame (tests pace them).
