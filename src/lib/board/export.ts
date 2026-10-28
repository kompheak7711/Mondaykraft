import { toCsv } from "@/lib/csv";

type Col = { id: string; title: string; scope: string; position: number };
type Row = { id: string; name: string; group_id: string | null; parent_item_id: string | null; position: number; archived_at?: string | null };
type Board = { groups: { id: string; title: string; position: number }[]; columns: Col[]; items: Row[]; text: (itemId: string, columnId: string) => string };

/**
 * One CSV for a whole board: every item (archived ones too) in group order, each followed by its subitems.
 * Columns: Item, Group, Parent, then the item columns, then the subitem columns. Shared by the board menu and the workspace export.
 */
export function boardCsv(b: Board): string {
  const byPos = <T extends { position: number }>(a: T, z: T) => a.position - z.position;
  const itemCols = b.columns.filter((c) => c.scope === "item").sort(byPos);
  const subCols = b.columns.filter((c) => c.scope === "subitem").sort(byPos);
  const groups = b.groups.slice().sort(byPos);
  const rows: (string | null)[][] = [["Item", "Group", "Parent", ...itemCols.map((c) => c.title), ...subCols.map((c) => c.title)]];
  for (const g of groups) {
    for (const it of b.items.filter((i) => i.group_id === g.id && !i.parent_item_id).sort(byPos)) {
      rows.push([it.name, g.title, "", ...itemCols.map((c) => b.text(it.id, c.id)), ...subCols.map(() => "")]);
      for (const sub of b.items.filter((i) => i.parent_item_id === it.id).sort(byPos)) {
        rows.push([sub.name, g.title, it.name, ...itemCols.map(() => ""), ...subCols.map((c) => b.text(sub.id, c.id))]);
      }
    }
  }
  return toCsv(rows);
}

/** A file name that is safe on every desktop. */
export const fileName = (name: string, ext: string) => `${name.replace(/[\\/:*?"<>|]+/g, "-").trim() || "board"}.${ext}`;
