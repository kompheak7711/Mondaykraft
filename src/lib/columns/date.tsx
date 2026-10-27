"use client";

import { useState } from "react";
import { z } from "zod";
import { CalendarDays, CalendarRange } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateGrid } from "@/components/ui/date-grid";
import { CellButton, Muted } from "./shared";
import { isDone } from "./status";
import { daysUntil, formatDay, formatRange, parseDay, todayKey } from "@/lib/format";
import type { CellProps, CellValue, Column, ColumnModule, BoardContext } from "./types";

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const coarsePointer = () => typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;

const itemDone = (board: BoardContext, cells: Record<string, CellValue>) => board.statusColumns.some((c) => isDone(c, cells[c.id] ?? null));

const dateOps = [
  { id: "is", label: "is", operand: "date" as const },
  { id: "before", label: "is before", operand: "date" as const },
  { id: "after", label: "is after", operand: "date" as const },
  { id: "is_today", label: "is today", operand: "none" as const },
  { id: "is_past", label: "is in the past", operand: "none" as const },
  { id: "is_empty", label: "is empty", operand: "none" as const },
  { id: "not_empty", label: "is not empty", operand: "none" as const },
];

function matchDay(dayValue: string | undefined, op: string, operand: unknown, board: BoardContext) {
  const today = todayKey(board.timezone);
  const o = typeof operand === "string" ? operand : "";
  switch (op) {
    case "is": return !o || dayValue === o;
    case "before": return Boolean(dayValue && o && dayValue < o);
    case "after": return Boolean(dayValue && o && dayValue > o);
    case "is_today": return dayValue === today;
    case "is_past": return Boolean(dayValue && dayValue < today);
    case "is_empty": return !dayValue;
    case "not_empty": return Boolean(dayValue);
    default: return true;
  }
}

function DateCell({ column, value, canEdit, onChange, variant, board, cells }: CellProps) {
  const dateStr = value?.date as string | undefined;
  const time = value?.time as string | undefined;
  const withTime = Boolean(column.settings.with_time);
  const diff = daysUntil(dateStr, board.timezone);
  const done = itemDone(board, cells);
  const overdue = diff !== null && diff < 0 && !done;
  const [timeDraft, setTimeDraft] = useState(time ?? "");

  return (
    <CellButton
      canEdit={canEdit}
      variant={variant}
      label={`${column.title}: ${dateStr ? formatDay(dateStr, time) : "empty"}`}
      width="w-auto"
      editor={(close) => (
        <div className="space-y-2">
          {coarsePointer() ? (
            <Input type="date" value={dateStr ?? ""} onChange={(e) => e.target.value && onChange({ date: e.target.value, ...(timeDraft ? { time: timeDraft } : {}) })} aria-label={column.title} />
          ) : (
            <DateGrid value={dateStr} label={column.title} onChange={(d) => { onChange({ date: d, ...(timeDraft ? { time: timeDraft } : {}) }); if (!withTime) close(); }} />
          )}
          {withTime ? (
            <div className="flex items-center gap-2">
              <Input type="time" value={timeDraft} onChange={(e) => setTimeDraft(e.target.value)} onBlur={() => dateStr && onChange({ date: dateStr, ...(timeDraft ? { time: timeDraft } : {}) })} aria-label="Time" className="h-8" />
            </div>
          ) : null}
          <div className="flex items-center justify-between border-t border-border pt-2">
            <Button variant="ghost" size="sm" onClick={() => { onChange({ date: todayKey(board.timezone), ...(timeDraft ? { time: timeDraft } : {}) }); close(); }}>Today</Button>
            <Button variant="ghost" size="sm" disabled={!dateStr} onClick={() => { onChange(null); close(); }}>Clear</Button>
          </div>
        </div>
      )}
    >
      {dateStr ? (
        <span className={cn("truncate", overdue && "text-danger", done && "text-text-muted line-through")}>{formatDay(dateStr, time)}</span>
      ) : (
        <Muted>{variant === "field" ? "Set a date" : ""}</Muted>
      )}
    </CellButton>
  );
}

export const dateModule: ColumnModule = {
  type: "date",
  label: "Date",
  description: "A day, with an optional time. Overdue dates turn red until the item is done.",
  icon: CalendarDays,
  group: "essential",
  defaultSettings: () => ({ with_time: false }),
  schema: z.object({ date: day, time: z.string().regex(/^\d{2}:\d{2}$/).optional() }),
  toText: (value) => (value?.date ? `${value.date}${value.time ? " " + value.time : ""}` : ""),
  sortKey: (value) => (value?.date ? `${value.date}${value.time ? " " + value.time : ""}` : null),
  filterOps: dateOps,
  matches: (value, op, operand, _c, board) => matchDay(value?.date as string | undefined, op, operand, board),
  summaries: ["none"],
  groupKey: (value) => (value?.date ? { key: String(value.date), label: formatDay(String(value.date)) } : { key: "", label: "No date" }),
  Cell: DateCell,
};

function TimelineCell({ column, value, canEdit, onChange, variant, board, cells }: CellProps) {
  const from = value?.from as string | undefined;
  const to = value?.to as string | undefined;
  const [draftFrom, setDraftFrom] = useState(from ?? "");
  const today = parseDay(todayKey(board.timezone))!;
  const a = parseDay(from);
  const b = parseDay(to);
  let fill = 0;
  if (a && b) {
    const total = Math.max(1, (b.getTime() - a.getTime()) / 86400000);
    fill = Math.min(1, Math.max(0, (today.getTime() - a.getTime()) / 86400000 / total));
  }
  const done = itemDone(board, cells);
  const pastDue = Boolean(b && b < today && !done);
  const commit = (f: string, t: string) => {
    if (f && t) onChange(t >= f ? { from: f, to: t } : { from: t, to: f });
  };

  return (
    <CellButton
      canEdit={canEdit}
      variant={variant}
      label={`${column.title}: ${from && to ? formatRange(from, to) : "empty"}`}
      width="w-auto"
      editor={(close) => (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-3">
            <div>
              <div className="mb-1 text-xs font-medium text-text-muted">Start</div>
              {coarsePointer() ? <Input type="date" value={draftFrom} onChange={(e) => { setDraftFrom(e.target.value); if (to) commit(e.target.value, to); }} aria-label="Start" /> : <DateGrid value={draftFrom || from} label="Start" onChange={(d) => { setDraftFrom(d); if (to) commit(d, to); }} />}
            </div>
            <div>
              <div className="mb-1 text-xs font-medium text-text-muted">End</div>
              {coarsePointer() ? <Input type="date" value={to ?? ""} onChange={(e) => commit(draftFrom || from || e.target.value, e.target.value)} aria-label="End" /> : <DateGrid value={to} label="End" min={draftFrom || from} onChange={(d) => { commit(draftFrom || from || d, d); close(); }} />}
            </div>
          </div>
          <div className="flex justify-end border-t border-border pt-2">
            <Button variant="ghost" size="sm" disabled={!from} onClick={() => { onChange(null); setDraftFrom(""); close(); }}>Clear</Button>
          </div>
        </div>
      )}
    >
      {from && to ? (
        <span className={cn("relative flex h-6 w-full items-center justify-center overflow-hidden rounded-pill bg-surface-2 text-xs font-medium", pastDue && "bg-danger-soft text-danger")}>
          <span aria-hidden className={cn("absolute inset-y-0 left-0", pastDue ? "bg-danger/20" : "bg-brand-soft")} style={{ width: `${fill * 100}%` }} />
          <span className="relative truncate px-2">{formatRange(from, to)}</span>
        </span>
      ) : (
        <Muted>{variant === "field" ? "Set a timeline" : ""}</Muted>
      )}
    </CellButton>
  );
}

export const timelineModule: ColumnModule = {
  type: "timeline",
  label: "Timeline",
  description: "A start and an end date, with the elapsed share filled in.",
  icon: CalendarRange,
  group: "essential",
  defaultSettings: () => ({}),
  schema: z.object({ from: day, to: day }),
  toText: (value) => (value?.from && value?.to ? `${value.from} - ${value.to}` : ""),
  sortKey: (value) => (value?.from ? String(value.from) : null),
  filterOps: dateOps,
  matches: (value, op, operand, _c, board) => {
    if (op === "is_past") return matchDay(value?.to as string | undefined, op, operand, board);
    return matchDay(value?.from as string | undefined, op, operand, board);
  },
  summaries: ["none"],
  groupKey: (value) => (value?.from ? { key: String(value.from), label: formatDay(String(value.from)) } : { key: "", label: "No timeline" }),
  Cell: TimelineCell,
};
