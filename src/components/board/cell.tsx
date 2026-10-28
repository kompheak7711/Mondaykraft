"use client";

import { memo } from "react";
import { cn } from "cn";
import { moduleFor } from "@/lib/columns";
import type { BoardContext, CellValue, Column, Item } from "@/lib/columns/types";
import { beginEdit, endEdit } from "@/lib/board/editing";
import { cellKey } from "@/lib/board/types";

type Props = {
  item: Item;
  column: Column;
  value: CellValue;
  text: string;
  cells: Record<string, CellValue>;
  canEdit: boolean;
  board: BoardContext;
  flash?: boolean;
  onChange: (value: CellValue) => void;
  variant?: "cell" | "field";
  row?: number;
  col?: number;
  style?: React.CSSProperties;
};

/**
 * One cell of the table: the column module's renderer inside a frame that reports when it is being
 * edited (so remote changes wait) and flashes when someone else changed it.
 */
export const CellFrame = memo(function CellFrame({ item, column, value, text, cells, canEdit, board, flash, onChange, variant = "cell", row, col, style }: Props) {
  const m = moduleFor(column.type);
  const key = cellKey(item.id, column.id);
  const editable = canEdit && !m.derived;
  return (
    <div
      data-cell={row !== undefined ? `${row},${col}` : undefined}
      role={variant === "cell" ? "gridcell" : undefined}
      style={style}
      onFocusCapture={() => editable && beginEdit(key)}
      onBlurCapture={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) endEdit(key); }}
      onKeyDownCapture={(e) => {
        // Enter and Escape unmount inline inputs without a blur event; release the cell once focus has left it.
        if (e.key === "Enter" || e.key === "Escape") { const el = e.currentTarget; setTimeout(() => { if (!el.contains(document.activeElement)) endEdit(key); }, 0); }
      }}
      className={cn(
        variant === "cell" && "relative h-row shrink-0 border-r border-b border-border",
        flash && "animate-pulse bg-brand-soft",
      )}
    >
      <m.Cell item={item} column={column} value={value} text={text} cells={cells} canEdit={editable} board={board} onChange={onChange} variant={variant} />
    </div>
  );
});
