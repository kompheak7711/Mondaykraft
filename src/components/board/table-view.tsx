"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Archive, ChevronDown, ChevronRight, Copy, FolderInput, MessageSquare, MoreHorizontal, Plus, Trash2, X } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LABEL_COLORS, labelBg } from "@/components/ui/status-chip";
import type { BoardContext, Item } from "@/lib/columns/types";
import { applyView, canEditItem, cellsOf, cellText, subitemsOf, summarize, visibleColumns, type CellIndex, type Section } from "@/lib/board/model";
import { cellKey, settingsOf, type BoardSnapshot, type GroupRow, type ViewRow } from "@/lib/board/types";
import type { BoardMutations } from "@/lib/board/mutations";
import { CellFrame } from "./cell";
import { AddColumnButton, ColumnHeader } from "./column-header";
import type { ToolbarState } from "./toolbar";

type Props = { snapshot: BoardSnapshot; index: CellIndex; ctx: BoardContext; mutations: BoardMutations; view: ViewRow | undefined; toolbar: ToolbarState; flashes: Record<string, number> };

type RowModel =
  | { kind: "section"; key: string; section: Section }
  | { kind: "item"; key: string; item: Item; section: Section }
  | { kind: "subheader"; key: string; parent: Item }
  | { kind: "subitem"; key: string; item: Item; parent: Item }
  | { kind: "addsub"; key: string; parent: Item }
  | { kind: "add"; key: string; section: Section }
  | { kind: "footer"; key: string; section: Section }
  | { kind: "addgroup"; key: string };

const SIZES: Record<RowModel["kind"], number> = { section: 44, item: 36, subheader: 32, subitem: 36, addsub: 36, add: 36, footer: 32, addgroup: 48 };
const LEFT_W = 44;
const NAME_W = 320;
const TAIL_W = 48;
const colorVar = (color: string) => `var(--tk-label-${(LABEL_COLORS as readonly string[]).includes(color) ? color : "gray"})`;

function usePersistedSet(key: string) {
  const [set, setSet] = useState<Set<string>>(new Set());
  useEffect(() => {
    try { setSet(new Set(JSON.parse(localStorage.getItem(key) ?? "[]"))); } catch {}
  }, [key]);
  const toggle = useCallback((id: string) => {
    setSet((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      try { localStorage.setItem(key, JSON.stringify(Array.from(next))); } catch {}
      return next;
    });
  }, [key]);
  return [set, toggle] as const;
}

export function TableView({ snapshot: s, index, ctx, mutations, view, toolbar, flashes }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const params = useSearchParams();
  const [collapsed, toggleCollapsed] = usePersistedSet(`tk_collapsed:${s.board.id}`);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const canItems = s.access.can_edit_items;
  const canStructure = s.access.can_edit_structure;
  const baseSettings = settingsOf(view);
  const groupByOn = Boolean(baseSettings.group_by);

  const merged = useMemo(() => ({ ...(view ?? ({ id: "none", settings: {} } as unknown as ViewRow)), settings: { ...baseSettings, search: toolbar.search, person_filter: toolbar.persons } }) as ViewRow, [view, baseSettings, toolbar.search, toolbar.persons]);
  const { sections, shown, filtered } = useMemo(() => applyView(s, index, ctx, merged), [s, index, ctx, merged]);
  const cols = useMemo(() => visibleColumns(s, view, "item"), [s, view]);
  const subCols = useMemo(() => visibleColumns(s, view, "subitem"), [s, view]);
  const footerFns = useMemo(() => cols.map((c) => (c.type === "numbers" ? String(c.settings.summary ?? "sum") : c.type === "status" || c.type === "priority" ? "battery" : c.type === "checkbox" || c.type === "files" ? "count" : "none")), [cols]);
  const hasFooter = footerFns.some((f) => f !== "none");

  const rows = useMemo<RowModel[]>(() => {
    const out: RowModel[] = [];
    for (const section of sections) {
      out.push({ kind: "section", key: `s:${section.key}`, section });
      if (collapsed.has(section.key)) continue;
      for (const item of section.items) {
        out.push({ kind: "item", key: item.id, item, section });
        if (expanded.has(item.id)) {
          out.push({ kind: "subheader", key: `sh:${item.id}`, parent: item });
          for (const sub of subitemsOf(s, item.id)) out.push({ kind: "subitem", key: sub.id, item: sub, parent: item });
          if (canItems || canEditItem(s, index, item)) out.push({ kind: "addsub", key: `as:${item.id}`, parent: item });
        }
      }
      if (canItems && section.group && !groupByOn) out.push({ kind: "add", key: `a:${section.key}`, section });
      if (hasFooter && section.items.length) out.push({ kind: "footer", key: `f:${section.key}`, section });
    }
    if (canStructure && !groupByOn) out.push({ kind: "addgroup", key: "addgroup" });
    return out;
  }, [sections, collapsed, expanded, s, index, canItems, canStructure, groupByOn, hasFooter]);

  const virtualizer = useVirtualizer({ count: rows.length, getScrollElement: () => scrollRef.current, estimateSize: (i) => SIZES[rows[i].kind], overscan: 8, getItemKey: (i) => rows[i].key });
  const totalWidth = LEFT_W + NAME_W + cols.reduce((w, c) => w + c.width, 0) + TAIL_W;
  const viewParam = params.get("view") ? `?view=${params.get("view")}` : "";

  // Keyboard: arrows move between cells; rows outside the viewport are scrolled in first.
  const onKeyDown = (e: React.KeyboardEvent) => {
    const map: Record<string, [number, number]> = { ArrowRight: [0, 1], ArrowLeft: [0, -1], ArrowDown: [1, 0], ArrowUp: [-1, 0] };
    const d = map[e.key];
    const target = (e.target as HTMLElement).closest<HTMLElement>("[data-cell]");
    if (!d || !target || (e.target as HTMLElement).tagName === "INPUT" || (e.target as HTMLElement).tagName === "TEXTAREA") return;
    e.preventDefault();
    const [r, c] = target.dataset.cell!.split(",").map(Number);
    let r2 = r + d[0];
    const c2 = Math.max(0, c + d[1]);
    while (r2 >= 0 && r2 < rows.length && d[0] !== 0 && rows[r2].kind !== "item" && rows[r2].kind !== "subitem") r2 += d[0];
    if (r2 < 0 || r2 >= rows.length) return;
    const focusCell = () => {
      const el = scrollRef.current?.querySelector<HTMLElement>(`[data-cell="${r2},${c2}"]`);
      const f = el?.querySelector<HTMLElement>("button, a, input, [tabindex]") ?? el;
      f?.focus();
      return Boolean(f);
    };
    if (!focusCell()) { virtualizer.scrollToIndex(r2); requestAnimationFrame(() => requestAnimationFrame(focusCell)); }
  };

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape" && selected.size) setSelected(new Set()); };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [selected.size]);

  if (s.groups.length === 0 && canStructure) {
    return <EmptyState title="This board is empty" description="Add a group to start adding items." action={<Button onClick={() => mutations.addGroup("Group 1")}><Plus /> Add group</Button>} />;
  }
  if (filtered && shown === 0) {
    return <EmptyState title="No items match" description="Change or clear the filters, search and person filter to see items again." />;
  }

  const toggleSelect = (id: string, on: boolean) => setSelected((prev) => { const n = new Set(prev); if (on) n.add(id); else n.delete(id); return n; });

  const renderRow = (row: RowModel, r: number) => {
    switch (row.kind) {
      case "section": return <SectionRow section={row.section} collapsed={collapsed.has(row.section.key)} onToggle={() => toggleCollapsed(row.section.key)} canStructure={canStructure && !groupByOn} mutations={mutations} snapshot={s} width={totalWidth} />;
      case "item":
      case "subitem": {
        const item = row.item;
        const colsHere = row.kind === "item" ? cols : subCols;
        const editable = canEditItem(s, index, item);
        const cells = cellsOf(index, item.id);
        const subCount = row.kind === "item" ? subitemsOf(s, item.id).length : 0;
        return (
          <div role="row" className={cn("flex h-row", selected.has(item.id) && "bg-brand-soft")} style={{ width: totalWidth }}>
            <div role="gridcell" className={cn("sticky left-0 z-10 flex shrink-0 items-center border-r border-b border-border", selected.has(item.id) ? "bg-brand-soft" : "bg-bg")} style={{ width: LEFT_W + NAME_W, borderLeft: `4px solid ${row.kind === "item" ? colorVar(row.section.color) : "transparent"}`, paddingLeft: row.kind === "subitem" ? 28 : 0 }}>
              <div className="flex w-10 shrink-0 items-center justify-center">
                <Checkbox checked={selected.has(item.id)} onCheckedChange={(v) => toggleSelect(item.id, v === true)} aria-label={`Select ${item.name}`} className={cn(!selected.has(item.id) && "opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100")} />
              </div>
              {row.kind === "item" ? (
                <button type="button" aria-expanded={expanded.has(item.id)} aria-label={subCount ? `${subCount} subitems` : "Subitems"} onClick={() => setExpanded((p) => { const n = new Set(p); if (n.has(item.id)) n.delete(item.id); else n.add(item.id); return n; })}
                  className={cn("flex size-6 shrink-0 items-center justify-center rounded-sm text-text-muted hover:bg-surface-2", !subCount && !expanded.has(item.id) && "opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100")}>
                  {expanded.has(item.id) ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                  {subCount ? <span className="sr-only">{subCount}</span> : null}
                </button>
              ) : <span className="w-6 shrink-0" />}
              <NameCell item={item} editable={editable} mutations={mutations} href={`/boards/${s.board.id}/items/${item.id}${viewParam}`} />
              <IconButton aria-label={s.updateCounts[item.id] ? `${s.updateCounts[item.id]} updates` : "Start a conversation"} size="sm" href={`/boards/${s.board.id}/items/${item.id}${viewParam}#updates`} className={cn("mr-1 shrink-0 text-text-muted", !s.updateCounts[item.id] && "opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100")}>
                <MessageSquare />{s.updateCounts[item.id] ? <span aria-hidden className="absolute -top-0.5 -right-0.5 rounded-pill bg-brand px-1 text-[10px] font-semibold leading-4 text-on-brand">{s.updateCounts[item.id]}</span> : null}
              </IconButton>
            </div>
            {colsHere.map((c, ci) => (
              <CellFrame key={c.id} row={r} col={ci} item={item} column={c} value={cells[c.id] ?? null} text={cellText(s, item.id, c.id)} cells={cells} canEdit={editable} board={ctx}
                flash={Boolean(flashes[cellKey(item.id, c.id)])} onChange={(v) => mutations.setCell(item, c, v)} style={{ width: c.width }} />
            ))}
            <div className="flex-1 border-b border-border" />
          </div>
        );
      }
      case "subheader":
        return (
          <div role="row" className="flex h-8 bg-surface text-xs font-medium text-text-muted" style={{ width: totalWidth }}>
            <div role="columnheader" className="sticky left-0 z-10 flex shrink-0 items-center border-r border-b border-border bg-surface pl-14" style={{ width: LEFT_W + NAME_W }}>Subitems</div>
            {subCols.map((c) => <div key={c.id} role="columnheader" className="flex shrink-0 items-center gap-1 border-r border-b border-border px-2" style={{ width: c.width }}><span className="truncate">{c.title}</span></div>)}
            <div role="columnheader" className="flex flex-1 items-center border-b border-border px-1">{canStructure ? <AddColumnButton scope="subitem" mutations={mutations} /> : null}</div>
          </div>
        );
      case "addsub":
        return <AddRow width={totalWidth} indent={28} label="Add subitem" onAdd={(name) => mutations.addItem({ parentId: row.parent.id, name })} />;
      case "add":
        return <AddRow width={totalWidth} indent={0} label="Add item" color={row.section.color} onAdd={(name) => mutations.addItem({ groupId: row.section.group!.id, name })} />;
      case "footer":
        return (
          <div role="row" className="flex h-8 text-xs text-text-muted" style={{ width: totalWidth }}>
            <div role="gridcell" className="sticky left-0 z-10 shrink-0 border-r border-b border-border bg-bg" style={{ width: LEFT_W + NAME_W }} />
            {cols.map((c, ci) => {
              const sum = summarize(s, index, c, row.section.items, footerFns[ci]);
              return (
                <div key={c.id} role="gridcell" className="flex shrink-0 items-center overflow-hidden border-r border-b border-border px-2" style={{ width: c.width }} title={sum.battery ? sum.battery.map((b) => `${b.label}: ${b.count}`).join(", ") : undefined}>
                  {sum.text ? <span className="truncate tabular-nums"><span className="mr-1 text-text-muted/70">{footerFns[ci]}</span>{sum.text}</span> : null}
                  {sum.battery ? <span className="flex h-4 w-full overflow-hidden rounded-sm" role="img" aria-label={sum.battery.map((b) => `${b.label} ${b.count}`).join(", ")}>{sum.battery.map((b) => <span key={b.label} className={labelBg[b.color as keyof typeof labelBg] ?? labelBg.gray} style={{ flex: b.count }} />)}</span> : null}
                </div>
              );
            })}
            <div className="flex-1 border-b border-border" />
          </div>
        );
      case "addgroup":
        return (
          <div role="row" className="flex h-12" style={{ width: totalWidth }}>
            <div role="gridcell" className="sticky left-0 flex items-center px-3">
              <Button variant="outline" size="sm" onClick={() => mutations.addGroup()}><Plus /> Add group</Button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="relative flex h-full flex-col">
      <div ref={scrollRef} className="relative h-full overflow-auto" onKeyDown={onKeyDown}>
        <div role="grid" aria-label={s.board.name} aria-rowcount={rows.length} style={{ width: totalWidth, minWidth: "100%" }}>
          <div role="row" className="sticky top-0 z-20 flex bg-bg" style={{ width: totalWidth }}>
            <div role="columnheader" className="sticky left-0 z-30 flex shrink-0 items-center border-r border-b border-border bg-bg px-3 text-xs font-medium text-text-muted" style={{ width: LEFT_W + NAME_W }}>Item</div>
            {cols.map((c) => <ColumnHeader key={c.id} column={c} view={view} canEdit={canStructure} mutations={mutations} onOpenSettings={(col) => ctx.onOpenColumnSettings?.(col)} siblings={cols} />)}
            <div role="columnheader" className="flex flex-1 items-center border-b border-border px-1">{canStructure ? <AddColumnButton scope="item" mutations={mutations} /> : null}</div>
          </div>
          <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
            {virtualizer.getVirtualItems().map((v) => (
              <div key={v.key} data-index={v.index} className="group/row absolute top-0 left-0" style={{ transform: `translateY(${v.start}px)`, width: totalWidth, height: v.size }}>
                {renderRow(rows[v.index], v.index)}
              </div>
            ))}
          </div>
        </div>
      </div>
      {selected.size > 0 ? <BulkBar count={selected.size} ids={Array.from(selected)} snapshot={s} mutations={mutations} onClear={() => setSelected(new Set())} /> : null}
    </div>
  );
}

function NameCell({ item, editable, mutations, href }: { item: Item; editable: boolean; mutations: BoardMutations; href: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.name);
  useEffect(() => { if (!editing) setDraft(item.name); }, [item.name, editing]);
  const commit = () => { setEditing(false); mutations.renameItem(item, draft); };
  if (editing) {
    return <Input value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={commit} onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setDraft(item.name); setEditing(false); } }} aria-label="Item name" className="mx-1 h-7 min-w-0 flex-1 px-1" autoFocus maxLength={500} />;
  }
  return (
    <Link href={href} data-item-name={item.id} onDoubleClick={(e) => { if (editable) { e.preventDefault(); setEditing(true); } }} onKeyDown={(e) => { if (e.key === "F2" && editable) { e.preventDefault(); setEditing(true); } }}
      className="min-w-0 flex-1 truncate px-1 text-sm hover:underline focus-visible:ring-2 focus-visible:ring-brand" title={editable ? `${item.name}. Double-click or F2 to rename` : item.name}>
      {item.name}
    </Link>
  );
}

function AddRow({ width, indent, label, color, onAdd }: { width: number; indent: number; label: string; color?: string; onAdd: (name: string) => Promise<unknown> }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const submit = async () => {
    const n = name.trim();
    if (!n) { setOpen(false); return; }
    setName("");
    await onAdd(n);
  };
  return (
    <div role="row" className="flex h-row" style={{ width }}>
      <div role="gridcell" className="sticky left-0 z-10 flex shrink-0 items-center border-b border-border bg-bg" style={{ width: LEFT_W + NAME_W, borderLeft: `4px solid ${color ? colorVar(color) : "transparent"}`, paddingLeft: indent + 40 }}>
        {open ? (
          <Input value={name} onChange={(e) => setName(e.target.value)} onBlur={() => { if (name.trim()) submit(); else setOpen(false); }} onKeyDown={(e) => { if (e.key === "Enter") submit(); if (e.key === "Escape") { setName(""); setOpen(false); } }} placeholder={label} aria-label={label} className="h-7 flex-1" autoFocus maxLength={500} />
        ) : (
          <button type="button" onClick={() => setOpen(true)} className="flex h-full flex-1 items-center gap-1 px-1 text-sm text-text-muted hover:text-text focus-visible:ring-2 focus-visible:ring-brand"><Plus className="size-4" aria-hidden /> {label}</button>
        )}
      </div>
      <div className="flex-1 border-b border-border" />
    </div>
  );
}

function SectionRow({ section, collapsed, onToggle, canStructure, mutations, snapshot: s, width }: { section: Section; collapsed: boolean; onToggle: () => void; canStructure: boolean; mutations: BoardMutations; snapshot: BoardSnapshot; width: number }) {
  const [renaming, setRenaming] = useState(false);
  const [title, setTitle] = useState(section.title);
  const group = section.group;
  const groups = s.groups.slice().sort((a, b) => a.position - b.position);
  const gi = group ? groups.findIndex((g) => g.id === group.id) : -1;
  const commit = () => {
    setRenaming(false);
    if (group && title.trim() && title.trim() !== group.title) mutations.updateGroup(group, { title: title.trim() });
    else setTitle(section.title);
  };
  return (
    <div role="row" className="flex h-11 items-end" style={{ width }}>
      <div role="gridcell" className="sticky left-0 z-10 flex h-9 items-center gap-1 bg-bg pr-2" style={{ maxWidth: "100%" }}>
        <button type="button" onClick={onToggle} aria-expanded={!collapsed} aria-label={collapsed ? `Expand ${section.title}` : `Collapse ${section.title}`} className="flex size-7 items-center justify-center rounded-sm hover:bg-surface-2" style={{ color: colorVar(section.color) }}>
          {collapsed ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
        </button>
        {renaming && group ? (
          <Input value={title} onChange={(e) => setTitle(e.target.value)} onBlur={commit} onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setTitle(section.title); setRenaming(false); } }} aria-label="Group title" className="h-7 w-56 font-semibold" autoFocus maxLength={200} />
        ) : (
          <button type="button" onClick={() => canStructure && group && setRenaming(true)} className={cn("truncate rounded-sm text-base font-semibold", canStructure && group && "hover:bg-surface-2")} style={{ color: colorVar(section.color) }} title={canStructure && group ? "Rename group" : undefined}>{section.title}</button>
        )}
        <span className="text-xs text-text-muted">{section.items.length} {section.items.length === 1 ? "item" : "items"}</span>
        {canStructure && group ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild><IconButton aria-label={`${group.title} group options`} size="sm"><MoreHorizontal /></IconButton></DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuItem onSelect={() => setRenaming(true)}>Rename group</DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Change colour</DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuRadioGroup value={group.color} onValueChange={(c) => mutations.updateGroup(group, { color: c })}>
                    {LABEL_COLORS.map((c) => <DropdownMenuRadioItem key={c} value={c}><span className={cn("mr-2 inline-block size-3 rounded-sm", labelBg[c])} aria-hidden />{c}</DropdownMenuRadioItem>)}
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => mutations.addGroup()}>Add group</DropdownMenuItem>
              <DropdownMenuItem disabled={gi <= 0} onSelect={() => mutations.moveGroup(group.id, gi > 1 ? groups[gi - 2].id : null)}>Move up</DropdownMenuItem>
              <DropdownMenuItem disabled={gi < 0 || gi >= groups.length - 1} onSelect={() => mutations.moveGroup(group.id, groups[gi + 1].id)}>Move down</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => mutations.updateGroup(group, { archived_at: new Date().toISOString() })}><Archive className="size-4" /> Archive group</DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onSelect={() => mutations.deleteGroup(group)}><Trash2 className="size-4" /> Move group to trash</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </div>
  );
}

function BulkBar({ count, ids, snapshot: s, mutations, onClear }: { count: number; ids: string[]; snapshot: BoardSnapshot; mutations: BoardMutations; onClear: () => void }) {
  const groups = s.groups.slice().sort((a, b) => a.position - b.position);
  const items = s.items.filter((i) => ids.includes(i.id));
  const sameGroup = new Set(items.map((i) => i.group_id)).size === 1;
  const act = async (fn: () => Promise<unknown>) => { await fn(); onClear(); };
  return (
    <div role="toolbar" aria-label={`${count} ${count === 1 ? "item" : "items"} selected`} className="fixed bottom-4 left-1/2 z-40 flex max-w-[95vw] -translate-x-1/2 items-center gap-1 rounded-lg bg-text px-2 py-1.5 text-bg shadow-float">
      <span className="px-2 text-sm font-medium">{count} selected</span>
      <Button variant="ghost" size="sm" className="text-bg hover:bg-bg/15 hover:text-bg" onClick={() => act(() => mutations.duplicateItems(ids))}><Copy /> Duplicate</Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="text-bg hover:bg-bg/15 hover:text-bg" disabled={!sameGroup} title={sameGroup ? undefined : "Select items from one group to move them"}><FolderInput /> Move to group</Button></DropdownMenuTrigger>
        <DropdownMenuContent align="center">
          <DropdownMenuLabel>Move to</DropdownMenuLabel>
          {groups.map((g: GroupRow) => <DropdownMenuItem key={g.id} onSelect={() => act(() => mutations.moveItems(ids, g.id, s.items.filter((i) => i.group_id === g.id && !i.parent_item_id && !ids.includes(i.id)).sort((a, b) => b.position - a.position)[0]?.id ?? null))}>{g.title}</DropdownMenuItem>)}
        </DropdownMenuContent>
      </DropdownMenu>
      <Button variant="ghost" size="sm" className="text-bg hover:bg-bg/15 hover:text-bg" onClick={() => act(() => mutations.archiveItems(ids))}><Archive /> Archive</Button>
      <Button variant="ghost" size="sm" className="text-bg hover:bg-bg/15 hover:text-bg" onClick={() => act(() => mutations.deleteItems(ids))}><Trash2 /> Delete</Button>
      <IconButton aria-label="Clear selection" size="sm" className="text-bg hover:bg-bg/15 hover:text-bg" onClick={onClear}><X /></IconButton>
    </div>
  );
}
