"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { DndContext, DragOverlay, PointerSensor, KeyboardSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { Plus, Settings2 } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { EmptyState } from "@/components/ui/empty-state";
import { labelBg } from "@/components/ui/status-chip";
import { AvatarStack } from "@/components/ui/avatar-stack";
import { moduleFor } from "@/lib/columns";
import { labelsOf } from "@/lib/columns/status";
import type { BoardContext, Column, Item } from "@/lib/columns/types";
import { applyView, canEditItem, cellsOf, cellText, type CellIndex } from "@/lib/board/model";
import { settingsOf, type BoardSnapshot, type ViewRow } from "@/lib/board/types";
import type { BoardMutations } from "@/lib/board/mutations";
import type { ToolbarState } from "@/components/board/toolbar";

type Props = { snapshot: BoardSnapshot; index: CellIndex; ctx: BoardContext; mutations: BoardMutations; view: ViewRow; toolbar: ToolbarState };

/** S08: lanes per label of a status column, cards with chosen columns, drag between lanes. */
export function KanbanView({ snapshot: s, index, ctx, mutations, view, toolbar }: Props) {
  const settings = settingsOf(view);
  const statusCols = s.columns.filter((c) => c.scope === "item" && (c.type === "status" || c.type === "priority"));
  const column = statusCols.find((c) => c.id === settings.kanban_column_id) ?? statusCols[0];
  const cardCols = s.columns.filter((c) => c.scope === "item" && (settings.card_column_ids ?? []).includes(c.id));
  const merged = useMemo(() => ({ ...view, settings: { ...settings, group_by: null, search: toolbar.search, person_filter: toolbar.persons } }) as ViewRow, [view, settings, toolbar]);
  const { sections } = useMemo(() => applyView(s, index, ctx, merged), [s, index, ctx, merged]);
  const items = useMemo(() => sections.flatMap((sec) => sec.items), [sections]);
  const [active, setActive] = useState<Item | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor));
  const can = s.access.can_edit_structure;

  if (!column) {
    return <EmptyState title="Kanban needs a status column" description="Add a Status or Priority column to the board, then come back to this view." />;
  }
  const labels = labelsOf(column);
  const lanes = [...labels.map((l) => ({ id: l.id, title: l.label, color: l.color })), { id: "", title: `No ${column.title}`, color: "gray" }];
  const laneItems = (id: string) => items.filter((i) => (cellsOf(index, i.id)[column.id]?.label_id ?? "") === id);

  const onDragEnd = (e: DragEndEvent) => {
    setActive(null);
    const item = items.find((i) => i.id === e.active.id);
    const lane = e.over?.id as string | undefined;
    if (!item || lane === undefined) return;
    const current = (cellsOf(index, item.id)[column.id]?.label_id as string | undefined) ?? "";
    if (lane === current) return;
    mutations.setCell(item, column, lane ? { label_id: lane } : null);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border px-3 py-1.5 text-xs text-text-muted">
        <span>Lanes by <strong className="text-text">{column.title}</strong></span>
        {can ? (
          <Popover>
            <PopoverTrigger asChild><Button variant="ghost" size="xs"><Settings2 /> Settings</Button></PopoverTrigger>
            <PopoverContent align="start" className="w-72 space-y-3 p-3">
              <label className="block space-y-1 text-sm"><span className="font-medium">Lane column</span>
                <select className="h-8 w-full rounded-md border border-border-input bg-bg px-2 text-sm" value={column.id} onChange={(e) => mutations.updateView(view, { settings: { ...settings, kanban_column_id: e.target.value } as never })}>
                  {statusCols.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select></label>
              <fieldset className="space-y-1 text-sm"><legend className="font-medium">Show on cards</legend>
                {s.columns.filter((c) => c.scope === "item" && c.id !== column.id).map((c) => (
                  <label key={c.id} className="flex items-center gap-2"><Checkbox checked={cardCols.some((x) => x.id === c.id)} onCheckedChange={(v) => mutations.updateView(view, { settings: { ...settings, card_column_ids: v === true ? [...(settings.card_column_ids ?? []), c.id] : (settings.card_column_ids ?? []).filter((id) => id !== c.id) } as never })} /> {c.title}</label>
                ))}
              </fieldset>
            </PopoverContent>
          </Popover>
        ) : null}
      </div>
      <DndContext sensors={sensors} onDragStart={(e) => setActive(items.find((i) => i.id === e.active.id) ?? null)} onDragEnd={onDragEnd} onDragCancel={() => setActive(null)}>
        <div className="flex h-full min-h-0 gap-3 overflow-x-auto p-3">
          {lanes.map((lane) => (
            <Lane key={lane.id || "none"} id={lane.id} title={lane.title} color={lane.color} count={laneItems(lane.id).length}
              onAdd={s.access.can_edit_items ? async (name) => {
                const group = s.groups.slice().sort((a, b) => a.position - b.position)[0];
                if (!group) return;
                const id = await mutations.addItem({ groupId: group.id, name });
                const created = id ? { ...items[0], id, name } as Item : null;
                if (created && lane.id) mutations.setCell({ ...created, board_id: s.board.id } as Item, column, { label_id: lane.id });
              } : undefined}>
              {laneItems(lane.id).map((item) => <Card key={item.id} item={item} cols={cardCols} s={s} index={index} ctx={ctx} draggable={canEditItem(s, index, item)} />)}
            </Lane>
          ))}
        </div>
        <DragOverlay>{active ? <div className="w-64 rotate-2 rounded-md border border-border bg-bg p-2 text-sm shadow-pop">{active.name}</div> : null}</DragOverlay>
      </DndContext>
    </div>
  );
}

function Lane({ id, title, color, count, children, onAdd }: { id: string; title: string; color: string; count: number; children: React.ReactNode; onAdd?: (name: string) => Promise<void> }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  return (
    <section ref={setNodeRef} aria-label={`${title}, ${count} items`} className={cn("flex w-kanban-card shrink-0 flex-col rounded-lg bg-surface", isOver && "ring-2 ring-brand")}>
      <header className="flex items-center gap-2 p-2">
        <span className={cn("h-5 w-1.5 rounded-pill", labelBg[color as keyof typeof labelBg] ?? labelBg.gray)} aria-hidden />
        <h2 className="truncate text-sm font-semibold">{title}</h2>
        <span className="text-xs text-text-muted">{count}</span>
      </header>
      <ul className="flex min-h-16 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2">
        {children}
        {count === 0 ? <li className="rounded-md border border-dashed border-border px-2 py-4 text-center text-xs text-text-muted">Drop items here</li> : null}
      </ul>
      {onAdd ? (
        <div className="p-2">
          {adding ? (
            <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="New item" aria-label="New item name" className="h-8"
              onBlur={() => { if (!name.trim()) setAdding(false); }}
              onKeyDown={async (e) => { if (e.key === "Enter" && name.trim()) { const n = name.trim(); setName(""); await onAdd(n); } if (e.key === "Escape") { setName(""); setAdding(false); } }} />
          ) : (
            <Button variant="ghost" size="sm" className="w-full justify-start text-text-muted" onClick={() => setAdding(true)}><Plus /> Add item</Button>
          )}
        </div>
      ) : null}
    </section>
  );
}

function Card({ item, cols, s, index, ctx, draggable }: { item: Item; cols: Column[]; s: BoardSnapshot; index: CellIndex; ctx: BoardContext; draggable: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: item.id, disabled: !draggable });
  const cells = cellsOf(index, item.id);
  return (
    <li ref={setNodeRef} {...attributes} {...listeners} className={cn("rounded-md border border-border bg-bg p-2 shadow-card", draggable && "cursor-grab active:cursor-grabbing", isDragging && "opacity-40")}>
      <Link href={`/boards/${s.board.id}/items/${item.id}?view=${s.views.find((v) => v.type === "kanban")?.id ?? ""}`} className="block text-sm font-medium hover:underline">{item.name}</Link>
      {cols.length ? (
        <dl className="mt-1.5 space-y-0.5 text-xs text-text-muted">
          {cols.map((c) => {
            const value = cells[c.id] ?? null;
            if (!value) return null;
            if (c.type === "people") return <div key={c.id} className="flex items-center gap-1"><dt className="sr-only">{c.title}</dt><dd><AvatarStack people={((value.ids as string[]) ?? []).map((id) => s.members.find((m) => m.id === id) ?? { id, name: "?" })} size={24} max={3} /></dd></div>;
            return <div key={c.id} className="flex gap-1"><dt className="shrink-0">{c.title}:</dt><dd className="truncate text-text">{moduleFor(c.type).toText(value, c, ctx) || cellText(s, item.id, c.id)}</dd></div>;
          })}
        </dl>
      ) : null}
    </li>
  );
}
