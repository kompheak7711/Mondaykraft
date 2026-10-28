"use client";

import { Button } from "@/components/ui/button";
import { PersonAvatar } from "@/components/ui/avatar-stack";
import { moduleFor } from "@/lib/columns";
import type { BoardContext } from "@/lib/columns/types";
import type { BoardSnapshot } from "@/lib/board/types";
import type { Tables } from "@/lib/db/helpers";
import { formatRelative } from "@/lib/format";

type Activity = Tables<"activities">;

/** One sentence per activity row, for the item panel (no item name) and the board activity panel (with it). */
export function ActivityList({ rows, snapshot: s, ctx, showItem = false, empty, onRevert }: { rows: Activity[]; snapshot: BoardSnapshot; ctx: BoardContext; showItem?: boolean; empty: string; onRevert?: (a: Activity) => void }) {
  if (rows.length === 0) return <p className="text-sm text-text-muted">{empty}</p>;
  return (
    <ol className="space-y-2">
      {rows.map((a) => {
        const who = s.members.find((m) => m.id === a.actor_id);
        const col = s.columns.find((c) => c.id === a.column_id);
        const item = showItem && a.item_id ? s.items.find((i) => i.id === a.item_id)?.name : undefined;
        const txt = (v: unknown) => (col && v && typeof v === "object" ? moduleFor(col.type).toText(v as Record<string, unknown>, col, ctx) : typeof v === "string" ? v : v == null ? "" : JSON.stringify(v));
        const revertable = Boolean(onRevert) && s.access.can_edit_items && (a.kind === "cell_changed" || a.kind === "cell_cleared" || a.kind === "item_renamed") && Boolean(a.item_id && s.items.some((i) => i.id === a.item_id)) && (a.kind === "item_renamed" || Boolean(col));
        const what =
          a.kind === "cell_changed" ? `${col?.title ?? "a cell"}: ${txt(a.old_value) || "empty"} → ${txt(a.new_value) || "empty"}` :
          a.kind === "cell_cleared" ? `cleared ${col?.title ?? "a cell"} (was ${txt(a.old_value)})` :
          a.kind === "item_created" ? (showItem ? "created it" : "created this item") :
          a.kind === "item_renamed" ? `renamed “${txt(a.old_value)}” to “${txt(a.new_value)}”` :
          a.kind === "item_moved" ? `moved it to ${s.groups.find((g) => g.id === a.new_value)?.title ?? "another group"}` :
          a.kind.replace(/_/g, " ");
        return (
          <li key={a.id} className="flex items-start gap-2 text-sm">
            {who ? <PersonAvatar person={who} size={24} /> : <span className="flex size-6 items-center justify-center rounded-pill bg-surface-2 text-[10px]" aria-hidden>⚡</span>}
            <div className="min-w-0 flex-1">
              <span className="font-medium">{who?.name ?? (a.automation_id ? "An automation" : "Someone")}</span>{item ? <> on <span className="font-medium">{item}</span></> : null} <span className="text-text">{what}</span>
              <div className="text-xs text-text-muted" title={new Date(a.created_at).toLocaleString()}>{formatRelative(a.created_at)}</div>
            </div>
            {revertable ? <Button variant="ghost" size="xs" className="shrink-0" onClick={() => onRevert!(a)} aria-label={`Revert: ${what}`} title="Put it back to what it was before this change">Revert</Button> : null}
          </li>
        );
      })}
    </ol>
  );
}
