export const WORKSPACE_COOKIE = "tk_ws";

/** The workspace the sidebar shows: the cookie if it is one of mine, else the first one. */
export function pickWorkspace<T extends { id: string }>(cookieValue: string | undefined, workspaces: T[]) {
  return workspaces.find((w) => w.id === cookieValue) ?? workspaces[0] ?? null;
}
