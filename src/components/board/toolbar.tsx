"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpDown, EyeOff, Filter, Group, Plus, Search, UserRound, X } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PersonAvatar } from "@/components/ui/avatar-stack";
import { OptionList } from "@/lib/columns/pickers";
import { settingsOf, type BoardSnapshot, type ViewRow } from "@/lib/board/types";
import type { BoardMutations } from "@/lib/board/mutations";
import { ViewControls } from "./view-controls";

/** Search and the person filter are per session; filter, sort, hide and group-by live on the view. */
export type ToolbarState = { search: string; persons: string[] };

export function Toolbar({ snapshot: s, mutations, view, state, onState }: { snapshot: BoardSnapshot; mutations: BoardMutations; view: ViewRow | undefined; state: ToolbarState; onState: (st: ToolbarState) => void }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (searchOpen) searchRef.current?.focus(); }, [searchOpen]);
  const settings = settingsOf(view);
  const filters = settings.filters?.length ?? 0;
  const sorts = settings.sort?.length ?? 0;
  const hidden = settings.hidden_column_ids?.length ?? 0;
  const groupBy = settings.group_by ? s.columns.find((c) => c.id === settings.group_by) : undefined;
  const canEditView = s.access.can_edit_structure;

  const addItem = async () => {
    const group = s.groups.slice().sort((a, b) => a.position - b.position)[0];
    if (!group) return;
    const id = await mutations.addItem({ groupId: group.id, name: "New item", atStart: true });
    if (id) requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-item-name="${id}"]`)?.click());
  };

  return (
    <div role="toolbar" aria-label="Board tools" className="flex min-h-toolbar shrink-0 flex-wrap items-center gap-1 border-b border-border px-2 py-1 sm:px-4">
      {s.access.can_edit_items ? (
        <Button size="sm" onClick={addItem}><Plus /> New item</Button>
      ) : null}
      {searchOpen || state.search ? (
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 text-text-muted" aria-hidden />
          <Input ref={searchRef} type="search" value={state.search} onChange={(e) => onState({ ...state, search: e.target.value })} onBlur={() => !state.search && setSearchOpen(false)}
            onKeyDown={(e) => { if (e.key === "Escape") { onState({ ...state, search: "" }); setSearchOpen(false); } }} placeholder="Search this board" aria-label="Search this board" className="h-8 w-56 pl-8" />
        </div>
      ) : (
        <Button variant="ghost" size="sm" onClick={() => setSearchOpen(true)}><Search /> Search</Button>
      )}

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className={cn(state.persons.length && "bg-brand-soft text-brand-text")}>
            <UserRound /> Person{state.persons.length ? ` · ${state.persons.length}` : ""}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 p-2">
          <OptionList options={s.members.map((m) => ({ id: m.id, label: m.id === s.userId ? `${m.name} (me)` : m.name, leading: <PersonAvatar person={m} size={24} /> }))} selected={state.persons}
            onToggle={(id, on) => onState({ ...state, persons: on ? [...state.persons, id] : state.persons.filter((p) => p !== id) })} placeholder="Filter by person" />
          {state.persons.length ? <Button variant="ghost" size="sm" className="mt-2" onClick={() => onState({ ...state, persons: [] })}>Clear</Button> : null}
        </PopoverContent>
      </Popover>

      <ViewControls kind="filter" snapshot={s} mutations={mutations} view={view} canEdit={canEditView}>
        <Button variant="ghost" size="sm" className={cn(filters && "bg-brand-soft text-brand-text")}><Filter /> Filter{filters ? ` · ${filters}` : ""}</Button>
      </ViewControls>
      <ViewControls kind="sort" snapshot={s} mutations={mutations} view={view} canEdit={canEditView}>
        <Button variant="ghost" size="sm" className={cn(sorts && "bg-brand-soft text-brand-text")}><ArrowUpDown /> Sort{sorts ? ` · ${sorts}` : ""}</Button>
      </ViewControls>
      <ViewControls kind="hide" snapshot={s} mutations={mutations} view={view} canEdit={canEditView}>
        <Button variant="ghost" size="sm" className={cn(hidden && "bg-brand-soft text-brand-text")}><EyeOff /> Hide{hidden ? ` · ${hidden}` : ""}</Button>
      </ViewControls>
      <ViewControls kind="group" snapshot={s} mutations={mutations} view={view} canEdit={canEditView}>
        <Button variant="ghost" size="sm" className={cn(groupBy && "bg-brand-soft text-brand-text")}><Group /> {groupBy ? `By ${groupBy.title}` : "Group by"}</Button>
      </ViewControls>

      {(state.search || state.persons.length) ? (
        <Button variant="ghost" size="sm" className="ml-auto text-text-muted" onClick={() => { onState({ search: "", persons: [] }); setSearchOpen(false); }}><X /> Clear</Button>
      ) : null}
    </div>
  );
}
