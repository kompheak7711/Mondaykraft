"use client";

import { useState, type ReactNode } from "react";
import { cn } from "cn";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/**
 * The surface every cell renders: a button that opens an editor popover when the cell is editable.
 * Keyboard: Enter or Space opens, Escape closes (Radix). Locked cells are plain content.
 */
export function CellButton({
  children, editor, canEdit, label, className, variant = "cell", align = "start", open, onOpenChange, width,
}: {
  children: ReactNode;
  editor: (close: () => void) => ReactNode;
  canEdit: boolean;
  label: string;
  className?: string;
  variant?: "cell" | "field";
  align?: "start" | "center" | "end";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  width?: string;
}) {
  const [internal, setInternal] = useState(false);
  const isOpen = open ?? internal;
  const setOpen = onOpenChange ?? setInternal;
  const base = cn(
    "flex h-full w-full min-w-0 items-center text-left text-sm outline-none",
    variant === "cell" ? "px-2" : "min-h-8 rounded-md border border-transparent px-2 hover:border-border-input",
    className,
  );
  if (!canEdit) {
    return (
      <div className={cn(base, "cursor-default")} title="You can view this board" aria-label={label}>
        {children}
      </div>
    );
  }
  return (
    <Popover open={isOpen} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" aria-label={label} className={cn(base, "hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-inset data-[state=open]:bg-surface-2")}>
          {children}
        </button>
      </PopoverTrigger>
      <PopoverContent align={align} className={cn("p-2", width ?? "w-64")} onOpenAutoFocus={(e) => e.preventDefault()}>
        {editor(() => setOpen(false))}
      </PopoverContent>
    </Popover>
  );
}

export function Muted({ children }: { children: ReactNode }) {
  return <span className="text-text-muted">{children}</span>;
}

/** Text filter helpers shared by text-like columns. */
export const textOps = [
  { id: "contains", label: "contains", operand: "text" as const },
  { id: "not_contains", label: "does not contain", operand: "text" as const },
  { id: "is_empty", label: "is empty", operand: "none" as const },
  { id: "not_empty", label: "is not empty", operand: "none" as const },
];

export function matchText(text: string, op: string, operand: unknown) {
  const needle = String(operand ?? "").toLowerCase();
  const hay = text.toLowerCase();
  switch (op) {
    case "contains": return needle === "" || hay.includes(needle);
    case "not_contains": return !hay.includes(needle);
    case "is_empty": return hay === "";
    case "not_empty": return hay !== "";
    default: return true;
  }
}
