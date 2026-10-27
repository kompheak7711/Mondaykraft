"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { Item, Person } from "@/lib/columns/types";
import { applyOrDefer } from "./editing";
import { boardKey, patchBoard, removeRow, upsertRow } from "./use-board";
import { cellKey, type BoardSnapshot, type CellRow } from "./types";

type Change<T> = { operation: "INSERT" | "UPDATE" | "DELETE"; table: string; record: T | null; old_record: T | null };
type CellEvent = { op: "INSERT" | "UPDATE" | "DELETE"; item_id: string; column_id: string; updated_by: string | null; updated_at: string; value: Record<string, unknown> | null; text: string | null };

export type PresencePerson = Person & { since: string };

/**
 * One private channel per board: database changes arrive as broadcasts, presence shows who is here.
 * Returns the people on the board and the cells that changed remotely in the last moment (for the flash).
 */
export function useBoardRealtime(boardId: string, me: Person | null, enabled: boolean) {
  const client = useQueryClient();
  const supabase = createClient();
  const [presence, setPresence] = useState<PresencePerson[]>([]);
  const [flashes, setFlashes] = useState<Record<string, number>>({});
  const hadError = useRef(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!enabled || !me) return;
    const patch = (fn: (s: BoardSnapshot) => BoardSnapshot) => patchBoard(client, boardId, fn);
    const flash = (key: string) => {
      setFlashes((f) => ({ ...f, [key]: Date.now() }));
      setTimeout(() => setFlashes((f) => { const { [key]: _, ...rest } = f; void _; return rest; }), 1200);
    };

    const channel = supabase
      .channel(`board:${boardId}`, { config: { private: true, presence: { key: me.id } } })
      .on("broadcast", { event: "cell" }, ({ payload }) => {
        const e = payload as CellEvent;
        const key = cellKey(e.item_id, e.column_id);
        applyOrDefer(key, () => {
          patch((s) => {
            const cells = { ...s.cells };
            if (e.op === "DELETE") delete cells[key];
            else if (e.value) cells[key] = { ...(cells[key] ?? { item_id: e.item_id, column_id: e.column_id, board_id: boardId, created_at: e.updated_at }), value: e.value, text: e.text ?? "", updated_at: e.updated_at, updated_by: e.updated_by } as CellRow;
            else {
              // value too large for the message: fetch the cell
              supabase.from("column_values").select("*").eq("item_id", e.item_id).eq("column_id", e.column_id).maybeSingle().then(({ data }) => {
                if (data) patch((s2) => ({ ...s2, cells: { ...s2.cells, [key]: data } }));
              });
            }
            return { ...s, cells };
          });
          if (e.updated_by !== me.id) flash(key);
        });
      })
      .on("broadcast", { event: "items" }, ({ payload }) => {
        const c = payload as Change<Item>;
        patch((s) => {
          const row = c.record;
          if (c.operation === "DELETE" || (row && row.deleted_at)) return { ...s, items: removeRow(s.items, (row ?? c.old_record)!.id) };
          return row ? { ...s, items: upsertRow(s.items, row) } : s;
        });
      })
      .on("broadcast", { event: "groups" }, ({ payload }) => {
        const c = payload as Change<BoardSnapshot["groups"][number]>;
        patch((s) => {
          const row = c.record;
          if (c.operation === "DELETE" || (row && row.deleted_at)) return { ...s, groups: removeRow(s.groups, (row ?? c.old_record)!.id) };
          return row ? { ...s, groups: upsertRow(s.groups, row) } : s;
        });
      })
      .on("broadcast", { event: "columns" }, ({ payload }) => {
        const c = payload as Change<BoardSnapshot["columns"][number] & { deleted_at: string | null }>;
        patch((s) => {
          const row = c.record;
          if (c.operation === "DELETE" || (row && row.deleted_at)) return { ...s, columns: removeRow(s.columns, (row ?? c.old_record)!.id) };
          return row ? { ...s, columns: upsertRow(s.columns, row) } : s;
        });
      })
      .on("broadcast", { event: "views" }, ({ payload }) => {
        const c = payload as Change<BoardSnapshot["views"][number]>;
        patch((s) => {
          const row = c.record;
          if (c.operation === "DELETE" || (row && row.deleted_at)) return { ...s, views: removeRow(s.views, (row ?? c.old_record)!.id) };
          return row ? { ...s, views: upsertRow(s.views, row) } : s;
        });
      })
      .on("broadcast", { event: "boards" }, ({ payload }) => {
        const c = payload as Change<BoardSnapshot["board"]>;
        if (c.record) patch((s) => ({ ...s, board: c.record! }));
        if (c.record && (c.record.permission_set !== c.old_record?.permission_set || c.record.kind !== c.old_record?.kind)) client.invalidateQueries({ queryKey: boardKey(boardId) });
      })
      .on("broadcast", { event: "updates" }, ({ payload }) => {
        const c = payload as Change<{ item_id: string; deleted_at: string | null }>;
        const itemId = (c.record ?? c.old_record)?.item_id;
        if (!itemId) return;
        client.invalidateQueries({ queryKey: ["updates", itemId] });
        const delta = c.operation === "INSERT" ? 1 : c.operation === "DELETE" || (c.record?.deleted_at && !c.old_record?.deleted_at) ? -1 : 0;
        if (delta) patch((s) => ({ ...s, updateCounts: { ...s.updateCounts, [itemId]: Math.max(0, (s.updateCounts[itemId] ?? 0) + delta) } }));
      })
      .on("broadcast", { event: "reactions" }, ({ payload }) => {
        const c = payload as Change<{ update_id: string }>;
        void c;
        client.invalidateQueries({ queryKey: ["updates"] });
      })
      .on("broadcast", { event: "automations" }, () => client.invalidateQueries({ queryKey: ["automations", boardId] }))
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<PresencePerson>();
        const people = Object.values(state).map((entries) => entries[0]).filter(Boolean);
        setPresence(people.sort((a, b) => a.since.localeCompare(b.since)));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ id: me.id, name: me.name, avatarUrl: me.avatarUrl ?? null, since: new Date().toISOString() });
          if (hadError.current) {
            hadError.current = false;
            client.invalidateQueries({ queryKey: boardKey(boardId) });
          }
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          hadError.current = true;
        }
      });
    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [boardId, enabled, me?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return { presence, flashes };
}
