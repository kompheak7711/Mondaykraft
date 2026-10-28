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

## B-004 · S2 · open · A member's status edit does not apply in the two-browser test
- Steps: `e2e/collab.spec.ts` "two browsers see each other's edits live": Ana (owner) and Ben (member) open Project tracker; Ana sets "Build the first version" to Stuck, Ben sees it live (passes); Ben then picks "Working on it" from the same cell's picker. Actual: Ben's row keeps "Stuck", no error toast, nothing in the console. Expected: Ben's row shows "Working on it" and Ana's follows. Not yet reproduced by hand; the same picker works for the owner in every other case.
- Leads: Ben's click lands while his cell is held by the editing registry after the incoming Stuck patch; or the option list belongs to a popover that closed before the click. Reproduce by hand as demo.ben@example.com before changing code. The case is `test.fixme` until fixed.

- Correction 2026-10-28: commit c247333's message says B-004 closed; it is not. The two-browser case still fails in the suite while the same edit applies in 222 ms by hand (chrome-devtools, demo.ben). B-004 stays open at S2 until the suite run is understood; the case is `test.fixme` again.
- To check: the 2,000-item scroll case (e2e/collab.spec.ts) passes when run alone and fails inside the full suite; the first assertions (virtualised row count under 200, Row 1 visible, 20 scrolls under 8 s) pass, the final 'Row 2000 rendered' poll is what times out in the suite. Marked fixme until the cause is found.
