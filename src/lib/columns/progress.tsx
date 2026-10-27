"use client";

import { z } from "zod";
import { Gauge } from "lucide-react";
import { Label } from "@/components/ui/label";
import { isDone, labelsOf } from "./status";
import type { BoardContext, CellProps, CellValue, Column, ColumnModule } from "./types";

/** Share of the source status columns whose label is marked done. 0..1, or null without sources. */
export function progressOf(column: Column, cells: Record<string, CellValue>, board: BoardContext) {
  const ids = Array.isArray(column.settings.source_column_ids) && (column.settings.source_column_ids as string[]).length
    ? (column.settings.source_column_ids as string[])
    : board.statusColumns.map((c) => c.id);
  const sources = ids.map((id) => board.statusColumns.find((c) => c.id === id)).filter(Boolean) as Column[];
  if (!sources.length) return null;
  const done = sources.filter((c) => isDone(c, cells[c.id] ?? null)).length;
  return done / sources.length;
}

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  const pct = Math.round(value * 100);
  return (
    <span className={`flex w-full items-center gap-2 ${className ?? ""}`} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${pct}% done`}>
      <span className="h-2 flex-1 overflow-hidden rounded-pill bg-surface-2"><span className={pct >= 100 ? "block h-full bg-success" : "block h-full bg-brand"} style={{ width: `${pct}%` }} /></span>
      <span className="w-9 text-right text-xs tabular-nums text-text-muted">{pct}%</span>
    </span>
  );
}

function ProgressCell({ column, cells, board, variant }: CellProps) {
  const p = progressOf(column, cells, board);
  return (
    <div className={variant === "field" ? "flex min-h-8 items-center px-2" : "flex h-full w-full items-center px-2"}>
      {p === null ? <span className="text-xs text-text-muted">Add a status column</span> : <ProgressBar value={p} />}
    </div>
  );
}

function ProgressSettings({ column, onChange, board }: { column: Column; onChange: (s: Record<string, unknown>) => void; board: BoardContext }) {
  const chosen = Array.isArray(column.settings.source_column_ids) ? (column.settings.source_column_ids as string[]) : [];
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">Status columns to count</legend>
      {board.statusColumns.map((c) => (
        <Label key={c.id} className="flex items-center gap-2 text-sm font-normal">
          <input type="checkbox" className="accent-brand" checked={chosen.length === 0 || chosen.includes(c.id)} onChange={(e) => {
            const all = board.statusColumns.map((x) => x.id);
            const current = chosen.length ? chosen : all;
            const next = e.target.checked ? Array.from(new Set([...current, c.id])) : current.filter((x) => x !== c.id);
            onChange({ ...column.settings, source_column_ids: next.length === all.length ? [] : next });
          }} />
          {c.title} <span className="text-xs text-text-muted">({labelsOf(c).filter((l) => l.is_done).map((l) => l.label).join(", ") || "no done label"})</span>
        </Label>
      ))}
      {board.statusColumns.length === 0 ? <p className="text-xs text-text-muted">Add a status column first.</p> : null}
    </fieldset>
  );
}

export const progressModule: ColumnModule = {
  type: "progress",
  label: "Progress",
  description: "How many of the status columns are done, as a bar.",
  icon: Gauge,
  group: "more",
  derived: true,
  defaultSettings: () => ({ source_column_ids: [] }),
  schema: z.never(),
  toText: () => "",
  sortKey: () => null,
  filterOps: [],
  matches: () => true,
  summaries: ["none"],
  Cell: ProgressCell,
  SettingsEditor: ProgressSettings,
};
