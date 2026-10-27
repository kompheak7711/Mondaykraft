/**
 * The cell being edited right now. A remote change to that cell waits here until the
 * editor closes, so nobody's typing is overwritten mid-keystroke (then it applies, last write wins).
 */
let active: string | null = null;
const pending = new Map<string, () => void>();
const listeners = new Set<(key: string | null) => void>();

export function beginEdit(key: string) {
  active = key;
  listeners.forEach((l) => l(key));
}

export function endEdit(key: string) {
  if (active !== key) return;
  active = null;
  const run = pending.get(key);
  pending.delete(key);
  run?.();
  listeners.forEach((l) => l(null));
}

/** Apply now, or defer if the key is the active cell. */
export function applyOrDefer(key: string, apply: () => void) {
  if (active === key) pending.set(key, apply);
  else apply();
}

export function isEditing(key: string) {
  return active === key;
}

export function onEditingChange(l: (key: string | null) => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}
