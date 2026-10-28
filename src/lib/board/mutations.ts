"use client";

import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { supabaseKey, supabaseUrl } from "@/lib/supabase/env";
import { friendlyError } from "@/lib/supabase/errors";
import { enqueue, isNetworkError } from "@/lib/offline";
import { moduleFor } from "@/lib/columns";
import type { AssetInfo, CellValue, Column, ColumnType, Item, Tag } from "@/lib/columns/types";
import { makeBoardContext } from "./model";
import { boardKey, patchBoard, removeRow, upsertRow } from "./use-board";
import { cellKey, type BoardSnapshot, type CellRow, type GroupRow, type ViewRow, type ViewSettings } from "./types";
import type { Json } from "@/lib/db/types";
type JsonValue = NonNullable<Json>;

type Result = { data: unknown; error: { message: string; code?: string } | null };
const nextPosition = (rows: { position: number }[]) => rows.reduce((m, r) => Math.max(m, Number(r.position)), 0) + 1;

export function useBoardMutations(boardId: string) {
  const client = useQueryClient();
  const supabase = createClient();

  return useMemo(() => {
    const snap = () => client.getQueryData<BoardSnapshot>(boardKey(boardId));
    const patch = (fn: (s: BoardSnapshot) => BoardSnapshot) => patchBoard(client, boardId, fn);

    /** Optimistic patch, server call, rollback and toast on failure, final patch with the server row. */
    async function run(optimistic: ((s: BoardSnapshot) => BoardSnapshot) | null, action: () => PromiseLike<Result>, after?: (data: unknown, s: BoardSnapshot) => BoardSnapshot): Promise<unknown> {
      const before = snap();
      if (optimistic) patch(optimistic);
      const settle = (data: unknown) => { if (after && data !== null && data !== undefined) patch((s) => after(data, s)); };
      const { data, error } = navigator.onLine ? await action() : { data: null, error: { message: "offline" } };
      if (error) {
        if (isNetworkError(error)) {
          // Keep the optimistic state; the call replays in order once the browser is back online.
          enqueue({ run: async () => {
            const r = await action();
            if (r.error) {
              if (isNetworkError(r.error)) throw r.error;
              toast.error(friendlyError(r.error));
              client.invalidateQueries({ queryKey: boardKey(boardId) });
              return;
            }
            settle(r.data);
          } });
          toast("Saved on this device. It syncs when you're back online.", { id: "offline" });
          return true;
        }
        if (before) client.setQueryData(boardKey(boardId), before);
        toast.error(friendlyError(error));
        return null;
      }
      settle(data);
      return data ?? true;
    }

    const api = {
      async setCell(item: Item, column: Column, value: CellValue) {
        const key = cellKey(item.id, column.id);
        const s = snap();
        const text = s ? moduleFor(column.type).toText(value, column, makeBoardContext(s)) : "";
        const optimistic = (st: BoardSnapshot) => {
          const cells = { ...st.cells };
          if (value === null) delete cells[key];
          else cells[key] = { ...(cells[key] ?? { item_id: item.id, column_id: column.id, board_id: boardId, created_at: new Date().toISOString() }), value, text, updated_at: new Date().toISOString(), updated_by: st.userId } as CellRow;
          return { ...st, cells };
        };
        if (value === null) {
          return run(optimistic, () => supabase.from("column_values").delete().eq("item_id", item.id).eq("column_id", column.id).then((r) => ({ data: true, error: r.error })));
        }
        return run(optimistic, () => supabase.from("column_values").upsert({ item_id: item.id, column_id: column.id, board_id: boardId, value: value as unknown as JsonValue }, { onConflict: "item_id,column_id" }).select("*").single(), (row, st) => ({ ...st, cells: { ...st.cells, [key]: row as CellRow } }));
      },

      async addItem(opts: { groupId?: string | null; parentId?: string | null; name: string; atStart?: boolean }) {
        const s = snap();
        if (!s) return null;
        const siblings = s.items.filter((i) => (opts.parentId ? i.parent_item_id === opts.parentId : i.group_id === opts.groupId && !i.parent_item_id));
        const position = opts.atStart ? Math.min(0, ...siblings.map((i) => Number(i.position))) - 1 : nextPosition(siblings);
        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        const draft: Item = { id, board_id: boardId, group_id: opts.parentId ? null : (opts.groupId ?? null), parent_item_id: opts.parentId ?? null, name: opts.name, position, created_by: s.userId, created_at: now, updated_at: now, archived_at: null, deleted_at: null };
        const row = await run((st) => ({ ...st, items: [...st.items, draft] }),
          () => supabase.from("items").insert({ id, board_id: boardId, group_id: draft.group_id, parent_item_id: draft.parent_item_id, name: opts.name, position, created_by: s.userId }).select("*").single(),
          (r, st) => ({ ...st, items: upsertRow(st.items, r as Item) }));
        return row ? (row as Item).id : null;
      },

      renameItem(item: Item, name: string) {
        const next = name.trim();
        if (!next || next === item.name) return;
        return run((st) => ({ ...st, items: upsertRow(st.items, { ...item, name: next }) }), () => supabase.from("items").update({ name: next }).eq("id", item.id).select("*").single(), (r, st) => ({ ...st, items: upsertRow(st.items, r as Item) }));
      },

      async deleteItems(ids: string[], label = ids.length === 1 ? "Item deleted" : `${ids.length} items deleted`) {
        const before = snap();
        const n = await run((st) => ({ ...st, items: st.items.filter((i) => !ids.includes(i.id) && !(i.parent_item_id && ids.includes(i.parent_item_id))) }), () => supabase.rpc("bulk_items", { p_action: "delete", p_ids: ids }));
        if (n !== null) {
          toast(label, {
            action: {
              label: "Undo",
              onClick: async () => {
                const { error } = await supabase.rpc("bulk_items", { p_action: "restore", p_ids: ids });
                if (error) toast.error(friendlyError(error));
                else if (before) patch((st) => ({ ...st, items: [...st.items, ...before.items.filter((i) => (ids.includes(i.id) || (i.parent_item_id && ids.includes(i.parent_item_id))) && !st.items.some((x) => x.id === i.id))] }));
              },
            },
          });
        }
      },

      archiveItems(ids: string[]) {
        return run((st) => ({ ...st, items: st.items.map((i) => (ids.includes(i.id) || (i.parent_item_id && ids.includes(i.parent_item_id)) ? { ...i, archived_at: new Date().toISOString() } : i)) }), () => supabase.rpc("bulk_items", { p_action: "archive", p_ids: ids }));
      },

      async duplicateItems(ids: string[]) {
        const n = await run(null, () => supabase.rpc("bulk_items", { p_action: "duplicate", p_ids: ids }));
        if (n !== null) client.invalidateQueries({ queryKey: boardKey(boardId) });
      },

      moveItems(ids: string[], groupId: string, afterId: string | null) {
        return run((st) => {
          const siblings = st.items.filter((i) => i.group_id === groupId && !i.parent_item_id && !ids.includes(i.id)).sort((a, b) => a.position - b.position);
          const prev = afterId ? siblings.find((i) => i.id === afterId)?.position ?? 0 : (siblings[0]?.position ?? 1) - 1;
          const nextRow = siblings.find((i) => i.position > prev);
          const step = nextRow ? (nextRow.position - prev) / (ids.length + 1) : 1;
          return { ...st, items: st.items.map((i) => { const k = ids.indexOf(i.id); return k < 0 ? i : { ...i, group_id: groupId, position: prev + step * (k + 1) }; }) };
        }, () => supabase.rpc("move_rows", { p_table: "items", p_ids: ids, p_container: groupId, p_after: afterId ?? undefined }));
      },

      moveSubitems(ids: string[], parentId: string, afterId: string | null) {
        return run(null, () => supabase.rpc("move_rows", { p_table: "subitems", p_ids: ids, p_container: parentId, p_after: afterId ?? undefined })).then(() => client.invalidateQueries({ queryKey: boardKey(boardId) }));
      },

      async addGroup(title = "New group") {
        const s = snap();
        if (!s) return null;
        const colors = ["blue", "green", "orange", "purple", "red", "teal", "pink", "yellow", "sky", "lime", "brown", "gray"];
        const color = colors[s.groups.length % colors.length];
        const position = nextPosition(s.groups);
        const row = await run(null, () => supabase.from("groups").insert({ board_id: boardId, title, color, position }).select("*").single(), (r, st) => ({ ...st, groups: upsertRow(st.groups, r as GroupRow) }));
        return row as GroupRow | null;
      },

      updateGroup(group: GroupRow, p: Partial<Pick<GroupRow, "title" | "color" | "archived_at">>) {
        return run((st) => ({ ...st, groups: upsertRow(st.groups, { ...group, ...p }) }), () => supabase.from("groups").update(p).eq("id", group.id).select("*").single(), (r, st) => ({ ...st, groups: upsertRow(st.groups, r as GroupRow) }));
      },

      async deleteGroup(group: GroupRow) {
        const before = snap();
        const ok = await run((st) => ({ ...st, groups: removeRow(st.groups, group.id), items: st.items.filter((i) => i.group_id !== group.id && !(i.parent_item_id && st.items.some((p) => p.id === i.parent_item_id && p.group_id === group.id))) }),
          () => supabase.from("groups").update({ deleted_at: new Date().toISOString() }).eq("id", group.id).then((r) => ({ data: true, error: r.error })));
        if (ok) toast(`Group “${group.title}” deleted`, { action: { label: "Undo", onClick: async () => {
          const { error } = await supabase.rpc("restore", { p_kind: "group", p_id: group.id });
          if (error) toast.error(friendlyError(error));
          else if (before) client.setQueryData(boardKey(boardId), before);
        } } });
      },

      moveGroup(id: string, afterId: string | null) {
        return run((st) => {
          const others = st.groups.filter((g) => g.id !== id).sort((a, b) => a.position - b.position);
          const prev = afterId ? others.find((g) => g.id === afterId)?.position ?? 0 : (others[0]?.position ?? 1) - 1;
          const nextRow = others.find((g) => g.position > prev);
          const pos = nextRow ? (prev + nextRow.position) / 2 : prev + 1;
          return { ...st, groups: st.groups.map((g) => (g.id === id ? { ...g, position: pos } : g)) };
        }, () => supabase.rpc("move_rows", { p_table: "groups", p_ids: [id], p_container: boardId, p_after: afterId ?? undefined }));
      },

      async addColumn(type: ColumnType, scope: "item" | "subitem" = "item", title?: string) {
        const s = snap();
        if (!s) return null;
        const m = moduleFor(type);
        const position = nextPosition(s.columns.filter((c) => c.scope === scope));
        const row = await run(null, () => supabase.from("columns").insert({ board_id: boardId, scope, type, title: title ?? m.label, settings: m.defaultSettings() as unknown as JsonValue, position }).select("*").single(),
          (r, st) => ({ ...st, columns: upsertRow(st.columns, r as unknown as Column) }));
        return row as unknown as Column | null;
      },

      updateColumn(column: Column, p: Partial<Pick<Column, "title" | "settings" | "width" | "description">>) {
        return run((st) => ({ ...st, columns: upsertRow(st.columns, { ...column, ...p }) }), () => supabase.from("columns").update(p as never).eq("id", column.id).select("*").single(), (r, st) => ({ ...st, columns: upsertRow(st.columns, r as unknown as Column) }));
      },

      async deleteColumn(column: Column) {
        const ok = await run((st) => ({ ...st, columns: removeRow(st.columns, column.id) }), () => supabase.from("columns").update({ deleted_at: new Date().toISOString() }).eq("id", column.id).then((r) => ({ data: true, error: r.error })));
        if (ok) toast(`Column “${column.title}” deleted`, { action: { label: "Undo", onClick: async () => {
          const { data, error } = await supabase.from("columns").update({ deleted_at: null }).eq("id", column.id).select("*").single();
          if (error) toast.error(friendlyError(error));
          else patch((st) => ({ ...st, columns: upsertRow(st.columns, data as unknown as Column) }));
        } } });
      },

      moveColumn(id: string, afterId: string | null) {
        return run((st) => {
          const col = st.columns.find((c) => c.id === id);
          const others = st.columns.filter((c) => c.id !== id && c.scope === col?.scope).sort((a, b) => a.position - b.position);
          const prev = afterId ? others.find((c) => c.id === afterId)?.position ?? 0 : (others[0]?.position ?? 1) - 1;
          const nextRow = others.find((c) => c.position > prev);
          const pos = nextRow ? (prev + nextRow.position) / 2 : prev + 1;
          return { ...st, columns: st.columns.map((c) => (c.id === id ? { ...c, position: pos } : c)) };
        }, () => supabase.rpc("move_rows", { p_table: "columns", p_ids: [id], p_container: boardId, p_after: afterId ?? undefined }));
      },

      async deleteLabel(column: Column, labelId: string, moveTo: string | null) {
        await run(null, () => supabase.rpc("delete_label", { p_column: column.id, p_label_id: labelId, p_move_to: moveTo ?? undefined }));
        client.invalidateQueries({ queryKey: boardKey(boardId) });
      },

      async addView(type: ViewRow["type"], name: string, settings: ViewSettings = {}) {
        const s = snap();
        if (!s) return null;
        const row = await run(null, () => supabase.from("views").insert({ board_id: boardId, type, name, settings: settings as never, position: nextPosition(s.views), created_by: s.userId }).select("*").single(), (r, st) => ({ ...st, views: upsertRow(st.views, r as ViewRow) }));
        return row as ViewRow | null;
      },

      updateView(view: ViewRow, p: Partial<Pick<ViewRow, "name" | "settings">>) {
        return run((st) => ({ ...st, views: upsertRow(st.views, { ...view, ...p } as ViewRow) }), () => supabase.from("views").update(p as never).eq("id", view.id).select("*").single(), (r, st) => ({ ...st, views: upsertRow(st.views, r as ViewRow) }));
      },

      deleteView(view: ViewRow) {
        return run((st) => ({ ...st, views: removeRow(st.views, view.id) }), () => supabase.from("views").update({ deleted_at: new Date().toISOString() }).eq("id", view.id).then((r) => ({ data: true, error: r.error })));
      },

      setDefaultView(view: ViewRow) {
        return run((st) => ({ ...st, views: st.views.map((v) => ({ ...v, is_default: v.id === view.id })) }), () => supabase.rpc("set_default_view", { p_view: view.id }));
      },

      updateBoard(p: Partial<Pick<BoardSnapshot["board"], "name" | "description" | "permission_set" | "kind" | "archived_at" | "deleted_at" | "folder_id">>) {
        return run((st) => ({ ...st, board: { ...st.board, ...p } }), () => supabase.from("boards").update(p).eq("id", boardId).select("*").single(), (r, st) => ({ ...st, board: r as BoardSnapshot["board"] }));
      },

      async createTag(name: string): Promise<Tag | null> {
        const s = snap();
        if (!s) return null;
        const row = await run(null, () => supabase.from("tags").insert({ workspace_id: s.board.workspace_id, name: name.trim(), created_by: s.userId }).select("id, name, color").single(), (r, st) => ({ ...st, tags: [...st.tags, r as Tag].sort((a, b) => a.name.localeCompare(b.name)) }));
        return row as Tag | null;
      },

      /** Insert the asset row first (RLS), then upload to the path the row fixed. */
      async uploadFiles(item: Item, column: Column | null, updateId: string | null, files: File[], onProgress?: (file: File, fraction: number) => void): Promise<AssetInfo[]> {
        const s = snap();
        if (!s) return [];
        const out: AssetInfo[] = [];
        const { data: { session } } = await supabase.auth.getSession();
        // XMLHttpRequest instead of the storage client: it is the only way to get upload progress events.
        const put = (path: string, file: File, mime: string) => new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", `${supabaseUrl}/storage/v1/object/assets/${path.split("/").map(encodeURIComponent).join("/")}`);
          xhr.setRequestHeader("Authorization", `Bearer ${session?.access_token ?? ""}`);
          xhr.setRequestHeader("apikey", supabaseKey);
          xhr.setRequestHeader("Content-Type", mime);
          xhr.setRequestHeader("x-upsert", "false");
          xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress?.(file, e.loaded / e.total); };
          xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error(xhr.status === 413 ? "The file is too large." : `The upload failed (${xhr.status}).`)));
          xhr.onerror = () => reject(new Error("The upload failed. Check your connection and retry."));
          xhr.send(file);
        });
        for (const file of files) {
          if (file.size > 25 * 1024 * 1024) { toast.error(`${file.name} is over 25 MB.`); continue; }
          const { data: asset, error } = await supabase.from("assets").insert({ item_id: item.id, column_id: column?.id ?? null, update_id: updateId, name: file.name, size: file.size, mime: file.type || "application/octet-stream", uploaded_by: s.userId, workspace_id: s.board.workspace_id, board_id: boardId, storage_path: "pending" }).select("id, name, mime, size, storage_path").single();
          if (error || !asset) { toast.error(friendlyError(error)); continue; }
          const upErr = await put(asset.storage_path, file, asset.mime).then(() => null, (e: Error) => e);
          if (upErr) { toast.error(`Could not upload ${file.name}. ${upErr.message}`); await supabase.from("assets").update({ deleted_at: new Date().toISOString() }).eq("id", asset.id); continue; }
          const info = { id: asset.id, name: asset.name, mime: asset.mime, size: asset.size };
          out.push(info);
          patch((st) => ({ ...st, assets: { ...st.assets, [info.id]: info } }));
        }
        return out;
      },
    };
    return api;
  }, [boardId, client, supabase]);
}

export type BoardMutations = ReturnType<typeof useBoardMutations>;
