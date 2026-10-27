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
