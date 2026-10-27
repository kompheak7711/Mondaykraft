"use client";

import { useState } from "react";
import { BarChart3, CalendarDays, ChevronDown, GanttChart, KanbanSquare, MoreHorizontal, Plus, Table2 } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { BoardSnapshot, ViewRow, ViewSettings } from "@/lib/board/types";
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
  const views = s.views.slice().sort((a, b) => a.position - b.position);

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

  return (
    <nav aria-label="Views" className="flex h-views-bar shrink-0 items-center gap-0.5 overflow-x-auto border-b border-border px-2 sm:px-4">
      {views.map((v) => {
        const meta = viewTypes.find((t) => t.type === v.type) ?? viewTypes[0];
        const Icon = meta.icon;
        const active = v.id === activeView?.id;
        return (
          <div key={v.id} className={cn("group flex h-full shrink-0 items-center border-b-2", active ? "border-brand" : "border-transparent")}>
            {renaming?.id === v.id ? (
              <Input value={name} onChange={(e) => setName(e.target.value)} onBlur={commitRename} onKeyDown={(e) => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setRenaming(null); }} aria-label="View name" className="h-7 w-36" autoFocus maxLength={120} />
            ) : (
              <button type="button" aria-current={active ? "page" : undefined} onClick={() => onSelect(v.id)} onDoubleClick={() => { if (can) { setRenaming(v); setName(v.name); } }}
                className={cn("flex h-8 items-center gap-1.5 rounded-md px-2 text-sm hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-brand", active ? "font-medium text-brand-text" : "text-text-muted")}>
                <Icon className="size-4" aria-hidden /> {v.name}{v.is_default ? <span className="sr-only"> (default)</span> : null}
              </button>
            )}
            {can && active ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild><IconButton aria-label={`${v.name} view options`} size="sm"><MoreHorizontal /></IconButton></DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onSelect={() => { setRenaming(v); setName(v.name); }}>Rename</DropdownMenuItem>
                  <DropdownMenuItem onSelect={async () => { const row = await mutations.addView(v.type, `${v.name} copy`, (v.settings as ViewSettings) ?? {}); if (row) onSelect(row.id); }}>Duplicate</DropdownMenuItem>
                  <DropdownMenuItem disabled={v.is_default} onSelect={() => mutations.setDefaultView(v)}>Set as default</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" disabled={views.length <= 1} onSelect={() => { mutations.deleteView(v); const other = views.find((x) => x.id !== v.id); if (other) onSelect(other.id); }}>Remove view</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        );
      })}
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
