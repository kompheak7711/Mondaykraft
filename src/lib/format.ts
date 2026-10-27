import { differenceInCalendarDays, format, formatDistanceToNowStrict, isValid, parseISO } from "date-fns";

/** Wall dates ("2026-10-28") never pass through a time zone. */
export function parseDay(value: string | undefined | null) {
  if (!value) return null;
  const d = parseISO(value);
  return isValid(d) ? d : null;
}

export function todayKey(timezone?: string) {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  } catch {
    return format(new Date(), "yyyy-MM-dd");
  }
}

export function formatDay(value: string | undefined | null, time?: string | null) {
  const d = parseDay(value);
  if (!d) return "";
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return format(d, sameYear ? "d MMM" : "d MMM yyyy") + (time ? ` ${time}` : "");
}

export function formatRange(from?: string | null, to?: string | null) {
  const a = parseDay(from);
  const b = parseDay(to);
  if (!a || !b) return "";
  if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) return `${format(a, "d")} – ${format(b, "d MMM")}`;
  return `${format(a, "d MMM")} – ${format(b, "d MMM")}`;
}

export function daysUntil(value: string | undefined | null, timezone?: string) {
  const d = parseDay(value);
  const t = parseDay(todayKey(timezone));
  return d && t ? differenceInCalendarDays(d, t) : null;
}

export function formatRelative(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  if (!isValid(d)) return "";
  return formatDistanceToNowStrict(d, { addSuffix: true });
}

export function formatNumber(n: number, decimals = 0, unit?: string, unitPosition: "prefix" | "suffix" = "suffix") {
  const text = new Intl.NumberFormat(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(n);
  if (!unit) return text;
  return unitPosition === "prefix" ? `${unit}${text}` : `${text} ${unit}`;
}
