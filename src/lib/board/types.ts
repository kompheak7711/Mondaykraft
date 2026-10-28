import type { Tables } from "@/lib/db/helpers";
import type { CellValue, Column, Item, Person, Tag, AssetInfo } from "@/lib/columns/types";

export type BoardRow = Tables<"boards">;
export type GroupRow = Tables<"groups">;
export type ViewRow = Tables<"views">;
export type CellRow = Tables<"column_values">;

export type Access = {
  role: "owner" | "member" | "viewer" | null;
  permission_set: "edit_everything" | "edit_content" | "edit_assigned" | "view_comment";
  can_edit_structure: boolean;
  can_edit_items: boolean;
  can_comment: boolean;
  is_owner: boolean;
  workspace_role: "owner" | "admin" | "member" | "viewer" | null;
};

export type Member = Person & { email: string; role: string };

/** Everything the board screen needs, loaded once and patched by realtime. */
export type BoardSnapshot = {
  board: BoardRow;
  access: Access;
  userId: string;
  groups: GroupRow[];
  columns: Column[];
  views: ViewRow[];
  items: Item[];
  /** key `${item_id}:${column_id}` */
  cells: Record<string, CellRow>;
  members: Member[];
  tags: Tag[];
  assets: Record<string, AssetInfo>;
  /** item id -> number of updates, for the chat bubble */
  updateCounts: Record<string, number>;
  timezone: string;
};

export const cellKey = (itemId: string, columnId: string) => `${itemId}:${columnId}`;

export type FilterRule = { id: string; column_id: string; op: string; operand?: unknown };
export type SortRule = { column_id: string; dir: "asc" | "desc" };

export type ViewSettings = {
  filters?: FilterRule[];
  filter_mode?: "and" | "or";
  person_filter?: string[];
  search?: string;
  sort?: SortRule[];
  hidden_column_ids?: string[];
  /** editors still see it (greyed); everyone else does not */
  hidden?: boolean;
  group_by?: string | null;
  kanban_column_id?: string;
  card_column_ids?: string[];
  calendar_column_id?: string;
  timeline_column_id?: string;
  color_by?: "group" | "status";
  chart?: { type: "bar" | "stacked" | "line" | "pie"; x_column_id?: string; y_fn?: "count" | "sum" | "avg" | "min" | "max"; y_column_id?: string; group_dates?: "day" | "week" | "month"; stack_column_id?: string };
};

export const settingsOf = (view: ViewRow | undefined): ViewSettings => ((view?.settings as ViewSettings | null) ?? {});

export type CellValueOf = CellValue;
