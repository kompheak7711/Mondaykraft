import type { ComponentType } from "react";
import type { LucideIcon } from "lucide-react";
import type { ZodType } from "zod";

export type ColumnType =
  | "status" | "priority" | "people" | "date" | "timeline" | "numbers" | "text" | "long_text"
  | "dropdown" | "tags" | "checkbox" | "link" | "files" | "progress" | "creation_log" | "last_updated";

export type Label = { id: string; label: string; color: string; is_done?: boolean };
export type Option = { id: string; label: string; color?: string };

export type Column = {
  id: string;
  board_id: string;
  scope: "item" | "subitem";
  title: string;
  type: ColumnType;
  settings: Record<string, unknown>;
  width: number;
  position: number;
  description: string | null;
};

export type Item = {
  id: string;
  board_id: string;
  group_id: string | null;
  parent_item_id: string | null;
  name: string;
  position: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  deleted_at: string | null;
};

/** A stored cell. null means "no row", which is how an empty cell is represented. */
export type CellValue = Record<string, unknown> | null;

export type Person = { id: string; name: string; avatarUrl?: string | null };
export type Tag = { id: string; name: string; color: string };
export type AssetInfo = { id: string; name: string; mime: string; size: number };

/** Everything a cell may need beyond its own value. */
export type BoardContext = {
  boardId: string;
  workspaceId: string;
  members: Person[];
  tags: Tag[];
  assets: Record<string, AssetInfo>;
  timezone: string;
  /** Status values of the item's other columns, for progress roll-ups. */
  statusColumns: Column[];
  onCreateTag?: (name: string) => Promise<Tag | null>;
  onOpenColumnSettings?: (column: Column) => void;
  onUpdateColumnSettings?: (column: Column, settings: Record<string, unknown>) => Promise<void>;
  assetUrl?: (asset: AssetInfo) => string | undefined;
  onDeleteLabel?: (column: Column, labelId: string, moveTo: string | null) => Promise<void>;
  countLabelUse?: (column: Column, labelId: string) => number;
  /** Uploads and returns the assets that made it; files missing from the result failed. */
  onUpload?: (item: Item, column: Column, files: File[], onProgress?: (file: File, fraction: number) => void) => Promise<AssetInfo[]>;
};

export type CellProps = {
  column: Column;
  item: Item;
  value: CellValue;
  text: string;
  canEdit: boolean;
  board: BoardContext;
  /** All cells of the item, for derived columns. */
  cells: Record<string, CellValue>;
  onChange: (value: CellValue) => void;
  /** Dense table cell or roomy panel field. */
  variant?: "cell" | "field";
};

export type FilterOperandKind = "none" | "text" | "number" | "date" | "labels" | "options" | "people" | "tags";
export type FilterOp = { id: string; label: string; operand: FilterOperandKind };

export type SummaryFn = "sum" | "avg" | "median" | "min" | "max" | "count" | "battery" | "none";

export interface ColumnModule {
  type: ColumnType;
  label: string;
  description: string;
  icon: LucideIcon;
  /** Column center grouping. */
  group: "essential" | "more";
  /** Stores nothing; computed from the item or other cells. */
  derived?: boolean;
  defaultSettings: () => Record<string, unknown>;
  /** Client mirror of the SQL validator. */
  schema: ZodType;
  /** Same text the database derives, for display and search. */
  toText: (value: CellValue, column: Column, board: BoardContext) => string;
  /** Sort key: numbers sort numerically, dates by day, everything else by text. */
  sortKey: (value: CellValue, column: Column, board: BoardContext) => number | string | null;
  filterOps: FilterOp[];
  matches: (value: CellValue, op: string, operand: unknown, column: Column, board: BoardContext) => boolean;
  summaries: SummaryFn[];
  /** Group-by buckets: the key and label for this value. */
  groupKey?: (value: CellValue, column: Column, board: BoardContext) => { key: string; label: string; color?: string };
  Cell: ComponentType<CellProps>;
  SettingsEditor?: ComponentType<{ column: Column; onChange: (settings: Record<string, unknown>) => void; board: BoardContext }>;
}
