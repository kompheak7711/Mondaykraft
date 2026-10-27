import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";
import type { Column, Item } from "@/lib/columns/types";
import { cellKey, type Access, type BoardSnapshot, type CellRow, type Member } from "./types";

type Client = SupabaseClient<Database>;
const PAGE = 5000;

/** PostgREST caps a response at max_rows; page until a short page comes back. */
async function all<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < PAGE) return out;
  }
}

export class BoardAccessError extends Error {
  constructor(public readonly reason: "not_found" | "forbidden") {
    super(reason);
  }
}

export async function loadBoard(supabase: Client, boardId: string, userId: string): Promise<BoardSnapshot> {
  const { data: board, error } = await supabase.from("boards").select("*").eq("id", boardId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!board) throw new BoardAccessError("not_found");

  const [accessRes, groups, columns, views, items, cells, people, tags, assets, workspace, counts] = await Promise.all([
    supabase.rpc("board_access", { p_board: boardId }),
    all((a, b) => supabase.from("groups").select("*").eq("board_id", boardId).is("deleted_at", null).order("position").order("created_at").range(a, b)),
    all((a, b) => supabase.from("columns").select("*").eq("board_id", boardId).is("deleted_at", null).order("position").order("created_at").range(a, b)),
    all((a, b) => supabase.from("views").select("*").eq("board_id", boardId).is("deleted_at", null).order("position").order("created_at").range(a, b)),
    all((a, b) => supabase.from("items").select("*").eq("board_id", boardId).is("deleted_at", null).order("position").order("created_at").range(a, b)),
    all((a, b) => supabase.from("column_values").select("*").eq("board_id", boardId).range(a, b)),
    supabase.rpc("workspace_people", { p_workspace: board.workspace_id }),
    supabase.from("tags").select("id, name, color").eq("workspace_id", board.workspace_id).order("name"),
    all((a, b) => supabase.from("assets").select("id, name, mime, size").eq("board_id", boardId).is("deleted_at", null).range(a, b)),
    supabase.from("workspaces").select("timezone").eq("id", board.workspace_id).single(),
    all((a, b) => supabase.from("item_update_counts").select("item_id, count").eq("board_id", boardId).range(a, b)),
  ]);
  if (accessRes.error) throw new Error(accessRes.error.message);
  const access = accessRes.data as unknown as Access;
  if (!access?.role) throw new BoardAccessError("forbidden");

  const cellMap: Record<string, CellRow> = {};
  for (const c of cells) cellMap[cellKey(c.item_id, c.column_id)] = c;
  const assetMap: BoardSnapshot["assets"] = {};
  for (const a of assets) assetMap[a.id] = a;
  const updateCounts: Record<string, number> = {};
  for (const c of counts) if (c.item_id) updateCounts[c.item_id] = c.count ?? 0;

  return {
    board,
    access,
    userId,
    groups,
    columns: columns as unknown as Column[],
    views,
    items: items as Item[],
    cells: cellMap,
    members: ((people.data ?? []) as { id: string; name: string; email: string; avatar_url: string | null; role: string }[]).map((p) => ({ id: p.id, name: p.name, email: p.email, avatarUrl: p.avatar_url, role: p.role })) as Member[],
    tags: tags.data ?? [],
    assets: assetMap,
    updateCounts,
    timezone: workspace.data?.timezone ?? "UTC",
  };
}
