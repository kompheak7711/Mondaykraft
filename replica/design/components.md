# Components: Taskraft Management

Specs for every component in `replica/recon.md`, written against the roles in `tokens.json`. Values are ours: no screenshots exist (D-002), so nothing here is measured from the original. Accessible bases: shadcn/ui (Radix primitives) for menus, popovers, dialogs, sheets, tooltips, tabs, checkbox, switch, avatar, command palette; everything else is ours. Focus ring everywhere: 2px `accent`, 2px offset, `focus-visible` only. Body text is `sm` (14/20). Icons: Lucide, 16px in cells and menus, 20px in the sidebar and top bar. Every interactive thing is a real `<button>`, `<a>` or input, with a name.

Shared behaviour: hover uses `surface-2`; selected uses `accent-soft` with `accent-text`; disabled is 50% opacity and `aria-disabled`; loading keeps the label and adds a spinner with `aria-busy`; errors use `danger` text under the control plus `aria-invalid` and `aria-describedby`; empty states are one sentence and one action; motion is `fast` for hover and focus, `base` for open and close, `slow` for panels, all honouring `prefers-reduced-motion`.

```
Button
  variants  primary (bg accent, text on-accent), secondary (bg surface, border border-strong, text text), ghost (transparent, text text), danger (bg danger, text on-accent), split (primary + chevron menu, used by New item)
  sizes     sm 28px, md 32px, lg 40px; padding 8/12/16; icon-only square
  states    default, hover (accent-hover / surface-2), active (scale .98), focus-visible ring, disabled, loading (spinner replaces icon, label stays)
  tokens    radius md, font sm/600, gap 8
  a11y      <button type>, aria-busy while loading, split menu is a separate button labelled "More options for New item"
  used on   all

Icon button
  variants  plain, with badge (bell count, red dot for unread), toggle (pressed state)
  sizes     28, 32, 36
  states    default, hover surface-2, active surface-2 + accent-text, focus-visible, disabled
  tokens    radius md, icon 16/20
  a11y      aria-label always; badge count read as "7 unread notifications"; toggles use aria-pressed
  used on   S02, S03, S06

Inline cell
  variants  one per column type (status, priority, people, date, timeline, numbers, text, long text, dropdown, tags, checkbox, link, files, progress, creation log, last updated)
  states    view, hover (edit affordance), editing (popover or inline input), saving (optimistic, no spinner under 400ms), error (rolls back, red flash + toast), locked (viewer or permission set: cursor default, tooltip "You can view this board"), remote-changed (accent-soft flash 600ms)
  tokens    height row (36), padding 0 8, font sm, border-right border
  a11y      cell is a gridcell; Enter opens the editor, Escape cancels, Tab moves; the editor is the real control (listbox, textbox, date input); the screen reader hears "Status, Working on it, editable"
  used on   S03, S06, S07, S18

Status label chip
  variants  filled (bg label-*, text on-accent), done style (same + check icon), empty (bg surface-2 dashed border), editable labels in the picker
  sizes     cell: fills the cell; chip: 24px, padding 0 8, radius sm
  states    default, hover (brightness), open picker (grid of labels, search when more than 8, "Edit labels" link), editing labels (rename inline, recolour from the 12 label colours, drag to reorder, delete with "move items to" prompt)
  tokens    label-* backgrounds, on-accent text, font xs/500
  a11y      picker is a listbox with the label names; colour is never the only signal (name is always visible)
  used on   S03, S05, S06, S08

Person picker
  variants  single, multiple (avatar stack), teams not in v1
  states    empty (+ in a dashed circle), filled, open (search input, member list with avatars, "Invite" footer), search-empty ("No one matches")
  tokens    avatar 24 in cells, 32 in the picker; radius pill
  a11y      combobox with listbox; selected people announced; removing a person is a button inside the chip
  used on   S03, S06, S12, S15

Date picker
  variants  date, date + time, with "Today" and "Clear"
  states    empty, filled, overdue (danger text, only when the row's status is not done), done (strike-through, text-muted), open calendar (month grid, arrows, keyboard navigation)
  tokens    font sm, danger, text-muted; uses the viewer's timezone for "today" and "overdue"
  a11y      native <input type=date> on touch devices; on desktop a dialog grid with arrow-key navigation; the typed format follows the locale
  used on   S03, S06, S09

Timeline range picker
  variants  start and end; battery fill of elapsed days behind the text
  states    empty, filled, past due (danger fill), open (two-month calendar with range drag)
  tokens    bar bg surface-2, fill accent-soft, text xs/500
  a11y      two date inputs labelled Start and End; the fill is decorative (aria-hidden)
  used on   S03, S10

Number cell
  variants  unit prefix or suffix, decimals 0 to 4, thousands separator by locale
  states    empty, filled, invalid (rejected by the validator: red flash, value restored, toast "Numbers only")
  tokens    font sm tabular-nums, right aligned
  a11y      inputmode decimal; unit announced after the value
  used on   S03, S05

Column footer summary
  variants  sum, avg, median, min, max, count, none; status footer shows a battery of label shares
  states    collapsed (hidden until hover of the footer row), shown
  tokens    height 32, font xs/500, text-muted, bg surface
  a11y      footer is a row with "Sum 1,240" text cells; the battery has a text alternative
  used on   S03

Dropdown chips
  variants  multi-select chips, create option inline ("Create 'Design'")
  states    empty, filled, overflow (+3 with tooltip listing the rest), open (checkbox list with search)
  tokens    chip 20px, radius pill, bg surface-2, text text, option colours from label-*
  a11y      listbox multiselectable; chips removable with Backspace while focused
  used on   S03, S06

Tags chips
  variants  workspace-wide tags, create inline
  states    empty, filled
  tokens    same as dropdown chips, prefixed with #
  a11y      as dropdown chips
  used on   S03

Checkbox cell
  states    unchecked, checked, locked
  tokens    20px box, radius sm, border border-input, checked bg accent + on-accent check
  a11y      native checkbox; Space toggles; label is the column title
  used on   S03

Link cell
  variants  url with display text, favicon from the domain (our own fetch, cached)
  states    empty, filled (opens in a new tab, external icon), invalid url (validator rejects, toast)
  tokens    accent-text, underline on hover
  a11y      <a rel="noopener" target="_blank"> with "opens in new tab" in the accessible name
  used on   S03

Files cell
  variants  thumbnails for images, icon by type otherwise, count badge over 3
  states    empty (upload icon), uploading (progress ring per file), failed (retry button), filled
  tokens    thumb 24 in cells, 96 in the panel; radius sm
  a11y      hidden <input type=file multiple>; progress announced with aria-live polite; drag-and-drop zone with a keyboard alternative
  used on   S03, S06

Progress bar
  variants  roll-up of the chosen status columns (done labels count)
  states    0%, partial, 100% (success)
  tokens    track surface-2, fill accent, height 8, radius pill, percentage xs text
  a11y      role progressbar with aria-valuenow
  used on   S03, S07

Priority chip
  variants  Critical, High, Medium, Low plus custom labels (a status column with a fixed starter set)
  tokens    label-red, label-orange, label-blue, label-gray
  a11y      as status chip
  used on   S03, S18

Long text editor
  variants  popover with a multi-line textarea, auto-grow to 10 lines, expand to the item panel
  states    empty, filled (first line shown in the cell, ellipsis), editing
  tokens    font sm, padding 8, popover shadow pop
  a11y      textarea labelled by the column; Cmd/Ctrl+Enter saves, Escape cancels
  used on   S03

Group header
  variants  colour dot, chevron, editable title, item count, menu
  states    collapsed, expanded, editing title, dragging (shadow pop, 2px accent left border on the drop target)
  tokens    height group-header (40), title lg/600 in the group colour, count xs text-muted, sticky under the toolbar
  a11y      the chevron is a button with aria-expanded; the title is a button that becomes a textbox on click or F2; drag has a keyboard alternative in the menu (Move up, Move down)
  used on   S03

Column header
  variants  type icon, title, sort arrow, menu, resize handle, drag handle
  states    default, sorted (arrow + accent-text), hidden-in-view (not rendered; listed in Hide), dragging, resizing (live width)
  tokens    height 36, font xs/600 text-muted uppercase off, border-right border, min width 60, max 1000
  a11y      columnheader with aria-sort; menu button labelled "Status column options"; resize handle has a keyboard alternative (menu: Set width)
  used on   S03

Row
  variants  item, subitem (indented 32, lighter left border)
  states    default, selected (accent-soft bg, checkbox checked), hover (checkbox and drag handle appear), dragging, read-only, highlighted (remote change flash)
  tokens    height row (36), bg bg, border-bottom border, name cell sticky left with the group colour as a 4px left bar
  a11y      role row; the checkbox is "Select Write spec"; the name cell is a button opening the item panel; the chat bubble button says "3 updates"
  used on   S03, S07

Add-item row
  states    empty ("+ Add item" ghost text), typing (input in the name cell; Enter saves and keeps the row open; Escape clears)
  tokens    height row, text-muted
  a11y      a textbox labelled "New item name"; saving announces "Item added"
  used on   S03, S07
```

```
Views bar tab
  variants  icon + name, active, overflow menu (when tabs exceed the width), "+ Add view" button
  states    active (accent-text, 2px accent underline), inactive (text-muted), renaming (inline textbox), dragging
  tokens    height views-bar (40), font sm/500, gap 4
  a11y      tablist with tabs; the tab menu (rename, duplicate, set as default, delete) is a separate button labelled "Kanban view options"
  used on   S13

Toolbar
  variants  New item (split button), Search, Person, Filter, Sort, Hide, Group by; collapses to icons under lg and to a "..." menu under md
  states    idle, active (chips showing "Filtered 3", "Sorted by Due", "2 hidden" with a clear x)
  tokens    height toolbar (40), gap 8, chips accent-soft + accent-text
  a11y      toolbar role; chips announce the active state; the search field is a searchbox with Escape to clear
  used on   S03, S08-S11

Filter rule row
  variants  column select, operator select (depends on the column type), value control (the column's own editor), and/or toggle between rows
  states    incomplete (greyed Apply), complete, removable
  tokens    gap 8, controls 32px
  a11y      each control labelled "Column", "Condition", "Value"; new rule focuses its first select
  used on   S12

Side panel (item card)
  variants  right-docked 640px, full screen under md, tabs Updates / Files / Activity
  states    open, closed, loading (skeleton), no permission (locked notice)
  tokens    width item-panel, bg bg, border-left border, shadow float, z panel
  a11y      dialog non-modal on desktop (focus moves in, Escape closes, focus returns); modal on mobile; the title is the item name
  used on   S06

Rich text editor (updates)
  variants  toolbar (bold, italic, underline, strike, bullet list, numbered list, link, checklist later), @mention popover, emoji button, attach button
  states    empty (placeholder "Write an update..."), typing, posting (disabled with spinner), error (kept text + retry)
  tokens    min height 96, font base in the editor, border border-input, radius md
  a11y      the editor is a contenteditable with role textbox and aria-multiline; the mention popover is a listbox navigated with arrows; Cmd/Ctrl+Enter posts
  used on   S06, S20

Update card
  variants  author avatar, name, time (relative, title has the full date), body, files, reactions, replies, pin, menu (edit, delete, copy link)
  states    default, pinned (accent-soft top border, pin icon), edited ("edited" suffix), deleted ("This update was deleted" placeholder when it has replies)
  tokens    padding 16, gap 8, bg surface, radius lg
  a11y      article with the author and time in its accessible name; reply thread is a list
  used on   S06, S20

Reaction bar
  variants  thumbs-up quick button + emoji picker (eight common emoji in v1)
  states    none, mine (accent-soft, accent-text, aria-pressed), others
  tokens    chip 24px, radius pill
  a11y      each reaction is a toggle button "Thumbs up, 3, press to add yours"
  used on   S06

Notification row
  variants  icon by kind (mention, assigned, reply, update, automation, deleted), text, board / item link, time
  states    unread (bold text, accent dot), read
  tokens    padding 12 16, border-bottom border
  a11y      a link to the item; unread announced; "Mark as read" is a secondary button that appears on hover and focus
  used on   S19

Toast
  variants  success, error, info, with an action (Undo)
  states    visible, hiding; error toasts stay until dismissed, others auto-hide after 5 seconds (paused on hover)
  tokens    bg text / text bg (inverted), radius md, shadow float, z toast; bottom-left on desktop, bottom on mobile
  a11y      role status (polite) or alert for errors; the Undo button is reachable with Tab and the toast pauses while focused
  used on   all

Modal
  variants  confirm (title, one sentence, danger or primary action), form (invite, rename), picker (column center, template preview)
  sizes     sm 400, md 560, lg 800 (template preview)
  states    open, loading, error
  tokens    bg bg, radius lg, shadow float, overlay rgba(16,24,40,.5), z modal
  a11y      Radix Dialog: focus trap, Escape, labelled by the title, described by the body; destructive confirms focus Cancel first
  used on   S04, S23, S24, S28

Popover / menu
  variants  context menu, select-like pickers, settings popovers
  states    open, closed
  tokens    bg bg, border border, radius md, shadow pop, min width 200, item height 32, z dropdown
  a11y      Radix DropdownMenu or Popover; typeahead in menus; the trigger has aria-expanded
  used on   all

Avatar stack (presence)
  variants  up to 5 avatars + "+n", live
  states    live (tooltip with names), a halo on the avatar of whoever is editing the focused row
  tokens    avatar 28, overlap -8, border 2px bg
  a11y      "4 people viewing: Ana, Ben, ..." as the group's accessible name
  used on   S03, S16

Skeleton
  variants  table (groups of 5 rows), card, dashboard widget
  states    loading
  tokens    bg surface-2, radius sm, shimmer only without reduced motion
  a11y      aria-busy on the container; the screen reader hears "Loading board"
  used on   all

Empty state
  variants  per screen: no boards, empty board, filtered empty, no updates, no notifications, empty trash, no results
  tokens    one icon in text-muted (no illustrations in v1), title lg, one line of text-muted, one primary action
  a11y      the action is the first focusable element; the text never relies on the icon
  used on   all

Kanban lane / card
  variants  lane header (label colour bar, name, count, add card), card (name, chosen columns, avatar, updates count)
  states    empty lane ("Drop items here"), dragging card (tilt 2deg, shadow pop), drop target (accent-soft)
  tokens    lane width 280, gap 12, card radius md, shadow card
  a11y      lanes are lists; a card is a button opening the item; moving cards has a keyboard alternative in the card menu (Move to...)
  used on   S08

Calendar grid / chip
  variants  month, week, day; item chip with the group colour as a left bar; "+3 more" link
  states    today (accent-soft cell, bold day number), other month (text-muted), dragging chip
  tokens    chip height 24, font xs/500, radius sm
  a11y      the grid is a table with day headers; chips are buttons; moving a chip has a keyboard alternative (date editor)
  used on   S09

Gantt row / bar
  variants  row label column (item name, sticky), bar coloured by group or status, resize handles, today line, zoom days / weeks / months / quarters / years
  states    dragging (move), resizing (either end), hover (dates tooltip), empty row ("Set a timeline")
  tokens    row height 36, bar height 24, radius sm, today line 2px danger
  a11y      each bar is a button with the item name and date range; move and resize have a keyboard alternative (the timeline editor)
  used on   S10

Chart
  variants  bar, stacked bar, line, pie (Recharts); colours from the label palette in order
  states    loading (skeleton), empty ("Nothing to chart yet")
  tokens    label-* fills, axis text xs text-muted, grid border
  a11y      a table alternative behind "View as table"; the chart has an accessible description with the top values
  used on   S11, S16

Widget frame
  variants  title, menu (settings, duplicate, delete), resize handle, drag handle
  states    editing layout (handles visible), locked (viewer)
  tokens    bg surface, radius lg, padding 16, shadow card, grid 12 columns, row 80px
  a11y      a region labelled by the widget title; resize and move have keyboard alternatives in the menu
  used on   S16

Numbers tile
  variants  big number + caption, with unit and function label
  tokens    number xl/700 tabular-nums, caption sm text-muted
  a11y      plain text
  used on   S16

Battery bar
  variants  segment per status label with percentage, legend
  states    empty ("No status column")
  tokens    height 24, radius pill, label-* fills, legend xs
  a11y      a list of "Done 60%" entries behind the bar
  used on   S16

Workload grid
  variants  person rows x week columns, count dots sized by load, totals column
  tokens    cell 40x40, dot accent with opacity by count
  a11y      a table with headers; each cell says "Ana, week of 3 Nov, 4 items"
  used on   S16

Sidebar nav
  variants  workspace switcher, Home, My Work, Inbox, favorites, folder tree, boards and dashboards, "+ Add", collapse
  states    expanded (sidebar 256), collapsed (56, icons with tooltips), drawer (mobile, over the content), active item (accent-soft + accent-text)
  tokens    bg surface, border-right border, item height 32, padding 8, font sm
  a11y      nav landmark; the tree is a tree role with aria-expanded on folders; the switcher is a menu; collapse is a button with aria-expanded
  used on   S02

Top bar
  variants  search (opens the command palette), Inbox, bell with badge, help, profile menu, Invite button
  tokens    height topbar (48), bg bg, border-bottom border
  a11y      header landmark; the search is a button labelled "Search (Cmd+K)"
  used on   S02

Command palette
  variants  search + actions (new item, new board, go to board, toggle theme), recent
  states    open, empty query (recent + actions), no results
  tokens    width 640, shadow float, result row 40
  a11y      cmdk: combobox + listbox, Cmd/Ctrl+K opens, Escape closes, arrows move, Enter opens
  used on   S21

Keyboard shortcut hint
  variants  tooltip suffix (kbd), shortcuts sheet in settings
  tokens    kbd: font xs mono, bg surface-2, border border, radius sm, padding 0 4
  a11y      kbd elements; the sheet is a dialog listing every shortcut
  used on   S26

Bulk action bar
  variants  bottom-docked: count, Duplicate, Move to group, Archive, Delete, Export (disabled: out of v1), Convert to subitems (could), clear
  states    hidden, visible (slides up, slow), many selected, mixed groups (Move to group disabled with tooltip)
  tokens    height 56, bg text / text bg (inverted), radius lg, shadow float, z toast - 1
  a11y      toolbar labelled "3 items selected"; Escape clears the selection
  used on   S29

Offline banner
  variants  top-docked: "You're offline. 3 changes will sync when you're back." / "Syncing 3 changes..."
  states    offline (warning-soft bg, warning text), resyncing (accent-soft), hidden
  tokens    height 36, font sm/500
  a11y      role status; not dismissible while offline
  used on   all

Theme toggle
  variants  light / dark / system segmented control
  tokens    segment 32px, active surface-2
  a11y      radiogroup; the choice is saved on the profile and applied before paint (data-theme on <html>)
  used on   S26
```

## Checks

- `python3 contrast.py replica/design/tokens.json`: 34 pairs, 0 failing AA. `tokens.dark.json`: 32 pairs, 0 failing AA (2026-10-28).
- The primitives are rendered with every state on `/design` (`src/app/design/page.tsx`); `design-light.png` and `design-dark.png` in this folder are that page at 1280px. Screenshot it again after any token change.
- Implementation notes: shadcn button sizes are 28, 32 and 36 px (sm, default, lg), one step smaller than the 40 px large above; the destructive variant is shadcn's soft style (danger text on a danger tint). Tailwind utilities for the brand role are `bg-brand`, `text-brand-text`, `bg-brand-soft`, `text-on-brand`; shadcn's `accent` is the hover colour, not the brand.
- Clean-room: Inter instead of the original's font, Lucide icons, a placeholder indigo accent that `/replica-brand` replaces, our own 12-colour label palette, our own copy for every label and empty state.
