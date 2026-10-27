"use client";

import { useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PersonAvatar } from "@/components/ui/avatar-stack";
import { moduleFor } from "@/lib/columns";
import { labelsOf } from "@/lib/columns/status";
import { OptionList } from "@/lib/columns/pickers";
import { settingsOf, type BoardSnapshot, type FilterRule, type ViewRow, type ViewSettings } from "@/lib/board/types";
import type { BoardMutations } from "@/lib/board/mutations";

type Props = { kind: "filter" | "sort" | "hide" | "group"; snapshot: BoardSnapshot; mutations: BoardMutations; view: ViewRow | undefined; canEdit: boolean; children: ReactNode };

const select = "h-8 rounded-md border border-border-input bg-bg px-2 text-sm";

/** Filter, sort, hide and group-by popovers. Changes save on the view (S12, S13). */
export function ViewControls({ kind, snapshot: s, mutations, view, canEdit, children }: Props) {
  const settings = settingsOf(view);
  const columns = s.columns.filter((c) => c.scope === "item");
  const save = (p: Partial<ViewSettings>) => {
    if (!view || !canEdit) return;
    mutations.updateView(view, { settings: { ...settings, ...p } as never });
  };
  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align="start" className="w-[min(92vw,560px)] p-3">
        {!view ? <p className="text-sm text-text-muted">Add a view first.</p> : !canEdit ? <p className="text-sm text-text-muted">Only people who can edit the board&apos;s structure change saved views.</p> : null}
        {view && canEdit && kind === "filter" ? <FilterEditor s={s} columns={columns} settings={settings} save={save} /> : null}
        {view && canEdit && kind === "sort" ? <SortEditor columns={columns} settings={settings} save={save} /> : null}
        {view && canEdit && kind === "hide" ? <HideEditor columns={columns} settings={settings} save={save} /> : null}
        {view && canEdit && kind === "group" ? <GroupEditor columns={columns} settings={settings} save={save} /> : null}
      </PopoverContent>
    </Popover>
  );
}

function FilterEditor({ s, columns, settings, save }: { s: BoardSnapshot; columns: BoardSnapshot["columns"]; settings: ViewSettings; save: (p: Partial<ViewSettings>) => void }) {
  const rules = settings.filters ?? [];
  const setRules = (next: FilterRule[]) => save({ filters: next });
  const patch = (id: string, p: Partial<FilterRule>) => setRules(rules.map((r) => (r.id === id ? { ...r, ...p } : r)));
  const add = () => {
    const col = columns.find((c) => moduleFor(c.type).filterOps.length);
    if (!col) return;
    setRules([...rules, { id: crypto.randomUUID(), column_id: col.id, op: moduleFor(col.type).filterOps[0].id }]);
  };
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Filter</h3>
        {rules.length > 1 ? (
          <label className="flex items-center gap-2 text-xs text-text-muted">Match
            <select className={select + " h-7"} value={settings.filter_mode ?? "and"} onChange={(e) => save({ filter_mode: e.target.value as "and" | "or" })} aria-label="Match all or any rule">
              <option value="and">all rules</option><option value="or">any rule</option>
            </select>
          </label>
        ) : null}
      </div>
      {rules.length === 0 ? <p className="text-sm text-text-muted">No filters. Every item shows.</p> : null}
      <ul className="space-y-2">
        {rules.map((r) => {
          const col = columns.find((c) => c.id === r.column_id);
          const m = col ? moduleFor(col.type) : null;
          const op = m?.filterOps.find((o) => o.id === r.op) ?? m?.filterOps[0];
          return (
            <li key={r.id} className="flex flex-wrap items-center gap-2">
              <select className={select} aria-label="Column" value={r.column_id} onChange={(e) => { const c = columns.find((x) => x.id === e.target.value)!; patch(r.id, { column_id: c.id, op: moduleFor(c.type).filterOps[0]?.id, operand: undefined }); }}>
                {columns.filter((c) => moduleFor(c.type).filterOps.length).map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
              <select className={select} aria-label="Condition" value={op?.id} onChange={(e) => patch(r.id, { op: e.target.value, operand: undefined })}>
                {m?.filterOps.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
              {col && op ? <Operand s={s} column={col} kind={op.operand} value={r.operand} onChange={(operand) => patch(r.id, { operand })} /> : null}
              <IconButton aria-label="Remove rule" size="sm" onClick={() => setRules(rules.filter((x) => x.id !== r.id))}><X /></IconButton>
            </li>
          );
        })}
      </ul>
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={add}><Plus /> Add rule</Button>
        {rules.length ? <Button variant="ghost" size="sm" onClick={() => setRules([])}>Clear all</Button> : null}
      </div>
    </div>
  );
}

function Operand({ s, column, kind, value, onChange }: { s: BoardSnapshot; column: BoardSnapshot["columns"][number]; kind: string; value: unknown; onChange: (v: unknown) => void }) {
  const [open, setOpen] = useState(false);
  const ids = Array.isArray(value) ? (value as string[]) : [];
  if (kind === "none") return null;
  if (kind === "text") return <Input className="h-8 w-40" aria-label="Value" value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} />;
  if (kind === "number") return <Input className="h-8 w-28" type="number" aria-label="Value" value={value === undefined ? "" : String(value)} onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))} />;
  if (kind === "date") return <Input className="h-8 w-40" type="date" aria-label="Date" value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} />;
  const options =
    kind === "labels" ? labelsOf(column).map((l) => ({ id: l.id, label: l.label, color: l.color })) :
    kind === "options" ? ((column.settings.options as { id: string; label: string; color?: string }[] | undefined) ?? []).map((o) => ({ id: o.id, label: o.label, color: o.color })) :
    kind === "tags" ? s.tags.map((t) => ({ id: t.id, label: "#" + t.name, color: t.color })) :
    s.members.map((m) => ({ id: m.id, label: m.id === s.userId ? `${m.name} (me)` : m.name, leading: <PersonAvatar person={m} size={24} /> }));
  const summary = ids.length ? options.filter((o) => ids.includes(o.id)).map((o) => o.label).join(", ") : "Choose…";
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild><Button variant="outline" size="sm" className="max-w-56 justify-start truncate font-normal">{summary}</Button></PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-2">
        <OptionList options={options} selected={ids} onToggle={(id, on) => onChange(on ? [...ids, id] : ids.filter((x) => x !== id))} />
      </PopoverContent>
    </Popover>
  );
}

function SortEditor({ columns, settings, save }: { columns: BoardSnapshot["columns"]; settings: ViewSettings; save: (p: Partial<ViewSettings>) => void }) {
  const rules = settings.sort ?? [];
  const sortable = columns.filter((c) => !moduleFor(c.type).derived);
  const set = (next: ViewSettings["sort"]) => save({ sort: next });
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">Sort</h3>
      {rules.length === 0 ? <p className="text-sm text-text-muted">Items follow their order in the group.</p> : null}
      <ul className="space-y-2">
        {rules.map((r, i) => (
          <li key={r.column_id + i} className="flex items-center gap-2">
            <select className={select} aria-label="Sort by" value={r.column_id} onChange={(e) => set(rules.map((x, j) => (j === i ? { ...x, column_id: e.target.value } : x)))}>
              {sortable.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
            <Button variant="outline" size="sm" onClick={() => set(rules.map((x, j) => (j === i ? { ...x, dir: x.dir === "asc" ? "desc" : "asc" } : x)))} aria-label={r.dir === "asc" ? "Ascending, switch to descending" : "Descending, switch to ascending"}>
              {r.dir === "asc" ? <ArrowUp /> : <ArrowDown />} {r.dir === "asc" ? "Ascending" : "Descending"}
            </Button>
            <IconButton aria-label="Remove sort" size="sm" onClick={() => set(rules.filter((_, j) => j !== i))}><X /></IconButton>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" disabled={!sortable.length} onClick={() => set([...rules, { column_id: sortable.find((c) => !rules.some((r) => r.column_id === c.id))?.id ?? sortable[0].id, dir: "asc" }])}><Plus /> Add sort</Button>
        {rules.length ? <Button variant="ghost" size="sm" onClick={() => set([])}>Clear</Button> : null}
      </div>
    </div>
  );
}

function HideEditor({ columns, settings, save }: { columns: BoardSnapshot["columns"]; settings: ViewSettings; save: (p: Partial<ViewSettings>) => void }) {
  const hidden = new Set(settings.hidden_column_ids ?? []);
  const toggle = (id: string, show: boolean) => {
    const next = new Set(hidden);
    if (show) next.delete(id); else next.add(id);
    save({ hidden_column_ids: Array.from(next) });
  };
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Columns in this view</h3>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => save({ hidden_column_ids: [] })}>Show all</Button>
          <Button variant="ghost" size="sm" onClick={() => save({ hidden_column_ids: columns.map((c) => c.id) })}>Hide all</Button>
        </div>
      </div>
      <ul className="grid gap-1 sm:grid-cols-2">
        {columns.map((c) => {
          const m = moduleFor(c.type);
          return (
            <li key={c.id}>
              <label className="flex h-8 items-center gap-2 rounded-md px-2 text-sm hover:bg-surface-2">
                <Checkbox checked={!hidden.has(c.id)} onCheckedChange={(v) => toggle(c.id, v === true)} /> <m.icon className="size-4 text-text-muted" aria-hidden /> <span className="truncate">{c.title}</span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function GroupEditor({ columns, settings, save }: { columns: BoardSnapshot["columns"]; settings: ViewSettings; save: (p: Partial<ViewSettings>) => void }) {
  const groupable = columns.filter((c) => moduleFor(c.type).groupKey);
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">Group by</h3>
      <div role="radiogroup" className="space-y-0.5">
        <label className="flex h-8 items-center gap-2 rounded-md px-2 text-sm hover:bg-surface-2"><input type="radio" name="gb" className="accent-brand" checked={!settings.group_by} onChange={() => save({ group_by: null })} /> Board groups</label>
        {groupable.map((c) => {
          const m = moduleFor(c.type);
          return <label key={c.id} className="flex h-8 items-center gap-2 rounded-md px-2 text-sm hover:bg-surface-2"><input type="radio" name="gb" className="accent-brand" checked={settings.group_by === c.id} onChange={() => save({ group_by: c.id })} /> <m.icon className="size-4 text-text-muted" aria-hidden /> {c.title}</label>;
        })}
      </div>
      <p className="text-xs text-text-muted">Grouping by a column shows items in buckets; dragging between groups is off while it is on.</p>
    </div>
  );
}
