"use client";

import { useState } from "react";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { BarChart3, CalendarDays, ChevronDown, EyeOff, GanttChart, GripVertical, KanbanSquare, MoreHorizontal, Plus, Table2 } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { settingsOf, type BoardSnapshot, type ViewRow, type ViewSettings } from "@/lib/board/types";
import type { BoardMutations } from "@/lib/board/mutations";

export const viewTypes: { type: ViewRow["type"]; label: string; icon: typeof Table2; needs?: string }[] = [
  { type: "table", label: "Table", icon: Table2 },
  { type: "kanban", label: "Kanban", icon: KanbanSquare, needs: "status" },
  { type: "calendar", label: "Calendar", icon: CalendarDays, needs: "date" },
  { type: "timeline", label: "Timeline", icon: GanttChart, needs: "timeline" },
  { type: "chart", label: "Chart", icon: BarChart3 },
];

export function ViewsBar({ snapshot: s, mutations, activeView, onSelect }: { snapshot: BoardSnapshot; mutations: BoardMutations; activeView: ViewRow | undefined; onSelect: (id: string) => void }) {
  const [renaming, setRenaming] = useState<ViewRow | null>(null);
  const [name, setName] = useState("");
  const can = s.access.can_edit_structure;
  // Hidden views stay on the bar for editors (greyed, with an eye-off icon) and vanish for everyone else.
  const views = s.views.slice().sort((a, b) => a.position - b.position).filter((v) => can || !settingsOf(v).hidden);
  const shown = views.filter((v) => !settingsOf(v).hidden).length;
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const add = async (type: ViewRow["type"]) => {
    const meta = viewTypes.find((v) => v.type === type)!;
    const settings: ViewSettings = {};
    const first = (t: string) => s.columns.find((c) => c.scope === "item" && c.type === t)?.id;
    if (type === "kanban") settings.kanban_column_id = first("status");
    if (type === "calendar") settings.calendar_column_id = first("date");
    if (type === "timeline") settings.timeline_column_id = first("timeline");
    if (type === "chart") settings.chart = { type: "bar", x_column_id: first("status"), y_fn: "count" };
    const row = await mutations.addView(type, meta.label, settings);
    if (row) onSelect(row.id);
  };

  const commitRename = () => {
    if (renaming && name.trim() && name.trim() !== renaming.name) mutations.updateView(renaming, { name: name.trim() });
    setRenaming(null);
  };

  // Dropping to the right lands after the target; to the left lands before it (after the target's predecessor).
  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.over.id === e.active.id) return;
    const from = views.findIndex((v) => v.id === e.active.id), to = views.findIndex((v) => v.id === e.over!.id);
    const without = views.filter((v) => v.id !== e.active.id);
    void mutations.moveView(String(e.active.id), from < to ? String(e.over.id) : to > 0 ? without[to - 1].id : null);
  };

  return (
    <nav aria-label="Views" className="flex h-views-bar shrink-0 items-center gap-0.5 overflow-x-auto border-b border-border px-2 sm:px-4">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={views.map((v) => v.id)} strategy={horizontalListSortingStrategy}>
          {views.map((v) => (
            <ViewTab key={v.id} view={v} active={v.id === activeView?.id} can={can} renaming={renaming?.id === v.id} name={name} setName={setName} commitRename={commitRename} cancelRename={() => setRenaming(null)}
              startRename={() => { setRenaming(v); setName(v.name); }} onSelect={() => onSelect(v.id)}
              onDuplicate={async () => { const row = await mutations.addView(v.type, `${v.name} copy`, (v.settings as ViewSettings) ?? {}); if (row) onSelect(row.id); }}
              onDefault={() => mutations.setDefaultView(v)} canRemove={views.length > 1}
              hidden={Boolean(settingsOf(v).hidden)} canHide={shown > 1} onHide={() => mutations.updateView(v, { settings: { ...settingsOf(v), hidden: !settingsOf(v).hidden || undefined } as never })}
              onRemove={() => { mutations.deleteView(v); const other = views.find((x) => x.id !== v.id); if (other) onSelect(other.id); }} />
          ))}
        </SortableContext>
      </DndContext>
      {can ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="shrink-0 text-text-muted"><Plus /> Add view <ChevronDown className="size-3" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {viewTypes.map((t) => <DropdownMenuItem key={t.type} onSelect={() => add(t.type)}><t.icon className="size-4" /> {t.label}</DropdownMenuItem>)}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </nav>
  );
}

type TabProps = { view: ViewRow; active: boolean; can: boolean; renaming: boolean; name: string; setName: (n: string) => void; commitRename: () => void; cancelRename: () => void; startRename: () => void; onSelect: () => void; onDuplicate: () => void; onDefault: () => void; canRemove: boolean; onRemove: () => void; hidden: boolean; canHide: boolean; onHide: () => void };

/** One tab: a grip to drag it (pointer, or Space + arrows), the name, and the options menu when active. */
function ViewTab({ view: v, active, can, renaming, name, setName, commitRename, cancelRename, startRename, onSelect, onDuplicate, onDefault, canRemove, onRemove, hidden, canHide, onHide }: TabProps) {
  const meta = viewTypes.find((t) => t.type === v.type) ?? viewTypes[0];
  const Icon = meta.icon;
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: v.id, disabled: !can });
  return (
    <div ref={setNodeRef} style={{ transform: transform ? `translate3d(${Math.round(transform.x)}px, 0, 0)` : undefined, transition }}
      className={cn("group flex h-full shrink-0 items-center border-b-2", active ? "border-brand" : "border-transparent", isDragging && "z-10 opacity-60")}>
      {can ? (
        <button type="button" ref={setActivatorNodeRef} {...attributes} {...listeners} aria-label={`Move ${v.name} view`}
          className="flex size-5 cursor-grab items-center justify-center rounded-sm text-text-muted opacity-0 hover:bg-surface-2 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-brand group-hover:opacity-100 active:cursor-grabbing">
          <GripVertical className="size-3.5" />
        </button>
      ) : null}
      {renaming ? (
        <Input value={name} onChange={(e) => setName(e.target.value)} onBlur={commitRename} onKeyDown={(e) => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") cancelRename(); }} aria-label="View name" className="h-7 w-36" autoFocus maxLength={120} />
      ) : (
        <button type="button" aria-current={active ? "page" : undefined} onClick={onSelect} onDoubleClick={() => { if (can) startRename(); }}
          className={cn("flex h-8 items-center gap-1.5 rounded-md px-2 text-sm hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-brand", active ? "font-medium text-brand-text" : "text-text-muted")}>
          <Icon className="size-4" aria-hidden /> <span className={cn(hidden && "text-text-muted/70 line-through")}>{v.name}</span>{v.is_default ? <span className="sr-only"> (default)</span> : null}
          {hidden ? <><EyeOff className="size-3.5 text-text-muted" aria-hidden /><span className="sr-only"> (hidden from viewers)</span></> : null}
        </button>
      )}
      {can && active ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild><IconButton aria-label={`${v.name} view options`} size="sm"><MoreHorizontal /></IconButton></DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onSelect={startRename}>Rename</DropdownMenuItem>
            <DropdownMenuItem onSelect={onDuplicate}>Duplicate</DropdownMenuItem>
            <DropdownMenuItem disabled={v.is_default} onSelect={onDefault}>Set as default</DropdownMenuItem>
            <DropdownMenuItem disabled={!hidden && !canHide} onSelect={onHide}>{hidden ? "Show view" : "Hide view"}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" disabled={!canRemove} onSelect={onRemove}>Remove view</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
}
