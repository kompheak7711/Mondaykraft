"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/supabase/errors";
import type { Tables } from "@/lib/db/helpers";
import type { Json } from "@/lib/db/types";
type JsonValue = NonNullable<Json>;

export type UpdateRow = Tables<"updates"> & { reactions: { user_id: string; emoji: string }[]; replies: UpdateRow[] };
export type ActivityRow = Tables<"activities">;
export type ItemAsset = Pick<Tables<"assets">, "id" | "name" | "mime" | "size" | "column_id" | "update_id" | "created_at" | "uploaded_by">;

export const updatesKey = (itemId: string) => ["updates", itemId] as const;

/** Updates of an item with their replies and reactions, newest first (pinned first). */
export function useUpdates(itemId: string) {
  const supabase = createClient();
  return useQuery({
    queryKey: updatesKey(itemId),
    queryFn: async () => {
      const [{ data: rows, error }, { data: reactions }] = await Promise.all([
        supabase.from("updates").select("*").eq("item_id", itemId).is("deleted_at", null).order("created_at", { ascending: true }),
        supabase.from("reactions").select("update_id, user_id, emoji"),
      ]);
      if (error) throw new Error(error.message);
      const byId = new Map<string, UpdateRow>();
      for (const r of rows ?? []) byId.set(r.id, { ...r, reactions: (reactions ?? []).filter((x) => x.update_id === r.id), replies: [] });
      const top: UpdateRow[] = [];
      for (const u of byId.values()) {
        if (u.parent_update_id && byId.has(u.parent_update_id)) byId.get(u.parent_update_id)!.replies.push(u);
        else top.push(u);
      }
      return top.sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.created_at.localeCompare(a.created_at));
    },
  });
}

export function useActivities(itemId: string, enabled: boolean) {
  const supabase = createClient();
  return useQuery({
    queryKey: ["activities", itemId],
    enabled,
    refetchInterval: enabled ? 15_000 : false,
    queryFn: async () => {
      const { data, error } = await supabase.from("activities").select("*").eq("item_id", itemId).order("created_at", { ascending: false }).limit(200);
      if (error) throw new Error(error.message);
      return data;
    },
  });
}

export function useItemAssets(itemId: string, enabled: boolean) {
  const supabase = createClient();
  return useQuery({
    queryKey: ["item-assets", itemId],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.from("assets").select("id, name, mime, size, column_id, update_id, created_at, uploaded_by").eq("item_id", itemId).is("deleted_at", null).order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data as ItemAsset[];
    },
  });
}

export function useUpdateMutations(itemId: string, boardId: string, userId: string) {
  const supabase = createClient();
  const client = useQueryClient();
  const done = () => client.invalidateQueries({ queryKey: updatesKey(itemId) });
  const fail = (e: unknown) => toast.error(friendlyError(e));

  const post = useMutation({
    mutationFn: async ({ body, parentId }: { body: JsonValue; parentId?: string | null }) => {
      const { data, error } = await supabase.from("updates").insert({ item_id: itemId, board_id: boardId, author_id: userId, body, parent_update_id: parentId ?? null }).select("id").single();
      if (error) throw error;
      return data;
    },
    onSuccess: done,
    onError: fail,
  });
  const edit = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: JsonValue }) => { const { error } = await supabase.from("updates").update({ body }).eq("id", id); if (error) throw error; },
    onSuccess: done,
    onError: fail,
  });
  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("updates").update({ deleted_at: new Date().toISOString() }).eq("id", id); if (error) throw error; },
    onSuccess: done,
    onError: fail,
  });
  const pin = useMutation({
    mutationFn: async ({ id, pinned }: { id: string; pinned: boolean }) => { const { error } = await supabase.from("updates").update({ pinned }).eq("id", id); if (error) throw error; },
    onSuccess: done,
    onError: fail,
  });
  const react = useMutation({
    mutationFn: async ({ id, emoji, on }: { id: string; emoji: string; on: boolean }) => {
      const { error } = on
        ? await supabase.from("reactions").insert({ update_id: id, user_id: userId, emoji })
        : await supabase.from("reactions").delete().eq("update_id", id).eq("user_id", userId).eq("emoji", emoji);
      if (error) throw error;
    },
    onSuccess: done,
    onError: fail,
  });
  return { post, edit, remove, pin, react };
}
