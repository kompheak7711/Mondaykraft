"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, Download, History, MoreHorizontal, Pencil, Shield, Trash2, Users, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { AvatarStack } from "@/components/ui/avatar-stack";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { BoardSnapshot } from "@/lib/board/types";
import type { BoardMutations } from "@/lib/board/mutations";
import type { PresencePerson } from "@/lib/board/realtime";
import { createClient } from "@/lib/supabase/client";
import { downloadText } from "@/lib/csv";
import { boardCsv, fileName } from "@/lib/board/export";
import { cellText } from "@/lib/board/model";
import { friendlyError } from "@/lib/supabase/errors";

const permissionSets: { value: BoardSnapshot["board"]["permission_set"]; label: string; hint: string }[] = [
  { value: "edit_everything", label: "Edit everything", hint: "Members change items, cells, columns, views and automations." },
  { value: "edit_content", label: "Only edit content", hint: "Members change items and cells, not the structure." },
  { value: "edit_assigned", label: "Only edit assigned items", hint: "Members change items where a people column names them." },
  { value: "view_comment", label: "View and comment", hint: "Members read and post updates only." },
];

export function BoardHeader({ snapshot: s, mutations, presence }: { snapshot: BoardSnapshot; mutations: BoardMutations; presence: PresencePerson[] }) {
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(s.board.name);
  const [confirm, setConfirm] = useState<"archive" | "remove" | null>(null);
  const router = useRouter();
  const canStructure = s.access.can_edit_structure;
  const owner = s.access.is_owner;

  const commitName = () => {
    setRenaming(false);
    const next = name.trim();
    if (next && next !== s.board.name) mutations.updateBoard({ name: next });
    else setName(s.board.name);
  };

  return (
    <header className="flex min-h-board-header flex-wrap items-center gap-2 border-b border-border px-3 py-2 sm:px-4">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {renaming ? (
          <Input value={name} onChange={(e) => setName(e.target.value)} onBlur={commitName} onKeyDown={(e) => { if (e.key === "Enter") commitName(); if (e.key === "Escape") { setName(s.board.name); setRenaming(false); } }} aria-label="Board name" className="h-8 max-w-sm text-lg font-semibold" autoFocus maxLength={200} />
        ) : (
          <h1 className="truncate text-lg font-semibold">
            {canStructure ? (
              <button type="button" onClick={() => setRenaming(true)} className="rounded-sm text-left hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-brand" title="Rename board">{s.board.name}</button>
            ) : s.board.name}
          </h1>
        )}
        {s.board.kind === "private" ? (
          <Tooltip><TooltipTrigger asChild><span className="inline-flex" aria-label="Private board"><Shield className="size-4 text-text-muted" /></span></TooltipTrigger><TooltipContent>Private board: invited members only</TooltipContent></Tooltip>
        ) : null}
        {s.board.description ? <p className="hidden truncate text-sm text-text-muted lg:block">{s.board.description}</p> : null}
      </div>
      <div className="flex items-center gap-1 sm:gap-2">
        {presence.length > 0 ? (
          <Tooltip>
            <TooltipTrigger asChild><span className="inline-flex"><AvatarStack people={presence} size={28} max={5} /></span></TooltipTrigger>
            <TooltipContent>{presence.length === 1 ? "Only you are here" : `${presence.length} people viewing: ${presence.map((p) => p.name).join(", ")}`}</TooltipContent>
          </Tooltip>
        ) : null}
        <Button asChild variant="ghost" size="sm"><Link href={`/boards/${s.board.id}?panel=members`} aria-label="Members"><Users className="size-4" /> <span className="hidden sm:inline">Members</span></Link></Button>
        <Button asChild variant="ghost" size="sm"><Link href={`/boards/${s.board.id}?panel=activity`} aria-label="Activity"><History className="size-4" /> <span className="hidden sm:inline">Activity</span></Link></Button>
        <Button asChild variant="ghost" size="sm"><Link href={`/boards/${s.board.id}/automations`}><Zap className="size-4" /> <span className="hidden sm:inline">Automate</span></Link></Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild><IconButton aria-label="Board options"><MoreHorizontal /></IconButton></DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>{s.board.name}</DropdownMenuLabel>
            {canStructure ? <DropdownMenuItem onSelect={() => setRenaming(true)}><Pencil className="size-4" /> Rename</DropdownMenuItem> : null}
            {canStructure ? <DropdownMenuItem onSelect={() => {
              const d = window.prompt("Board description", s.board.description ?? "");
              if (d !== null) mutations.updateBoard({ description: d.trim() || null });
            }}>Edit description</DropdownMenuItem> : null}
            <DropdownMenuItem asChild><Link href={`/boards/${s.board.id}?panel=activity`}><History className="size-4" /> Activity log</Link></DropdownMenuItem>
            <DropdownMenuItem onSelect={() => downloadText(fileName(s.board.name, "csv"), boardCsv({ ...s, text: (i, c) => cellText(s, i, c) }))}><Download className="size-4" /> Export board (CSV)</DropdownMenuItem>
            {owner ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger><Shield className="size-4" /> Permissions</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-72">
                    <DropdownMenuLabel>Members can</DropdownMenuLabel>
                    <DropdownMenuRadioGroup value={s.board.permission_set} onValueChange={(v) => mutations.updateBoard({ permission_set: v as BoardSnapshot["board"]["permission_set"] })}>
                      {permissionSets.map((p) => (
                        <DropdownMenuRadioItem key={p.value} value={p.value} className="flex-col items-start gap-0">
                          <span>{p.label}</span>
                          <span className="text-xs text-text-muted">{p.hint}</span>
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Board type</DropdownMenuLabel>
                    <DropdownMenuRadioGroup value={s.board.kind} onValueChange={(v) => mutations.updateBoard({ kind: v as "main" | "private" })}>
                      <DropdownMenuRadioItem value="main">Main: everyone in the workspace</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="private">Private: invited members only</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild><Link href={`/boards/${s.board.id}?panel=members`}>Board members and owners</Link></DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>Duplicate board</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {([["structure", "Structure only"], ["items", "With items"], ["items_updates", "With items and updates"]] as const).map(([mode, label]) => (
                      <DropdownMenuItem key={mode} onSelect={async () => {
                        const { data, error } = await createClient().rpc("duplicate_board", { p_board: s.board.id, p_mode: mode });
                        if (error || !data) { toast.error(friendlyError(error)); return; }
                        toast.success("Board copied. Automations are switched off on the copy.");
                        router.push(`/boards/${data}`);
                        router.refresh();
                      }}>{label}</DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setConfirm("archive")}><Archive className="size-4" /> Archive board</DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onSelect={() => setConfirm("remove")}><Trash2 className="size-4" /> Move board to trash</DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={confirm !== null} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirm === "remove" ? "Move this board to the trash?" : "Archive this board?"}</DialogTitle>
            <DialogDescription>
              {confirm === "remove" ? "It stays in the trash for 30 days with its items, updates and files. You can restore it from there." : "It leaves the sidebar but keeps everything. Find it under Trash and archive to bring it back."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" autoFocus>Cancel</Button></DialogClose>
            <Button variant={confirm === "remove" ? "destructive" : "default"} onClick={async () => {
              const ok = await mutations.updateBoard(confirm === "remove" ? { deleted_at: new Date().toISOString() } : { archived_at: new Date().toISOString() });
              setConfirm(null);
              if (ok) { toast(confirm === "remove" ? "Board moved to trash" : "Board archived"); router.push("/"); router.refresh(); }
            }}>{confirm === "remove" ? "Move to trash" : "Archive"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}
