"use client";

import { useState } from "react";
import { z } from "zod";
import { ArrowDown, ArrowUp, Check, CircleDot, Flag, Plus, Trash2 } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { StatusChip, LABEL_COLORS, labelBg } from "@/components/ui/status-chip";
import { CellButton } from "./shared";
import type { BoardContext, CellProps, CellValue, Column, ColumnModule, Label } from "./types";

export const defaultStatusLabels: Label[] = [
  { id: "todo", label: "Not started", color: "gray" },
  { id: "working", label: "Working on it", color: "orange" },
  { id: "stuck", label: "Stuck", color: "red" },
  { id: "done", label: "Done", color: "green", is_done: true },
];
export const defaultPriorityLabels: Label[] = [
  { id: "critical", label: "Critical", color: "red" },
  { id: "high", label: "High", color: "orange" },
  { id: "medium", label: "Medium", color: "blue" },
  { id: "low", label: "Low", color: "gray" },
];

export const labelsOf = (column: Column): Label[] => (Array.isArray(column.settings.labels) ? (column.settings.labels as Label[]) : []);
export const labelOf = (column: Column, value: CellValue) => labelsOf(column).find((l) => l.id === (value?.label_id as string | undefined));
export const isDone = (column: Column, value: CellValue) => Boolean(labelOf(column, value)?.is_done);

function StatusCell({ column, value, canEdit, onChange, variant, board }: CellProps) {
  const labels = labelsOf(column);
  const current = labelOf(column, value);
  return (
    <CellButton
      canEdit={canEdit}
      variant={variant}
      label={`${column.title}: ${current?.label ?? "empty"}`}
      className={variant === "field" ? "" : "p-0"}
      width="w-72"
      editor={(close) => (
        <div className="space-y-2" role="listbox" aria-label={`Choose ${column.title}`}>
          <div className="grid grid-cols-2 gap-1.5">
            {labels.map((l) => (
              <button
                key={l.id}
                type="button"
                role="option"
                aria-selected={l.id === current?.id}
                onClick={() => {
                  onChange({ label_id: l.id });
                  close();
                }}
                className={cn("flex h-8 items-center justify-center gap-1 rounded-sm px-2 text-xs font-medium text-on-brand focus-visible:ring-2 focus-visible:ring-brand", labelBg[l.color as keyof typeof labelBg] ?? labelBg.gray)}
              >
                {l.id === current?.id ? <Check className="size-3" aria-hidden /> : null}
                <span className="truncate">{l.label}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between border-t border-border pt-2">
            <Button variant="ghost" size="sm" onClick={() => { onChange(null); close(); }} disabled={!current}>Clear</Button>
            {board.onOpenColumnSettings ? (
              <Button variant="ghost" size="sm" onClick={() => { close(); board.onOpenColumnSettings?.(column); }}>Edit labels</Button>
            ) : null}
          </div>
        </div>
      )}
    >
      {variant === "field" ? (
        <StatusChip label={current?.label} color={current?.color} done={current?.is_done} />
      ) : (
        <StatusChip label={current?.label} color={current?.color} done={current?.is_done} fill className="rounded-none" />
      )}
    </CellButton>
  );
}

function LabelsEditor({ column, onChange, board }: { column: Column; onChange: (settings: Record<string, unknown>) => void; board: BoardContext }) {
  const labels = labelsOf(column);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [moveTo, setMoveTo] = useState<string>("");
  const update = (next: Label[]) => onChange({ ...column.settings, labels: next });
  const patch = (id: string, p: Partial<Label>) => update(labels.map((l) => (l.id === id ? { ...l, ...p } : l)));
  const move = (i: number, dir: -1 | 1) => {
    const next = [...labels];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    update(next);
  };
  const add = () => update([...labels, { id: `l${Date.now().toString(36)}`, label: "New label", color: LABEL_COLORS[labels.length % LABEL_COLORS.length] }]);
  const remove = async (id: string) => {
    const inUse = board.countLabelUse?.(column, id) ?? 0;
    if (inUse > 0 && pendingDelete !== id) {
      setPendingDelete(id);
      setMoveTo(labels.find((l) => l.id !== id)?.id ?? "");
      return;
    }
    if (board.onDeleteLabel) await board.onDeleteLabel(column, id, inUse > 0 ? moveTo || null : null);
    else update(labels.filter((l) => l.id !== id));
    setPendingDelete(null);
  };

  return (
    <div className="space-y-2">
      <ul className="space-y-1.5">
        {labels.map((l, i) => (
          <li key={l.id} className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <ColorPicker value={l.color} onChange={(color) => patch(l.id, { color })} name={l.label} />
              <Input value={l.label} onChange={(e) => patch(l.id, { label: e.target.value })} aria-label={`Label ${i + 1} name`} className="h-8" maxLength={60} />
              <label className="flex items-center gap-1 text-xs text-text-muted whitespace-nowrap" title="Counts as done in progress and My Work">
                <input type="checkbox" checked={Boolean(l.is_done)} onChange={(e) => patch(l.id, { is_done: e.target.checked })} className="accent-brand" /> done
              </label>
              <IconButton aria-label={`Move ${l.label} up`} size="sm" onClick={() => move(i, -1)} disabled={i === 0}><ArrowUp /></IconButton>
              <IconButton aria-label={`Move ${l.label} down`} size="sm" onClick={() => move(i, 1)} disabled={i === labels.length - 1}><ArrowDown /></IconButton>
              <IconButton aria-label={`Delete ${l.label}`} size="sm" onClick={() => remove(l.id)} disabled={labels.length <= 1}><Trash2 /></IconButton>
            </div>
            {pendingDelete === l.id ? (
              <div className="flex flex-wrap items-center gap-2 rounded-md bg-warning-soft p-2 text-xs text-warning">
                <span>{board.countLabelUse?.(column, l.id)} items use this label. Move them to</span>
                <select value={moveTo} onChange={(e) => setMoveTo(e.target.value)} className="h-7 rounded-sm border border-border-input bg-bg px-1 text-xs text-text" aria-label="Move items to">
                  <option value="">no label</option>
                  {labels.filter((x) => x.id !== l.id).map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
                </select>
                <Button size="sm" variant="destructive" onClick={() => remove(l.id)}>Delete label</Button>
                <Button size="sm" variant="ghost" onClick={() => setPendingDelete(null)}>Cancel</Button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
      <Button variant="outline" size="sm" onClick={add}><Plus /> Add label</Button>
    </div>
  );
}

export function ColorPicker({ value, onChange, name }: { value: string; onChange: (c: string) => void; name: string }) {
  return (
    <div className="flex flex-wrap gap-1" role="radiogroup" aria-label={`Colour for ${name}`}>
      {LABEL_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={c === value}
          aria-label={c}
          onClick={() => onChange(c)}
          className={cn("size-5 rounded-sm ring-offset-1 focus-visible:ring-2 focus-visible:ring-brand", labelBg[c], c === value && "ring-2 ring-text")}
        />
      ))}
    </div>
  );
}

const statusOps = [
  { id: "is", label: "is", operand: "labels" as const },
  { id: "is_not", label: "is not", operand: "labels" as const },
  { id: "is_empty", label: "is empty", operand: "none" as const },
  { id: "not_empty", label: "is not empty", operand: "none" as const },
];

const base = {
  schema: z.object({ label_id: z.string().min(1) }),
  toText: (value: CellValue, column: Column) => labelOf(column, value)?.label ?? "",
  sortKey: (value: CellValue, column: Column) => {
    const i = labelsOf(column).findIndex((l) => l.id === value?.label_id);
    return i < 0 ? null : i;
  },
  filterOps: statusOps,
  matches: (value: CellValue, op: string, operand: unknown) => {
    const id = value?.label_id as string | undefined;
    const set = Array.isArray(operand) ? (operand as string[]) : [];
    switch (op) {
      case "is": return set.length === 0 || (id !== undefined && set.includes(id));
      case "is_not": return id === undefined || !set.includes(id);
      case "is_empty": return !id;
      case "not_empty": return Boolean(id);
      default: return true;
    }
  },
  summaries: ["battery" as const, "none" as const],
  groupKey: (value: CellValue, column: Column) => {
    const l = labelOf(column, value);
    return l ? { key: l.id, label: l.label, color: l.color } : { key: "", label: "Empty" };
  },
  Cell: StatusCell,
  SettingsEditor: LabelsEditor,
};

export const statusModule: ColumnModule = {
  ...base,
  type: "status",
  label: "Status",
  description: "Labels with colours, one of them marked as done.",
  icon: CircleDot,
  group: "essential",
  defaultSettings: () => ({ labels: defaultStatusLabels }),
};

export const priorityModule: ColumnModule = {
  ...base,
  type: "priority",
  label: "Priority",
  description: "Critical to low, or your own levels.",
  icon: Flag,
  group: "essential",
  defaultSettings: () => ({ labels: defaultPriorityLabels }),
};
