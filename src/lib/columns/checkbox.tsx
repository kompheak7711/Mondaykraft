"use client";

import { z } from "zod";
import { CheckSquare } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import type { CellProps, CellValue, ColumnModule } from "./types";

const checked = (value: CellValue) => value?.checked === true;

function CheckboxCell({ column, value, canEdit, onChange, variant }: CellProps) {
  return (
    <div className={variant === "field" ? "flex min-h-8 items-center px-2" : "flex h-full w-full items-center justify-center"}>
      <Checkbox checked={checked(value)} disabled={!canEdit} aria-label={column.title} onCheckedChange={(v) => onChange(v === true ? { checked: true } : null)} />
    </div>
  );
}

export const checkboxModule: ColumnModule = {
  type: "checkbox",
  label: "Checkbox",
  description: "Checked or not.",
  icon: CheckSquare,
  group: "essential",
  defaultSettings: () => ({}),
  schema: z.object({ checked: z.boolean() }),
  toText: (value) => (checked(value) ? "checked" : ""),
  sortKey: (value) => (checked(value) ? 1 : 0),
  filterOps: [
    { id: "is_checked", label: "is checked", operand: "none" },
    { id: "not_checked", label: "is not checked", operand: "none" },
  ],
  matches: (value, op) => (op === "is_checked" ? checked(value) : !checked(value)),
  summaries: ["count", "none"],
  groupKey: (value) => (checked(value) ? { key: "1", label: "Checked" } : { key: "", label: "Unchecked" }),
  Cell: CheckboxCell,
};
