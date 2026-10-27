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
