"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { addDays, differenceInCalendarDays, eachMonthOfInterval, eachWeekOfInterval, format, startOfMonth, startOfWeek } from "date-fns";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LABEL_COLORS } from "@/components/ui/status-chip";
import type { BoardContext, Item } from "@/lib/columns/types";
import { labelOf } from "@/lib/columns/status";
import { parseDay, todayKey } from "@/lib/format";
import { applyView, canEditItem, cellsOf, type CellIndex } from "@/lib/board/model";
import { settingsOf, type BoardSnapshot, type ViewRow } from "@/lib/board/types";
import type { BoardMutations } from "@/lib/board/mutations";
import type { ToolbarState } from "@/components/board/toolbar";

type Props = { snapshot: BoardSnapshot; index: CellIndex; ctx: BoardContext; mutations: BoardMutations; view: ViewRow; toolbar: ToolbarState };
const zooms = { days: 40, weeks: 14, months: 4, quarters: 1.4, years: 0.35 } as const;
type Zoom = keyof typeof zooms;
const colorVar = (c: string) => `var(--tk-label-${(LABEL_COLORS as readonly string[]).includes(c) ? c : "gray"})`;
const fmt = (d: Date) => format(d, "yyyy-MM-dd");

/** S10: items as bars on a time axis by a timeline column. Drag a bar to move it, drag its ends to resize. */
export function GanttView({ snapshot: s, index, ctx, mutations, view, toolbar }: Props) {
  const settings = settingsOf(view);
  const tlCols = s.columns.filter((c) => c.scope === "item" && c.type === "timeline");
  const column = tlCols.find((c) => c.id === settings.timeline_column_id) ?? tlCols[0];
  const [zoom, setZoom] = useState<Zoom>("weeks");
  const colorBy = settings.color_by ?? "group";
  const statusCol = s.columns.find((c) => c.scope === "item" && c.type === "status");
  const merged = useMemo(() => ({ ...view, settings: { ...settings, group_by: null, search: toolbar.search, person_filter: toolbar.persons } }) as ViewRow, [view, settings, toolbar]);
  const { sections } = useMemo(() => applyView(s, index, ctx, merged), [s, index, ctx, merged]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const rows = useMemo(() => sections.flatMap((sec) => sec.items.map((item) => {
    const v = column ? cellsOf(index, item.id)[column.id] : null;
    const from = parseDay(v?.from as string | undefined);
    const to = parseDay(v?.to as string | undefined);
    const color = colorBy === "status" && statusCol ? (labelOf(statusCol, cellsOf(index, item.id)[statusCol.id] ?? null)?.color ?? "gray") : sec.color;
    return { item, from, to, color, section: sec.title };
  })), [sections, index, column, colorBy, statusCol]);

  if (!column) return <EmptyState title="Timeline needs a timeline column" description="Add a Timeline column to the board, then come back to this view." />;

  const today = parseDay(todayKey(ctx.timezone))!;
  const dated = rows.filter((r) => r.from && r.to);
  const min = addDays(startOfWeek(dated.length ? new Date(Math.min(...dated.map((r) => r.from!.getTime()), today.getTime())) : today, { weekStartsOn: 1 }), -7);
  const max = addDays(dated.length ? new Date(Math.max(...dated.map((r) => r.to!.getTime()), today.getTime())) : today, 35);
  const pxPerDay = zooms[zoom];
  const totalDays = differenceInCalendarDays(max, min) + 1;
  const width = totalDays * pxPerDay;
  const x = (d: Date) => differenceInCalendarDays(d, min) * pxPerDay;
  const ticks = zoom === "days" || zoom === "weeks" ? eachWeekOfInterval({ start: min, end: max }, { weekStartsOn: 1 }).map((d) => ({ d, label: format(d, zoom === "days" ? "d MMM" : "d MMM") })) : eachMonthOfInterval({ start: startOfMonth(min), end: max }).map((d) => ({ d, label: format(d, zoom === "years" ? "MMM yy" : "MMM yyyy") }));

  const startDrag = (e: React.PointerEvent, row: (typeof rows)[number], mode: "move" | "start" | "end") => {
    if (!row.from || !row.to || !canEditItem(s, index, row.item)) return;
    e.preventDefault();
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);
    const x0 = e.clientX;
    const origin = { from: row.from, to: row.to };
    const bar = el.closest<HTMLElement>("[data-bar]")!;
    const onMove = (ev: PointerEvent) => {
      const days = Math.round((ev.clientX - x0) / pxPerDay);
      const from = mode === "end" ? origin.from : addDays(origin.from, days);
      const to = mode === "start" ? origin.to : addDays(origin.to, days);
      if (to < from) return;
      bar.style.left = `${x(from)}px`;
      bar.style.width = `${(differenceInCalendarDays(to, from) + 1) * pxPerDay}px`;
      bar.dataset.from = fmt(from);
      bar.dataset.to = fmt(to);
    };
    const onUp = () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      const from = bar.dataset.from ?? fmt(origin.from);
      const to = bar.dataset.to ?? fmt(origin.to);
      if (from !== fmt(origin.from) || to !== fmt(origin.to)) mutations.setCell(row.item, column, { from, to });
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-1.5 text-xs text-text-muted">
        <span>Zoom</span>
        {(Object.keys(zooms) as Zoom[]).map((z) => <Button key={z} variant={z === zoom ? "secondary" : "ghost"} size="xs" aria-pressed={z === zoom} onClick={() => setZoom(z)}>{z}</Button>)}
        <span className="ml-2">Colour by</span>
        <Button variant={colorBy === "group" ? "secondary" : "ghost"} size="xs" onClick={() => mutations.updateView(view, { settings: { ...settings, color_by: "group" } as never })}>group</Button>
        <Button variant={colorBy === "status" ? "secondary" : "ghost"} size="xs" disabled={!statusCol} onClick={() => mutations.updateView(view, { settings: { ...settings, color_by: "status" } as never })}>status</Button>
        <Button variant="ghost" size="xs" className="ml-auto" onClick={() => scrollRef.current?.scrollTo({ left: Math.max(0, x(today) - 200), behavior: "smooth" })}>Today</Button>
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="w-64 shrink-0 overflow-hidden border-r border-border">
          <div className="h-8 border-b border-border bg-surface px-3 text-xs leading-8 font-medium text-text-muted">Item</div>
          {rows.map((r) => <div key={r.item.id} className="flex h-9 items-center border-b border-border px-3 text-sm"><Link href={`/boards/${s.board.id}/items/${r.item.id}?view=${view.id}`} className="truncate hover:underline">{r.item.name}</Link></div>)}
        </div>
        <div ref={scrollRef} className="min-w-0 flex-1 overflow-auto">
          <div style={{ width }} className="relative">
            <div className="sticky top-0 z-10 flex h-8 border-b border-border bg-surface text-xs text-text-muted">
              {ticks.map((t) => <div key={t.d.toISOString()} className="absolute top-0 h-8 border-l border-border pl-1 leading-8" style={{ left: x(t.d) }}>{t.label}</div>)}
            </div>
            <div className="absolute top-0 bottom-0 w-0.5 bg-danger" style={{ left: x(today) }} aria-hidden title="Today" />
            {rows.map((r) => (
              <div key={r.item.id} className="relative h-9 border-b border-border">
                {r.from && r.to ? (
                  <div data-bar data-from={fmt(r.from)} data-to={fmt(r.to)} role="button" tabIndex={0} aria-label={`${r.item.name}: ${format(r.from, "d MMM")} to ${format(r.to, "d MMM")}`}
                    onPointerDown={(e) => startDrag(e, r, "move")}
                    className={cn("absolute top-1.5 flex h-6 items-center rounded-sm px-2 text-xs font-medium text-on-brand select-none", canEditItem(s, index, r.item) && "cursor-grab")}
                    style={{ left: x(r.from), width: Math.max(pxPerDay, (differenceInCalendarDays(r.to, r.from) + 1) * pxPerDay), backgroundColor: colorVar(r.color) }}>
                    <span className="absolute inset-y-0 left-0 w-2 cursor-ew-resize" onPointerDown={(e) => { e.stopPropagation(); startDrag(e, r, "start"); }} aria-hidden />
                    <span className="truncate">{r.item.name}</span>
                    <span className="absolute inset-y-0 right-0 w-2 cursor-ew-resize" onPointerDown={(e) => { e.stopPropagation(); startDrag(e, r, "end"); }} aria-hidden />
                  </div>
                ) : (
                  <span className="absolute top-2 left-2 text-xs text-text-muted">Set a timeline</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
