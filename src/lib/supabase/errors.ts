/** Turn a PostgREST or network error into one sentence the user can act on. */
export function friendlyError(error: unknown, fallback = "Something went wrong. Try again.") {
  const e = error as { code?: string; message?: string; details?: string } | null;
  if (!e) return fallback;
  const msg = (e.message ?? "").trim();
  switch (e.code) {
    case "23514": // check_violation: our validators write plain sentences
      return msg ? msg.charAt(0).toUpperCase() + msg.slice(1).replace(/\.$/, "") + "." : "That value isn't allowed here.";
    case "42501":
    case "PGRST301":
      return "You don't have permission to do that.";
    case "23505":
      return "That already exists.";
    case "23503":
      return "That refers to something that no longer exists.";
    case "0A000":
      return msg || "Not supported yet.";
    default:
      if (/fetch|network|Failed to fetch|offline/i.test(msg)) return "You seem to be offline. We'll retry when you're back.";
      return fallback;
  }
}
