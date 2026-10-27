"use client";

import { useMemo, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Lock, SearchX } from "lucide-react";
import { useBoard } from "@/lib/board/use-board";
import { useBoardRealtime } from "@/lib/board/realtime";
import { useBoardMutations } from "@/lib/board/mutations";
import { BoardAccessError } from "@/lib/board/load";
import { buildIndex, makeBoardContext } from "@/lib/board/model";
import type { Column } from "@/lib/columns/types";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { BoardHeader } from "./board-header";
import { ViewsBar } from "./views-bar";
import { Toolbar, type ToolbarState } from "./toolbar";
import { TableView } from "./table-view";
import { ColumnSettingsDialog } from "./column-settings-dialog";
import { ItemPanel } from "@/components/item/item-panel";

export function BoardScreen({ boardId, itemId }: { boardId: string; itemId?: string }) {
  const query = useBoard(boardId);
  const mutations = useBoardMutations(boardId);
  const s = query.data;
  const me = s ? s.members.find((m) => m.id === s.userId) ?? null : null;
  const { presence, flashes } = useBoardRealtime(boardId, me, Boolean(s));
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [toolbar, setToolbar] = useState<ToolbarState>({ search: "", persons: [] });
  const [settingsColumn, setSettingsColumn] = useState<Column | null>(null);

  const index = useMemo(() => (s ? buildIndex(s) : {}), [s]);
  const activeView = useMemo(() => {
    if (!s) return undefined;
    const wanted = params.get("view");
    return s.views.find((v) => v.id === wanted) ?? s.views.find((v) => v.is_default) ?? s.views[0];
  }, [s, params]);

  const ctx = useMemo(() => (s ? makeBoardContext(s, {
    onOpenColumnSettings: (c) => setSettingsColumn(c),
    onUpdateColumnSettings: async (c, settings) => { await mutations.updateColumn(c, { settings }); },
    onDeleteLabel: (c, id, moveTo) => mutations.deleteLabel(c, id, moveTo),
    countLabelUse: (c, id) => Object.values(index).filter((cells) => cells[c.id]?.label_id === id).length,
    onCreateTag: (name) => mutations.createTag(name),
    onUpload: (item, column, files) => mutations.uploadFiles(item, column, null, files),
    assetUrl: (a) => `/api/assets/${a.id}`,
  }) : null), [s, index, mutations]);

  if (query.isPending) {
    return (
      <div className="space-y-3 p-4" aria-busy>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-views-bar w-96" />
        {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-row w-full" />)}
      </div>
    );
  }
  if (query.isError || !s || !ctx) {
    const reason = query.error instanceof BoardAccessError ? query.error.reason : "error";
    return reason === "forbidden" || reason === "not_found" ? (
      <EmptyState icon={Lock} title={reason === "not_found" ? "This board doesn't exist" : "You don't have access to this board"} description={reason === "not_found" ? "It may have been removed, or the link is wrong." : "Ask a board owner to invite you, or pick another board from the sidebar."} />
    ) : (
      <EmptyState icon={SearchX} title="This board couldn't load" description={query.error instanceof Error ? query.error.message : "Try again in a moment."} />
    );
  }

  const selectView = (id: string) => {
    const next = new URLSearchParams(params.toString());
    next.set("view", id);
    router.replace(`${pathname}?${next.toString()}`);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <BoardHeader snapshot={s} mutations={mutations} presence={presence} />
      <ViewsBar snapshot={s} mutations={mutations} activeView={activeView} onSelect={selectView} />
      <Toolbar snapshot={s} mutations={mutations} view={activeView} state={toolbar} onState={setToolbar} />
      <div className="min-h-0 flex-1">
        {activeView?.type === "table" || !activeView ? (
          <TableView snapshot={s} index={index} ctx={ctx} mutations={mutations} view={activeView} toolbar={toolbar} flashes={flashes} />
        ) : (
          <EmptyState title={`${activeView.name} view`} description="This view type arrives in the next build phase. Switch to the table for now." />
        )}
      </div>
      <ColumnSettingsDialog column={settingsColumn} onClose={() => setSettingsColumn(null)} snapshot={s} ctx={ctx} mutations={mutations} />
      {itemId ? (
        <ItemPanel itemId={itemId} snapshot={s} index={index} ctx={ctx} mutations={mutations} flashes={flashes}
          onClose={() => router.push(`/boards/${boardId}${params.get("view") ? `?view=${params.get("view")}` : ""}`)} />
      ) : null}
    </div>
  );
}
