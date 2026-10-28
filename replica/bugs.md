# Bugs

Only reproduced defects. Severity: S1 data loss or security, S2 feature broken, S3 broken with a workaround or visibly wrong, S4 cosmetic.

## B-001 · S3 · fixed · Views bar failed the tablist contract
- Steps: open any board, run axe. Actual: `aria-required-children` on the views bar (menu buttons and the rename field sat inside a tablist). Expected: no violation.
- Fix: the bar is a `nav` of buttons with `aria-current` (commit "test: Playwright suite and accessibility fixes").

## B-002 · S3 · fixed · Kanban cards were nested interactive controls
- Steps: open the Kanban view, run axe. Actual: each card `li` carried `role="button"` from the drag attributes and wrapped a link (`list`, `nested-interactive`). Expected: a list of cards with a separate drag handle.
- Fix: a dedicated "Move" grip button carries the drag attributes; the card and its link stay plain.

## B-003 · S3 · fixed · Read-only update bodies were unnamed textboxes
- Steps: open an item with updates, run axe. Actual: `aria-input-field-name` on each rendered update. Expected: named or non-input semantics.
- Fix: read-only editors carry `aria-label="Update text"` and `aria-readonly`.

## To check (not reproduced)
- Realtime: a remote change to the focused cell after a long edit; verify the held patch applies on blur.
- Dashboards: the Numbers widget reads "0 items" when no numbers column exists on the connected boards; it should say so.

## B-004 · S2 · fixed · A remote cell change never reached a page whose user had just used that cell's picker
- Steps: `e2e/collab.spec.ts` "two browsers see each other's edits live": Ana (owner) and Ben (member) open Project tracker; Ana sets "Build the first version" to Stuck, Ben sees it live (passes); Ben then picks "Working on it" from the same cell's picker. Actual: Ben's row keeps "Stuck", no error toast, nothing in the console. Expected: Ben's row shows "Working on it" and Ana's follows. Not yet reproduced by hand; the same picker works for the owner in every other case.
- Leads: Ben's click lands while his cell is held by the editing registry after the incoming Stuck patch; or the option list belongs to a popover that closed before the click. Reproduce by hand as demo.ben@example.com before changing code. The case is `test.fixme` until fixed.

- Correction 2026-10-28: commit c247333's message says B-004 closed; it is not. The two-browser case still fails in the suite while the same edit applies in 222 ms by hand (chrome-devtools, demo.ben). B-004 stays open at S2 until the suite run is understood; the case is `test.fixme` again.
- Root cause (found with the trace, 2026-10-28): the failing assertion was Ana's page, not Ben's. After Ana picked a status, Radix returned focus to the cell's trigger button, the cell's focus handler took the editing lock for that cell, and every later remote change to it was deferred until Ana blurred, which the test never did. A focused button is not typing. Fix: `src/components/board/cell.tsx` takes the lock only when focus lands on an input, textarea or contenteditable. The held-cell case still passes, so the lock still protects typing. Case un-fixme'd; passes twice in a row and in the full suite.
- The 2,000-item scroll case was un-fixme'd at the same time and passed inside the full suite (23 cases). Its earlier full-suite failure is not root-caused; if it returns, record the run here.

## B-005 · S3 · fixed · Group footer battery announced an empty label
- Steps: run the full suite; F03-H1 axe scan reports `role-img-alt` on `span[aria-label=""]`. The footer battery for a status column rendered whenever the summary array existed, including when every item in the group had an empty status, so the label was an empty string. Fix: render only when the array has entries (`src/components/board/table-view.tsx`).

## B-006 · S3 · fixed · Moving a column only showed after a reload
- Steps: Project tracker, Owner column menu, Move right. Expected: the header order changes at once. Actual: nothing moved until the page reloaded; the database had the new positions. Cause: `visibleColumns` returned columns in load order and never re-sorted by position after the optimistic patch or the realtime row. Fix: sort by position in `src/lib/board/model.ts`. Found while writing the drag cases (e2e/drag.spec.ts).
