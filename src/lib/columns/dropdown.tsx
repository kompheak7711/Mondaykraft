"use client";

import { z } from "zod";
import { ListChecks, Tags } from "lucide-react";
import { cn } from "cn";
import { labelBg, isLabelColor } from "@/components/ui/status-chip";
import { CellButton, Muted } from "./shared";
import { OptionList } from "./pickers";
import type { BoardContext, CellProps, CellValue, Column, ColumnModule, Option } from "./types";

const idsOf = (value: CellValue) => (Array.isArray(value?.ids) ? (value!.ids as string[]) : []);
const optionsOf = (column: Column): Option[] => (Array.isArray(column.settings.options) ? (column.settings.options as Option[]) : []);

export function Chip({ label, color, prefix }: { label: string; color?: string; prefix?: string }) {
  const coloured = isLabelColor(color);
  return (
    <span className={cn("inline-flex h-5 max-w-full items-center rounded-pill px-2 text-xs font-medium", coloured ? cn(labelBg[color], "text-on-brand") : "bg-surface-2 text-text")}>
      <span className="truncate">{prefix}{label}</span>
    </span>
  );
}

export function Chips({ items, prefix, max = 3 }: { items: { id: string; label: string; color?: string }[]; prefix?: string; max?: number }) {
  const shown = items.slice(0, max);
  const rest = items.length - shown.length;
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-1">
      {shown.map((i) => <Chip key={i.id} label={i.label} color={i.color} prefix={prefix} />)}
      {rest > 0 ? <span className="text-xs text-text-muted" title={items.slice(max).map((i) => i.label).join(", ")}>+{rest}</span> : null}
    </span>
  );
}

function pickerOps(kind: "options" | "tags") {
  return [
    { id: "is", label: "is any of", operand: kind },
    { id: "is_not", label: "is none of", operand: kind },
    { id: "is_empty", label: "is empty", operand: "none" as const },
    { id: "not_empty", label: "is not empty", operand: "none" as const },
  ];
}
function matchIds(ids: string[], op: string, operand: unknown) {
  const set = Array.isArray(operand) ? (operand as string[]) : [];
  switch (op) {
    case "is": return set.length === 0 || set.some((id) => ids.includes(id));
    case "is_not": return !set.some((id) => ids.includes(id));
    case "is_empty": return ids.length === 0;
    case "not_empty": return ids.length > 0;
    default: return true;
  }
}

function DropdownCell({ column, value, canEdit, onChange, variant, board }: CellProps) {
  const ids = idsOf(value);
  const options = optionsOf(column);
  const limit = typeof column.settings.limit === "number" ? column.settings.limit : undefined;
  const chosen = ids.map((id) => options.find((o) => o.id === id)).filter(Boolean) as Option[];
  const toggle = (id: string, next: boolean) => {
    const set = next ? Array.from(new Set([...(limit === 1 ? [] : ids), id])) : ids.filter((x) => x !== id);
    onChange(set.length ? { ids: set } : null);
  };
  const create = async (label: string) => {
    if (!board.onUpdateColumnSettings) return null;
    const id = `o${Date.now().toString(36)}`;
    await board.onUpdateColumnSettings(column, { ...column.settings, options: [...options, { id, label }] });
    return id;
  };
  return (
    <CellButton canEdit={canEdit} variant={variant} label={`${column.title}: ${chosen.map((o) => o.label).join(", ") || "empty"}`}
      editor={() => (
        <OptionList options={options.map((o) => ({ id: o.id, label: o.label, color: o.color }))} selected={ids} onToggle={toggle} max={limit}
          onCreate={board.onUpdateColumnSettings ? create : undefined} placeholder="Search or create" renderChip={(o) => <Chip label={o.label} color={o.color} />} />
      )}>
      {chosen.length ? <Chips items={chosen} /> : <Muted>{variant === "field" ? "Pick options" : ""}</Muted>}
    </CellButton>
  );
}

export const dropdownModule: ColumnModule = {
  type: "dropdown",
  label: "Dropdown",
  description: "Pick one or several options; create new ones as you type.",
  icon: ListChecks,
  group: "essential",
  defaultSettings: () => ({ options: [] }),
  schema: z.object({ ids: z.array(z.string().min(1)).min(1) }),
  toText: (value, column) => idsOf(value).map((id) => optionsOf(column).find((o) => o.id === id)?.label ?? "").filter(Boolean).join(", "),
  sortKey: (value, column) => idsOf(value).map((id) => optionsOf(column).find((o) => o.id === id)?.label ?? "").join(", ") || null,
  filterOps: pickerOps("options"),
  matches: (value, op, operand) => matchIds(idsOf(value), op, operand),
  summaries: ["none"],
  groupKey: (value, column) => {
    const o = optionsOf(column).find((x) => x.id === idsOf(value)[0]);
    return o ? { key: o.id, label: o.label, color: o.color } : { key: "", label: "Empty" };
  },
  Cell: DropdownCell,
};

function TagsCell({ column, value, canEdit, onChange, variant, board }: CellProps) {
  const ids = idsOf(value);
  const chosen = ids.map((id) => board.tags.find((t) => t.id === id)).filter(Boolean) as BoardContext["tags"];
  const toggle = (id: string, next: boolean) => {
    const set = next ? Array.from(new Set([...ids, id])) : ids.filter((x) => x !== id);
    onChange(set.length ? { ids: set } : null);
  };
  const create = async (name: string) => {
    const tag = await board.onCreateTag?.(name);
    return tag?.id ?? null;
  };
  return (
    <CellButton canEdit={canEdit} variant={variant} label={`${column.title}: ${chosen.map((t) => "#" + t.name).join(", ") || "empty"}`}
      editor={() => (
        <OptionList options={board.tags.map((t) => ({ id: t.id, label: t.name, color: t.color }))} selected={ids} onToggle={toggle}
          onCreate={board.onCreateTag ? create : undefined} placeholder="Search or create a tag" renderChip={(o) => <Chip label={o.label} color={o.color} prefix="#" />} />
      )}>
      {chosen.length ? <Chips items={chosen.map((t) => ({ id: t.id, label: t.name, color: t.color }))} prefix="#" /> : <Muted>{variant === "field" ? "Add tags" : ""}</Muted>}
    </CellButton>
  );
}

export const tagsModule: ColumnModule = {
  type: "tags",
  label: "Tags",
  description: "Workspace-wide tags shared by every board.",
  icon: Tags,
  group: "more",
  defaultSettings: () => ({}),
  schema: z.object({ ids: z.array(z.string().uuid()).min(1) }),
  toText: (value, _c, board) => idsOf(value).map((id) => board.tags.find((t) => t.id === id)?.name ?? "").filter(Boolean).sort().join(", "),
  sortKey: (value, _c, board) => idsOf(value).map((id) => board.tags.find((t) => t.id === id)?.name ?? "").sort().join(", ") || null,
  filterOps: pickerOps("tags"),
  matches: (value, op, operand) => matchIds(idsOf(value), op, operand),
  summaries: ["none"],
  groupKey: (value, _c, board) => {
    const t = board.tags.find((x) => x.id === idsOf(value)[0]);
    return t ? { key: t.id, label: "#" + t.name, color: t.color } : { key: "", label: "No tags" };
  },
  Cell: TagsCell,
};
