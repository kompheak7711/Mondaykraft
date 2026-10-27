"use client";

import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { Hash } from "lucide-react";
import { cn } from "cn";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatNumber } from "@/lib/format";
import { Muted } from "./shared";
import type { CellProps, CellValue, Column, ColumnModule } from "./types";

const numOf = (value: CellValue) => (typeof value?.number === "number" ? (value.number as number) : null);
const settingsOf = (column: Column) => ({
  unit: typeof column.settings.unit === "string" ? (column.settings.unit as string) : "",
  unitPosition: column.settings.unit_position === "prefix" ? ("prefix" as const) : ("suffix" as const),
  decimals: typeof column.settings.decimals === "number" ? Math.min(4, Math.max(0, column.settings.decimals as number)) : 0,
});
export const formatCellNumber = (n: number, column: Column) => {
  const s = settingsOf(column);
  return formatNumber(n, s.decimals, s.unit, s.unitPosition);
};

function NumberCell({ column, value, canEdit, onChange, variant }: CellProps) {
  const n = numOf(value);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(n === null ? "" : String(n));
  const [invalid, setInvalid] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (!editing) setDraft(n === null ? "" : String(n)); }, [n, editing]);
  useEffect(() => { if (editing) ref.current?.select(); }, [editing]);

  const commit = () => {
    const raw = draft.trim().replace(/,/g, "");
    if (raw === "") { setEditing(false); if (n !== null) onChange(null); return; }
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) { setInvalid(true); return; }
    setInvalid(false);
    setEditing(false);
    if (parsed !== n) onChange({ number: parsed });
  };

  if (editing) {
    return (
      <input
        ref={ref}
        value={draft}
        inputMode="decimal"
        onChange={(e) => { setDraft(e.target.value); setInvalid(false); }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); commit(); }
          if (e.key === "Escape") { e.preventDefault(); setEditing(false); setInvalid(false); }
        }}
        aria-label={column.title}
        aria-invalid={invalid || undefined}
        className={cn("h-full w-full bg-bg px-2 text-right text-sm tabular-nums outline-none ring-2 ring-inset", invalid ? "ring-danger" : "ring-brand", variant === "field" && "min-h-8 rounded-md")}
      />
    );
  }
  const base = cn("flex h-full w-full items-center justify-end px-2 text-sm tabular-nums", variant === "field" && "min-h-8 justify-start rounded-md border border-transparent hover:border-border-input");
  const shown = n === null ? "" : formatCellNumber(n, column);
  if (!canEdit) return <div className={base} aria-label={`${column.title}: ${shown || "empty"}`}>{shown}</div>;
  return (
    <button type="button" onClick={() => setEditing(true)} aria-label={`${column.title}: ${shown || "empty"}. Press Enter to edit`} className={cn(base, "hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-inset")}>
      {shown || (variant === "field" ? <Muted>Add a number</Muted> : "")}
    </button>
  );
}

function NumberSettings({ column, onChange }: { column: Column; onChange: (s: Record<string, unknown>) => void }) {
  const s = settingsOf(column);
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-1"><Label htmlFor="num-unit">Unit</Label><Input id="num-unit" value={s.unit} maxLength={8} onChange={(e) => onChange({ ...column.settings, unit: e.target.value })} placeholder="$, kg, h" /></div>
      <div className="space-y-1"><Label htmlFor="num-pos">Unit position</Label>
        <select id="num-pos" value={s.unitPosition} onChange={(e) => onChange({ ...column.settings, unit_position: e.target.value })} className="h-8 w-full rounded-md border border-border-input bg-bg px-2 text-sm"><option value="prefix">Before</option><option value="suffix">After</option></select></div>
      <div className="space-y-1"><Label htmlFor="num-dec">Decimals</Label><Input id="num-dec" type="number" min={0} max={4} value={s.decimals} onChange={(e) => onChange({ ...column.settings, decimals: Number(e.target.value) })} /></div>
      <div className="space-y-1"><Label htmlFor="num-sum">Footer</Label>
        <select id="num-sum" value={String(column.settings.summary ?? "sum")} onChange={(e) => onChange({ ...column.settings, summary: e.target.value })} className="h-8 w-full rounded-md border border-border-input bg-bg px-2 text-sm">
          {["sum", "avg", "median", "min", "max", "count", "none"].map((f) => <option key={f} value={f}>{f}</option>)}
        </select></div>
    </div>
  );
}

export const numbersModule: ColumnModule = {
  type: "numbers",
  label: "Numbers",
  description: "Amounts with a unit and a sum, average or count in the footer.",
  icon: Hash,
  group: "essential",
  defaultSettings: () => ({ unit: "", unit_position: "suffix", decimals: 0, summary: "sum" }),
  schema: z.object({ number: z.number().finite() }),
  toText: (value, column) => (numOf(value) === null ? "" : formatCellNumber(numOf(value)!, column)),
  sortKey: (value) => numOf(value),
  filterOps: [
    { id: "eq", label: "equals", operand: "number" },
    { id: "neq", label: "does not equal", operand: "number" },
    { id: "gt", label: "is greater than", operand: "number" },
    { id: "lt", label: "is less than", operand: "number" },
    { id: "is_empty", label: "is empty", operand: "none" },
    { id: "not_empty", label: "is not empty", operand: "none" },
  ],
  matches: (value, op, operand) => {
    const n = numOf(value);
    const o = Number(operand);
    switch (op) {
      case "eq": return n !== null && n === o;
      case "neq": return n === null || n !== o;
      case "gt": return n !== null && n > o;
      case "lt": return n !== null && n < o;
      case "is_empty": return n === null;
      case "not_empty": return n !== null;
      default: return true;
    }
  },
  summaries: ["sum", "avg", "median", "min", "max", "count", "none"],
  Cell: NumberCell,
  SettingsEditor: NumberSettings,
};
