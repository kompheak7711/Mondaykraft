"use client";

import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { BoardAccessError, loadBoard } from "./load";
import type { BoardSnapshot } from "./types";

export const boardKey = (boardId: string) => ["board", boardId] as const;

export function useBoard(boardId: string) {
  const supabase = createClient();
  return useQuery({
    queryKey: boardKey(boardId),
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new BoardAccessError("forbidden");
      return loadBoard(supabase, boardId, user.id);
    },
    staleTime: Infinity, // realtime keeps it fresh; reconnects refetch
    retry: (count, err) => !(err instanceof BoardAccessError) && count < 2,
  });
}

export function patchBoard(client: QueryClient, boardId: string, fn: (s: BoardSnapshot) => BoardSnapshot) {
  client.setQueryData<BoardSnapshot>(boardKey(boardId), (old) => (old ? fn(old) : old));
}

export function useBoardPatcher(boardId: string) {
  const client = useQueryClient();
  return (fn: (s: BoardSnapshot) => BoardSnapshot) => patchBoard(client, boardId, fn);
}

/** Upsert a row into a list by id, keeping the list order stable for existing rows. */
export function upsertRow<T extends { id: string }>(list: T[], row: T): T[] {
  const i = list.findIndex((r) => r.id === row.id);
  if (i < 0) return [...list, row];
  const next = list.slice();
  next[i] = row;
  return next;
}

export function removeRow<T extends { id: string }>(list: T[], id: string): T[] {
  return list.filter((r) => r.id !== id);
}
