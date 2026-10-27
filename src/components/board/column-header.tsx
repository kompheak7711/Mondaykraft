"use client";

import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, Copy, EyeOff, MoreHorizontal, Pencil, Plus, Settings2, Trash2 } from "lucide-react";
import { cn } from "cn";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { columnCenter, moduleFor } from "@/lib/columns";
import type { Column, ColumnType } from "@/lib/columns/types";
import { settingsOf, type ViewRow } from "@/lib/board/types";
import type { BoardMutations } from "@/lib/board/mutations";

type Props = {
  column: Column;
  view: ViewRow | undefined;
  canEdit: boolean;
  mutations: BoardMutations;
  onOpenSettings: (c: Column) => void;
  siblings: Column[];
};

/** A column header: title (rename inline), type icon, sort indicator, menu, resize handle. */
export function ColumnHeader({ column, view, canEdit, mutations, onOpenSettings, siblings }: Props) {
  const m = moduleFor(column.type);
  const [renaming, setRenaming] = useState(false);
  const [title, setTitle] = useState(column.title);
  const startX = useRef<number | null>(null);
  const startW = useRef(column.width);
  const settings = settingsOf(view);
  const sortRule = settings.sort?.find((r) => r.column_id === column.id);
  const index = siblings.findIndex((c) => c.id === column.id);

  const commit = () => {
    setRenaming(false);
    const next = title.trim();
    if (next && next !== column.title) mutations.updateColumn(column, { title: next });
    else setTitle(column.title);
  };
  const toggleSort = () => {
    if (!view || !canEdit) return;
    const rest = (settings.sort ?? []).filter((r) => r.column_id !== column.id);
    const next = !sortRule ? [{ column_id: column.id, dir: "asc" as const }, ...rest] : sortRule.dir === "asc" ? [{ column_id: column.id, dir: "desc" as const }, ...rest] : rest;
    mutations.updateView(view, { settings: { ...settings, sort: next } as never });
  };
  const hide = () => {
    if (!view) return;
    mutations.updateView(view, { settings: { ...settings, hidden_column_ids: [...(settings.hidden_column_ids ?? []), column.id] } as never });
  };
  const onResize = (e: React.PointerEvent) => {
    startX.current = e.clientX;
    startW.current = column.width;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onResizeMove = (e: React.PointerEvent) => {
    if (startX.current === null) return;
    const w = Math.min(1000, Math.max(60, startW.current + e.clientX - startX.current));
    (e.currentTarget.parentElement as HTMLElement).style.width = `${w}px`;
  };
  const onResizeEnd = (e: React.PointerEvent) => {
    if (startX.current === null) return;
    const w = Math.min(1000, Math.max(60, startW.current + e.clientX - startX.current));
    startX.current = null;
    if (w !== column.width) mutations.updateColumn(column, { width: w });
  };

  return (
    <div role="columnheader" aria-sort={sortRule ? (sortRule.dir === "asc" ? "ascending" : "descending") : "none"} style={{ width: column.width }} className="group/col relative flex h-row shrink-0 items-center gap-1 border-r border-b border-border bg-bg px-2 text-xs font-medium text-text-muted">
      <Tooltip>
        <TooltipTrigger asChild><span className="inline-flex"><m.icon className="size-3.5 shrink-0" aria-hidden /></span></TooltipTrigger>
        <TooltipContent>{m.label}{column.description ? `: ${column.description}` : ""}</TooltipContent>
      </Tooltip>
      {renaming ? (
        <Input value={title} onChange={(e) => setTitle(e.target.value)} onBlur={commit} onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setTitle(column.title); setRenaming(false); } }} aria-label="Column title" className="h-6 min-w-0 flex-1 px-1 text-xs" autoFocus maxLength={120} />
      ) : (
        <button type="button" onClick={toggleSort} onDoubleClick={() => canEdit && setRenaming(true)} className="min-w-0 flex-1 truncate text-left hover:text-text" title={canEdit ? `${column.title}. Click to sort, double-click to rename` : column.title}>
          {column.title}
        </button>
      )}
      {sortRule ? (sortRule.dir === "asc" ? <ArrowUp className="size-3 text-brand-text" aria-hidden /> : <ArrowDown className="size-3 text-brand-text" aria-hidden />) : null}
      {canEdit ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <IconButton aria-label={`${column.title} column options`} size="sm" className="opacity-0 group-hover/col:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"><MoreHorizontal /></IconButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem onSelect={() => setRenaming(true)}><Pencil className="size-4" /> Rename</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onOpenSettings(column)}><Settings2 className="size-4" /> Settings</DropdownMenuItem>
            <DropdownMenuItem onSelect={toggleSort}>{sortRule?.dir === "asc" ? <ArrowDown className="size-4" /> : <ArrowUp className="size-4" />} {sortRule ? (sortRule.dir === "asc" ? "Sort descending" : "Clear sort") : "Sort ascending"}</DropdownMenuItem>
            <DropdownMenuItem onSelect={hide}><EyeOff className="size-4" /> Hide in this view</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled={index <= 0} onSelect={() => mutations.moveColumn(column.id, index > 1 ? siblings[index - 2].id : null)}>Move left</DropdownMenuItem>
            <DropdownMenuItem disabled={index < 0 || index >= siblings.length - 1} onSelect={() => mutations.moveColumn(column.id, siblings[index + 1].id)}>Move right</DropdownMenuItem>
            <DropdownMenuItem onSelect={async () => { const c = await mutations.addColumn(column.type, column.scope, `${column.title} copy`); if (c) { await mutations.updateColumn(c, { settings: column.settings, width: column.width }); } }}><Copy className="size-4" /> Duplicate column</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => mutations.deleteColumn(column)}><Trash2 className="size-4" /> Remove column</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
      {canEdit ? (
        <div role="separator" aria-orientation="vertical" aria-label={`Resize ${column.title}`} onPointerDown={onResize} onPointerMove={onResizeMove} onPointerUp={onResizeEnd}
          className="absolute top-0 -right-1 z-10 h-full w-2 cursor-col-resize touch-none hover:bg-brand/40" />
      ) : null}
    </div>
  );
}

/** S04: the column center. */
export function AddColumnButton({ scope, mutations, className }: { scope: "item" | "subitem"; mutations: BoardMutations; className?: string }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const needle = q.trim().toLowerCase();
  const list = columnCenter.filter((m) => !needle || m.label.toLowerCase().includes(needle) || m.description.toLowerCase().includes(needle));
  const essentials = list.filter((m) => m.group === "essential");
  const more = list.filter((m) => m.group === "more");
  const add = async (type: ColumnType) => {
    setOpen(false);
    setQ("");
    await mutations.addColumn(type, scope);
  };
  const renderGroup = (title: string, items: typeof list) => items.length ? (
    <div>
      <div className="px-2 py-1 text-xs font-semibold text-text-muted">{title}</div>
      <ul className="grid grid-cols-2 gap-1">
        {items.map((m) => (
          <li key={m.type}>
            <button type="button" onClick={() => add(m.type)} className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-brand">
              <m.icon className="mt-0.5 size-4 shrink-0 text-text-muted" aria-hidden />
              <span><span className="block text-sm font-medium">{m.label}</span><span className="block text-xs text-text-muted">{m.description}</span></span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  ) : null;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <IconButton aria-label="Add column" size="sm" className={cn("text-text-muted", className)}><Plus /></IconButton>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(92vw,520px)] space-y-2 p-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search column types" aria-label="Search column types" className="h-8" autoFocus />
        <div className="max-h-96 space-y-2 overflow-y-auto">
          {renderGroup("Essentials", essentials)}
          {renderGroup("More", more)}
          {list.length === 0 ? <p className="px-2 py-3 text-sm text-text-muted">No column type matches.</p> : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
