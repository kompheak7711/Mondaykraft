"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, dateFnsLocalizer, type View as RbcView } from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import { addDays, differenceInCalendarDays, format, getDay, parse, startOfWeek } from "date-fns";
import { enUS } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import { EmptyState } from "@/components/ui/empty-state";
import { LABEL_COLORS } from "@/components/ui/status-chip";
import type { BoardContext, Item } from "@/lib/columns/types";
import { parseDay } from "@/lib/format";
import { applyView, canEditItem, cellsOf, type CellIndex } from "@/lib/board/model";
import { settingsOf, type BoardSnapshot, type ViewRow } from "@/lib/board/types";
import type { BoardMutations } from "@/lib/board/mutations";
import type { ToolbarState } from "@/components/board/toolbar";

type Props = { snapshot: BoardSnapshot; index: CellIndex; ctx: BoardContext; mutations: BoardMutations; view: ViewRow; toolbar: ToolbarState };
type Ev = { id: string; title: string; start: Date; end: Date; allDay: boolean; item: Item; color: string };

const localizer = dateFnsLocalizer({ format, parse, startOfWeek: (d: Date) => startOfWeek(d, { weekStartsOn: 1 }), getDay, locales: { "en-US": enUS } });
const DnDCalendar = withDragAndDrop<Ev>(Calendar);
const colorVar = (c: string) => `var(--tk-label-${(LABEL_COLORS as readonly string[]).includes(c) ? c : "gray"})`;

/** S09: items on a month, week or day grid by a date or timeline column; drag a chip to move its date. */
export function CalendarView({ snapshot: s, index, ctx, mutations, view, toolbar }: Props) {
  const settings = settingsOf(view);
  const dateCols = s.columns.filter((c) => c.scope === "item" && (c.type === "date" || c.type === "timeline"));
  const column = dateCols.find((c) => c.id === settings.calendar_column_id) ?? dateCols[0];
  const router = useRouter();
  const [rbcView, setRbcView] = useState<RbcView>("month");
  const [date, setDate] = useState(new Date());
  const merged = useMemo(() => ({ ...view, settings: { ...settings, group_by: null, search: toolbar.search, person_filter: toolbar.persons } }) as ViewRow, [view, settings, toolbar]);
  const { sections } = useMemo(() => applyView(s, index, ctx, merged), [s, index, ctx, merged]);

  const events = useMemo<Ev[]>(() => {
    if (!column) return [];
    const out: Ev[] = [];
    for (const sec of sections) for (const item of sec.items) {
      const v = cellsOf(index, item.id)[column.id];
      if (!v) continue;
      const start = parseDay(column.type === "date" ? (v.date as string) : (v.from as string));
      const end = column.type === "date" ? start : parseDay(v.to as string);
      if (!start || !end) continue;
      out.push({ id: item.id, title: item.name, start, end: addDays(end, 1), allDay: true, item, color: sec.color });
    }
    return out;
  }, [sections, index, column]);

  if (!column) return <EmptyState title="Calendar needs a date column" description="Add a Date or Timeline column to the board, then come back to this view." />;

  const move = ({ event, start }: { event: Ev; start: Date | string }) => {
    if (!canEditItem(s, index, event.item)) return;
    const day = format(typeof start === "string" ? new Date(start) : start, "yyyy-MM-dd");
    const v = cellsOf(index, event.item.id)[column.id] ?? {};
    if (column.type === "date") mutations.setCell(event.item, column, { ...v, date: day });
    else {
      const len = differenceInCalendarDays(parseDay(v.to as string)!, parseDay(v.from as string)!);
      mutations.setCell(event.item, column, { from: day, to: format(addDays(parseDay(day)!, len), "yyyy-MM-dd") });
    }
  };

  return (
    <div className="flex h-full flex-col">
      {s.access.can_edit_structure && dateCols.length > 1 ? (
        <div className="flex items-center gap-2 border-b border-border px-3 py-1.5 text-xs text-text-muted">Dates from
          <select className="h-7 rounded-md border border-border-input bg-bg px-2 text-sm" value={column.id} aria-label="Date column" onChange={(e) => mutations.updateView(view, { settings: { ...settings, calendar_column_id: e.target.value } as never })}>
            {dateCols.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </div>
      ) : null}
      <div className="min-h-0 flex-1 p-3 text-sm">
        <DnDCalendar
          localizer={localizer}
          events={events}
          view={rbcView}
          onView={setRbcView}
          date={date}
          onNavigate={setDate}
          views={["month", "week", "day"]}
          popup
          onSelectEvent={(e) => router.push(`/boards/${s.board.id}/items/${e.id}?view=${view.id}`)}
          onEventDrop={move}
          draggableAccessor={(e) => canEditItem(s, index, e.item)}
          resizable={false}
          eventPropGetter={(e) => ({ style: { backgroundColor: "var(--tk-surface-2)", color: "var(--tk-text)", borderLeft: `4px solid ${colorVar(e.color)}`, borderRadius: 4, fontSize: 12 } })}
          style={{ height: "100%" }}
        />
      </div>
    </div>
  );
}
