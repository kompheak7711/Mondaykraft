import type { BoardContext, CellValue, Column, Item } from "@/lib/columns/types";
import { moduleFor } from "@/lib/columns";
import { isDone } from "@/lib/columns/status";
import { cellKey, settingsOf, type BoardSnapshot, type ViewRow, type ViewSettings } from "./types";

export type CellIndex = Record<string, Record<string, CellValue>>;

/** cells by item then column, built once per snapshot. */
export function buildIndex(s: BoardSnapshot): CellIndex {
  const idx: CellIndex = {};
  for (const key in s.cells) {
    const c = s.cells[key];
    (idx[c.item_id] ??= {})[c.column_id] = c.value as CellValue;
  }
  return idx;
}

export const cellsOf = (idx: CellIndex, itemId: string) => idx[itemId] ?? {};
export const cellText = (s: BoardSnapshot, itemId: string, columnId: string) => s.cells[cellKey(itemId, columnId)]?.text ?? "";

export function makeBoardContext(s: BoardSnapshot, extra: Partial<BoardContext> = {}): BoardContext {
  return {
    boardId: s.board.id,
    workspaceId: s.board.workspace_id,
    members: s.members,
    tags: s.tags,
    assets: s.assets,
    timezone: s.timezone,
    statusColumns: s.columns.filter((c) => c.type === "status" && c.scope === "item"),
    ...extra,
  };
}

/** Per-item right for "only edit assigned items"; everything else comes from access. */
export function canEditItem(s: BoardSnapshot, idx: CellIndex, item: Item): boolean {
  if (s.access.can_edit_items) return true;
  if (s.access.role !== "member" || s.access.permission_set !== "edit_assigned") return false;
  const peopleCols = s.columns.filter((c) => c.type === "people");
  const targets = [item.id, item.parent_item_id].filter(Boolean) as string[];
  return targets.some((id) => peopleCols.some((c) => ((cellsOf(idx, id)[c.id]?.ids as string[] | undefined) ?? []).includes(s.userId)));
}

export const itemColumns = (s: BoardSnapshot) => s.columns.filter((c) => c.scope === "item");
export const subitemColumns = (s: BoardSnapshot) => s.columns.filter((c) => c.scope === "subitem");

export function visibleColumns(s: BoardSnapshot, view: ViewRow | undefined, scope: "item" | "subitem" = "item") {
  const hidden = new Set(settingsOf(view).hidden_column_ids ?? []);
  return s.columns.filter((c) => c.scope === scope && !hidden.has(c.id)).sort((a, b) => a.position - b.position);
}

export function itemDone(s: BoardSnapshot, idx: CellIndex, item: Item) {
  const statusCols = s.columns.filter((c) => c.type === "status" && c.scope === (item.parent_item_id ? "subitem" : "item"));
  return statusCols.length > 0 && statusCols.some((c) => isDone(c, cellsOf(idx, item.id)[c.id] ?? null));
}

function matchesRules(s: BoardSnapshot, idx: CellIndex, ctx: BoardContext, item: Item, settings: ViewSettings) {
  const rules = settings.filters ?? [];
  if (rules.length) {
    const results = rules.map((r) => {
      const col = s.columns.find((c) => c.id === r.column_id);
      if (!col) return true;
      return moduleFor(col.type).matches(cellsOf(idx, item.id)[col.id] ?? null, r.op, r.operand, col, ctx);
    });
    const ok = settings.filter_mode === "or" ? results.some(Boolean) : results.every(Boolean);
    if (!ok) return false;
  }
  if (settings.person_filter?.length) {
    const peopleCols = s.columns.filter((c) => c.type === "people" && c.scope === "item");
    const ids = new Set(peopleCols.flatMap((c) => ((cellsOf(idx, item.id)[c.id]?.ids as string[] | undefined) ?? [])));
    if (!settings.person_filter.some((p) => ids.has(p))) return false;
  }
  const q = settings.search?.trim().toLowerCase();
  if (q) {
    if (item.name.toLowerCase().includes(q)) return true;
    const hit = s.columns.some((c) => cellText(s, item.id, c.id).toLowerCase().includes(q));
    if (!hit) {
      // a parent stays when one of its subitems matches
      const subs = s.items.filter((i) => i.parent_item_id === item.id);
      if (!subs.some((sub) => sub.name.toLowerCase().includes(q) || s.columns.some((c) => cellText(s, sub.id, c.id).toLowerCase().includes(q)))) return false;
    }
  }
  return true;
}

function compareItems(s: BoardSnapshot, idx: CellIndex, ctx: BoardContext, settings: ViewSettings) {
  const rules = settings.sort ?? [];
  return (a: Item, b: Item) => {
    for (const r of rules) {
      const col = s.columns.find((c) => c.id === r.column_id);
      if (!col) continue;
      const m = moduleFor(col.type);
      const ka = m.sortKey(cellsOf(idx, a.id)[col.id] ?? null, col, ctx);
      const kb = m.sortKey(cellsOf(idx, b.id)[col.id] ?? null, col, ctx);
      if (ka === kb) continue;
      if (ka === null) return 1; // empties last either way
      if (kb === null) return -1;
      const cmp = typeof ka === "number" && typeof kb === "number" ? ka - kb : String(ka).localeCompare(String(kb), undefined, { numeric: true, sensitivity: "base" });
      if (cmp !== 0) return r.dir === "desc" ? -cmp : cmp;
    }
    return a.position - b.position || a.created_at.localeCompare(b.created_at);
  };
}

export type Section = { key: string; title: string; color: string; group?: BoardSnapshot["groups"][number]; items: Item[] };

/** The table's row model for one view: sections (board groups, or group-by buckets) of filtered, sorted items. */
export function applyView(s: BoardSnapshot, idx: CellIndex, ctx: BoardContext, view: ViewRow | undefined): { sections: Section[]; total: number; shown: number; filtered: boolean } {
  const settings = settingsOf(view);
  const top = s.items.filter((i) => !i.parent_item_id && !i.archived_at);
  const kept = top.filter((i) => matchesRules(s, idx, ctx, i, settings));
  const sorted = kept.slice().sort(compareItems(s, idx, ctx, settings));
  const filtered = Boolean((settings.filters?.length ?? 0) || settings.person_filter?.length || settings.search?.trim());
  const groupBy = settings.group_by ? s.columns.find((c) => c.id === settings.group_by) : undefined;

  let sections: Section[];
  if (groupBy && moduleFor(groupBy.type).groupKey) {
    const m = moduleFor(groupBy.type);
    const buckets = new Map<string, Section>();
    for (const it of sorted) {
      const g = m.groupKey!(cellsOf(idx, it.id)[groupBy.id] ?? null, groupBy, ctx);
      const b = buckets.get(g.key) ?? { key: `gb:${g.key}`, title: g.label, color: g.color ?? "gray", items: [] };
      b.items.push(it);
      buckets.set(g.key, b);
    }
    sections = Array.from(buckets.values());
    const empty = sections.find((b) => b.key === "gb:");
    sections = sections.filter((b) => b !== empty).concat(empty ? [empty] : []);
  } else {
    const groups = s.groups.filter((g) => !g.archived_at).slice().sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at));
    sections = groups.map((g) => ({ key: g.id, title: g.title, color: g.color, group: g, items: sorted.filter((i) => i.group_id === g.id) }));
  }
  return { sections, total: top.length, shown: sorted.length, filtered };
}

export function subitemsOf(s: BoardSnapshot, parentId: string) {
  return s.items.filter((i) => i.parent_item_id === parentId && !i.archived_at).sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at));
}

/** Footer value for one column over a list of items. */
export function summarize(s: BoardSnapshot, idx: CellIndex, column: Column, items: Item[], fn: string): { text?: string; battery?: { label: string; color: string; count: number }[] } {
  const values = items.map((i) => cellsOf(idx, i.id)[column.id] ?? null);
  if (fn === "battery") {
    const labels = (Array.isArray(column.settings.labels) ? (column.settings.labels as { id: string; label: string; color: string }[]) : []);
    const counts = labels.map((l) => ({ label: l.label, color: l.color, count: values.filter((v) => v?.label_id === l.id).length }));
    return { battery: counts.filter((c) => c.count > 0) };
  }
  if (column.type === "numbers") {
    const nums = values.map((v) => (typeof v?.number === "number" ? (v.number as number) : null)).filter((n): n is number => n !== null);
    if (fn === "count") return { text: String(nums.length) };
    if (!nums.length) return {};
    const sorted = nums.slice().sort((a, b) => a - b);
    const sum = nums.reduce((a, b) => a + b, 0);
    const n = fn === "sum" ? sum : fn === "avg" ? sum / nums.length : fn === "min" ? sorted[0] : fn === "max" ? sorted[sorted.length - 1] : fn === "median" ? (sorted[Math.floor((sorted.length - 1) / 2)] + sorted[Math.ceil((sorted.length - 1) / 2)]) / 2 : null;
    if (n === null) return {};
    const dec = fn === "avg" ? Math.max(typeof column.settings.decimals === "number" ? (column.settings.decimals as number) : 0, 1) : (typeof column.settings.decimals === "number" ? (column.settings.decimals as number) : 0);
    const unit = typeof column.settings.unit === "string" ? (column.settings.unit as string) : "";
    const text = new Intl.NumberFormat(undefined, { maximumFractionDigits: dec }).format(n);
    return { text: unit ? (column.settings.unit_position === "prefix" ? `${unit}${text}` : `${text} ${unit}`) : text };
  }
  if (fn === "count") return { text: String(values.filter((v) => v && (column.type !== "checkbox" || v.checked === true)).length) };
  return {};
}
