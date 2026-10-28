"use client";

import { useState } from "react";
import { Archive, FileIcon, MoreHorizontal, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { moduleFor } from "@/lib/columns";
import type { BoardContext, Item } from "@/lib/columns/types";
import { canEditItem, cellsOf, cellText, type CellIndex } from "@/lib/board/model";
import { cellKey, type BoardSnapshot } from "@/lib/board/types";
import type { BoardMutations } from "@/lib/board/mutations";
import { formatRelative } from "@/lib/format";
import { ActivityList } from "@/components/board/activity-list";
import { useActivities, useItemAssets } from "@/lib/item/queries";
import { CellFrame } from "@/components/board/cell";
import { Updates } from "./updates";

type Props = { itemId: string; snapshot: BoardSnapshot; index: CellIndex; ctx: BoardContext; mutations: BoardMutations; onClose: () => void; flashes: Record<string, number> };

/** S06: the item card. Right-docked on desktop, full screen on small screens. */
export function ItemPanel({ itemId, snapshot: s, index, ctx, mutations, onClose, flashes }: Props) {
  const item = s.items.find((i) => i.id === itemId);
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-item-panel" showCloseButton={false}>
        {!item ? (
          <div className="p-6">
            <SheetTitle className="sr-only">Item</SheetTitle>
            <SheetDescription className="sr-only">Not found</SheetDescription>
            <EmptyState title="This item isn't here" description="It may have been removed or moved to another board." action={<Button variant="outline" onClick={onClose}>Close</Button>} />
          </div>
        ) : (
          <PanelBody item={item} s={s} index={index} ctx={ctx} mutations={mutations} onClose={onClose} flashes={flashes} />
        )}
      </SheetContent>
    </Sheet>
  );
}

function PanelBody({ item, s, index, ctx, mutations, onClose, flashes }: { item: Item; s: BoardSnapshot; index: CellIndex; ctx: BoardContext; mutations: BoardMutations; onClose: () => void; flashes: Record<string, number> }) {
  const [tab, setTab] = useState("updates");
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(item.name);
  const editable = canEditItem(s, index, item);
  const cells = cellsOf(index, item.id);
  const columns = s.columns.filter((c) => c.scope === (item.parent_item_id ? "subitem" : "item"));
  const group = s.groups.find((g) => g.id === (item.group_id ?? s.items.find((p) => p.id === item.parent_item_id)?.group_id));
  const parent = item.parent_item_id ? s.items.find((p) => p.id === item.parent_item_id) : undefined;
  const activities = useActivities(item.id, tab === "activity");
  const assets = useItemAssets(item.id, tab === "files");
  const filesColumns = columns.filter((c) => c.type === "files");
  const commitName = () => { setRenaming(false); mutations.renameItem(item, name); };

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-start gap-2 border-b border-border p-4">
        <div className="min-w-0 flex-1">
          <SheetDescription className="truncate text-xs text-text-muted">{s.board.name}{group ? ` · ${group.title}` : ""}{parent ? ` · ${parent.name}` : ""}</SheetDescription>
          {renaming ? (
            <Input value={name} onChange={(e) => setName(e.target.value)} onBlur={commitName} onKeyDown={(e) => { if (e.key === "Enter") commitName(); if (e.key === "Escape") { setName(item.name); setRenaming(false); } }} aria-label="Item name" className="mt-1 h-8 text-lg font-semibold" autoFocus maxLength={500} />
          ) : (
            <SheetTitle className="mt-0.5 text-lg font-semibold">
              {editable ? <button type="button" onClick={() => { setName(item.name); setRenaming(true); }} className="rounded-sm text-left hover:bg-surface-2" title="Rename">{item.name}</button> : item.name}
            </SheetTitle>
          )}
        </div>
        {editable ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild><IconButton aria-label="Item options"><MoreHorizontal /></IconButton></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => navigator.clipboard?.writeText(location.href)}>Copy link</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={async () => { await mutations.archiveItems([item.id]); onClose(); }}><Archive className="size-4" /> Archive</DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onSelect={async () => { await mutations.deleteItems([item.id]); onClose(); }}><Trash2 className="size-4" /> Move to trash</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
        <IconButton aria-label="Close" onClick={onClose}><X /></IconButton>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <section aria-label="Fields" className="grid gap-x-4 gap-y-1 border-b border-border p-4 sm:grid-cols-[140px_1fr]">
          {columns.map((c) => {
            const m = moduleFor(c.type);
            return (
              <div key={c.id} className="contents">
                <div className="flex min-h-8 items-center gap-1.5 text-sm text-text-muted"><m.icon className="size-3.5" aria-hidden /> <span className="truncate">{c.title}</span></div>
                <CellFrame item={item} column={c} value={cells[c.id] ?? null} text={cellText(s, item.id, c.id)} cells={cells} canEdit={editable} board={ctx} variant="field" flash={Boolean(flashes[cellKey(item.id, c.id)])} onChange={(v) => mutations.setCell(item, c, v)} />
              </div>
            );
          })}
        </section>

        <Tabs value={tab} onValueChange={setTab} className="p-4">
          <TabsList>
            <TabsTrigger value="updates">Updates{s.updateCounts[item.id] ? ` (${s.updateCounts[item.id]})` : ""}</TabsTrigger>
            <TabsTrigger value="files">Files</TabsTrigger>
            <TabsTrigger value="activity">Activity log</TabsTrigger>
          </TabsList>
          <TabsContent value="updates" className="pt-3">
            <Updates itemId={item.id} boardId={s.board.id} userId={s.userId} members={s.members} canComment={s.access.can_comment} isOwner={s.access.is_owner} />
          </TabsContent>
          <TabsContent value="files" className="pt-3">
            {assets.isPending ? <Skeleton className="h-16 w-full" /> : null}
            {assets.data && assets.data.length === 0 ? (
              <EmptyState icon={FileIcon} title="No files on this item" description={filesColumns.length ? `Add files in the ${filesColumns[0].title} column or attach them to an update.` : "Add a Files column to the board, or attach files to an update."} className="py-8" />
            ) : null}
            <ul className="divide-y divide-border">
              {assets.data?.map((a) => {
                const col = s.columns.find((c) => c.id === a.column_id);
                const who = s.members.find((m) => m.id === a.uploaded_by);
                return (
                  <li key={a.id} className="flex items-center gap-3 py-2">
                    <a href={`/api/assets/${a.id}`} target="_blank" rel="noopener noreferrer" className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-surface-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {a.mime.startsWith("image/") ? <img src={`/api/assets/${a.id}`} alt="" className="size-10 object-cover" /> : <FileIcon className="size-5 text-text-muted" aria-hidden />}
                    </a>
                    <div className="min-w-0 flex-1">
                      <a href={`/api/assets/${a.id}`} target="_blank" rel="noopener noreferrer" className="block truncate text-sm font-medium hover:underline">{a.name}</a>
                      <div className="text-xs text-text-muted">{Math.max(1, Math.round(a.size / 1024))} KB · {col ? col.title : "in an update"} · {who?.name ?? "Someone"} · {formatRelative(a.created_at)}</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </TabsContent>
          <TabsContent value="activity" className="pt-3">
            {activities.isPending ? <Skeleton className="h-16 w-full" /> : null}
            {activities.data ? <ActivityList rows={activities.data} snapshot={s} ctx={ctx} empty="Nothing has happened to this item yet." /> : null}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
