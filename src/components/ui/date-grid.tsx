"use client";

import { useState } from "react";
import { addDays, addMonths, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfMonth, startOfWeek, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "cn";
import { IconButton } from "@/components/ui/icon-button";
import { parseDay } from "@/lib/format";

type Props = { value?: string | null; onChange: (day: string) => void; label?: string; min?: string | null };

/** A month grid. Arrow keys move the focused day, Enter picks it, PageUp and PageDown change the month. */
export function DateGrid({ value, onChange, label = "Choose a date", min }: Props) {
  const selected = parseDay(value) ?? null;
  const [cursor, setCursor] = useState<Date>(selected ?? new Date());
  const [focused, setFocused] = useState<Date>(selected ?? new Date());
  const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
  const days: Date[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) days.push(d);
  const minDay = parseDay(min);
  const today = new Date();

  const moveFocus = (next: Date) => {
    setFocused(next);
    if (!isSameMonth(next, cursor)) setCursor(next);
    requestAnimationFrame(() => document.getElementById(`day-${format(next, "yyyy-MM-dd")}`)?.focus());
  };

  return (
    <div className="w-60 select-none" role="group" aria-label={label}>
      <div className="mb-1 flex items-center justify-between">
        <IconButton aria-label="Previous month" size="sm" onClick={() => setCursor(subMonths(cursor, 1))}><ChevronLeft /></IconButton>
        <div className="text-sm font-medium" aria-live="polite">{format(cursor, "MMMM yyyy")}</div>
        <IconButton aria-label="Next month" size="sm" onClick={() => setCursor(addMonths(cursor, 1))}><ChevronRight /></IconButton>
      </div>
      <div className="grid grid-cols-7 text-center text-xs text-text-muted" aria-hidden>
        {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => <div key={d} className="py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7" role="grid">
        {days.map((d) => {
          const key = format(d, "yyyy-MM-dd");
          const isSel = selected ? isSameDay(d, selected) : false;
          const disabled = minDay ? d < minDay : false;
          return (
            <button
              key={key}
              id={`day-${key}`}
              type="button"
              role="gridcell"
              aria-selected={isSel}
              aria-label={format(d, "EEEE d MMMM yyyy")}
              tabIndex={isSameDay(d, focused) ? 0 : -1}
              disabled={disabled}
              onClick={() => onChange(key)}
              onKeyDown={(e) => {
                const map: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 7, ArrowUp: -7 };
                if (e.key in map) { e.preventDefault(); moveFocus(addDays(d, map[e.key])); }
                else if (e.key === "PageDown") { e.preventDefault(); moveFocus(addMonths(d, 1)); }
                else if (e.key === "PageUp") { e.preventDefault(); moveFocus(subMonths(d, 1)); }
                else if (e.key === "Home") { e.preventDefault(); moveFocus(startOfWeek(d, { weekStartsOn: 1 })); }
                else if (e.key === "End") { e.preventDefault(); moveFocus(endOfWeek(d, { weekStartsOn: 1 })); }
              }}
              className={cn(
                "h-8 rounded-sm text-sm hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-40",
                !isSameMonth(d, cursor) && "text-text-muted",
                isSameDay(d, today) && "font-semibold text-brand-text",
                isSel && "bg-brand text-on-brand hover:bg-brand-hover",
              )}
            >
              {format(d, "d")}
            </button>
          );
        })}
      </div>
    </div>
  );
}
