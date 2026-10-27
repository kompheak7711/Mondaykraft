import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { pickWorkspace, WORKSPACE_COOKIE } from "@/lib/workspace";
import { formatRelative } from "@/lib/format";
import { EmptyState } from "@/components/ui/empty-state";
import { restoreThing } from "../more-actions";

export const metadata: Metadata = { title: "Trash and archive" };

type Row = { kind: string; id: string; title: string; detail: string; when: string };

/** S25: what was trashed in the last 30 days and what is archived, with Restore. Purge runs daily. */
export default async function TrashPage() {
  const supabase = await createClient();
  const { data: workspaces } = await supabase.from("workspaces").select("id, name").is("deleted_at", null).order("created_at");
  const current = pickWorkspace((await cookies()).get(WORKSPACE_COOKIE)?.value, workspaces ?? []);
  if (!current) return null;
  const [{ data: boards }, { data: groups }, { data: items }] = await Promise.all([
    supabase.from("boards").select("id, name, deleted_at, archived_at").eq("workspace_id", current.id).or("deleted_at.not.is.null,archived_at.not.is.null"),
    supabase.from("groups").select("id, title, deleted_at, archived_at, boards!inner(name, workspace_id, deleted_at)").eq("boards.workspace_id", current.id).is("boards.deleted_at", null).or("deleted_at.not.is.null,archived_at.not.is.null"),
    supabase.from("items").select("id, name, deleted_at, archived_at, parent_item_id, boards!inner(name, workspace_id, deleted_at), groups(deleted_at)").eq("boards.workspace_id", current.id).is("boards.deleted_at", null).or("deleted_at.not.is.null,archived_at.not.is.null").limit(300),
  ]);
  const trashed: Row[] = [];
  const archived: Row[] = [];
  for (const b of boards ?? []) (b.deleted_at ? trashed : archived).push({ kind: b.deleted_at ? "board" : "archived_board", id: b.id, title: b.name, detail: "Board", when: b.deleted_at ?? b.archived_at! });
  for (const g of groups ?? []) {
    const board = g.boards as unknown as { name: string };
    (g.deleted_at ? trashed : archived).push({ kind: g.deleted_at ? "group" : "archived_group", id: g.id, title: g.title, detail: `Group in ${board.name}`, when: g.deleted_at ?? g.archived_at! });
  }
  for (const i of items ?? []) {
    const board = i.boards as unknown as { name: string };
    const group = i.groups as unknown as { deleted_at: string | null } | null;
    if (i.deleted_at && group?.deleted_at === i.deleted_at) continue; // comes back with its group
    (i.deleted_at ? trashed : archived).push({ kind: i.deleted_at ? "item" : "archived_item", id: i.id, title: i.name, detail: `${i.parent_item_id ? "Subitem" : "Item"} in ${board.name}`, when: i.deleted_at ?? i.archived_at! });
  }
  const sortRows = (rows: Row[]) => rows.sort((a, b) => b.when.localeCompare(a.when));

  const list = (rows: Row[], empty: string) => rows.length === 0 ? (
    <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-text-muted">{empty}</p>
  ) : (
    <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
      {rows.map((r) => (
        <li key={r.kind + r.id} className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium">{r.title}</div>
            <div className="truncate text-xs text-text-muted">{r.detail} · {formatRelative(r.when)}</div>
          </div>
          <form action={restoreThing}>
            <input type="hidden" name="kind" value={r.kind} />
            <input type="hidden" name="id" value={r.id} />
            <button type="submit" className="rounded-md border border-border px-3 py-1 text-xs hover:bg-surface-2">Restore</button>
          </form>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 p-4 sm:p-6">
      <div>
        <h1 className="text-xl font-bold">Trash and archive</h1>
        <p className="text-sm text-text-muted">Trashed boards, groups and items stay 30 days, then they are purged for good. Archived things stay until you restore them.</p>
      </div>
      {trashed.length === 0 && archived.length === 0 ? (
        <EmptyState icon={Trash2} title="Nothing here" description="Things you trash or archive show up here." />
      ) : (
        <>
          <section className="space-y-2"><h2 className="text-sm font-semibold text-text-muted">Trash · {trashed.length}</h2>{list(sortRows(trashed), "The trash is empty.")}</section>
          <section className="space-y-2"><h2 className="text-sm font-semibold text-text-muted">Archived · {archived.length}</h2>{list(sortRows(archived), "Nothing is archived.")}</section>
        </>
      )}
    </div>
  );
}
