"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Crown, UserMinus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Skeleton } from "@/components/ui/skeleton";
import { PersonAvatar } from "@/components/ui/avatar-stack";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/supabase/errors";
import type { BoardContext } from "@/lib/columns/types";
import type { BoardSnapshot } from "@/lib/board/types";
import type { BoardMutations } from "@/lib/board/mutations";
import { ActivityList } from "./activity-list";

const roles = ["owner", "member", "viewer"] as const;
type Role = (typeof roles)[number];

/** The right-hand sheets behind `?panel=members` and `?panel=activity`. */
export function BoardPanels({ panel, snapshot: s, ctx, mutations, onClose }: { panel: string | null; snapshot: BoardSnapshot; ctx: BoardContext; mutations: BoardMutations; onClose: () => void }) {
  const open = panel === "members" || panel === "activity";
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto sm:max-w-md">
        {panel === "members" ? <Members snapshot={s} /> : panel === "activity" ? <Activity snapshot={s} ctx={ctx} mutations={mutations} /> : null}
      </SheetContent>
    </Sheet>
  );
}

function Members({ snapshot: s }: { snapshot: BoardSnapshot }) {
  const supabase = createClient();
  const client = useQueryClient();
  const key = ["board_members", s.board.id];
  const q = useQuery({ queryKey: key, queryFn: async () => { const { data, error } = await supabase.from("board_members").select("user_id, role, created_at").eq("board_id", s.board.id).order("created_at"); if (error) throw new Error(error.message); return data; } });
  const [adding, setAdding] = useState("");
  const [role, setRole] = useState<Role>("member");
  const owner = s.access.is_owner;
  const rows = (q.data ?? []).map((m) => ({ ...m, person: s.members.find((p) => p.id === m.user_id) })).sort((a, b) => (a.role === "owner" ? 0 : 1) - (b.role === "owner" ? 0 : 1));
  const candidates = s.members.filter((p) => !q.data?.some((m) => m.user_id === p.id));
  const act = async (p: PromiseLike<{ error: { message: string; code?: string } | null }>) => {
    const { error } = await p;
    if (error) toast.error(friendlyError(error));
    client.invalidateQueries({ queryKey: key });
  };
  return (
    <>
      <SheetHeader>
        <SheetTitle>Board members</SheetTitle>
        <SheetDescription>{s.board.kind === "private" ? "Only the people below can open this private board." : "Everyone in the workspace can open this main board; members below have a role on it."}</SheetDescription>
      </SheetHeader>
      <div className="space-y-4 p-4 pt-0">
        {q.isPending ? <Skeleton className="h-24 w-full" /> : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {rows.map((m) => (
              <li key={m.user_id} className="flex items-center gap-2 px-3 py-2 text-sm">
                {m.person ? <PersonAvatar person={m.person} size={28} /> : null}
                <span className="min-w-0 flex-1 truncate">{m.person?.name ?? "Former member"}{m.role === "owner" ? <Crown className="ml-1 inline size-3.5 text-warning" aria-hidden /> : null}<span className="sr-only">, {m.role}</span></span>
                {owner ? (
                  <>
                    <select aria-label={`Role of ${m.person?.name ?? "member"}`} value={m.role} onChange={(e) => act(supabase.from("board_members").update({ role: e.target.value as Role }).eq("board_id", s.board.id).eq("user_id", m.user_id))} className="h-7 rounded-md border border-border-input bg-bg px-1 text-xs">
                      {roles.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <IconButton aria-label={`Remove ${m.person?.name ?? "member"} from the board`} size="sm" onClick={() => act(supabase.from("board_members").delete().eq("board_id", s.board.id).eq("user_id", m.user_id))}><UserMinus /></IconButton>
                  </>
                ) : <span className="text-xs text-text-muted">{m.role}</span>}
              </li>
            ))}
            {rows.length === 0 ? <li className="px-3 py-3 text-sm text-text-muted">No one has a role on this board yet.</li> : null}
          </ul>
        )}
        {owner && candidates.length ? (
          <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); if (!adding) return; act(supabase.from("board_members").insert({ board_id: s.board.id, user_id: adding, role })); setAdding(""); }}>
            <label className="flex-1 space-y-1 text-xs"><span className="font-medium">Add from the workspace</span>
              <select value={adding} onChange={(e) => setAdding(e.target.value)} aria-label="Person to add" className="h-8 w-full rounded-md border border-border-input bg-bg px-2 text-sm">
                <option value="">Pick a person</option>
                {candidates.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select></label>
            <select value={role} onChange={(e) => setRole(e.target.value as Role)} aria-label="Role for the new member" className="h-8 rounded-md border border-border-input bg-bg px-2 text-sm">{roles.map((r) => <option key={r} value={r}>{r}</option>)}</select>
            <Button type="submit" size="sm" disabled={!adding}>Add</Button>
          </form>
        ) : null}
        {!owner ? <p className="text-xs text-text-muted">Board owners (crown) change roles and membership.</p> : null}
      </div>
    </>
  );
}

function Activity({ snapshot: s, ctx, mutations }: { snapshot: BoardSnapshot; ctx: BoardContext; mutations: BoardMutations }) {
  const supabase = createClient();
  const client = useQueryClient();
  const key = ["board_activities", s.board.id];
  const q = useQuery({ queryKey: key, refetchInterval: 15_000, queryFn: async () => { const { data, error } = await supabase.from("activities").select("*").eq("board_id", s.board.id).order("created_at", { ascending: false }).limit(200); if (error) throw new Error(error.message); return data; } });
  return (
    <>
      <SheetHeader>
        <SheetTitle>Activity log</SheetTitle>
        <SheetDescription>The last 200 changes on this board, newest first.</SheetDescription>
      </SheetHeader>
      <div className="p-4 pt-0">
        {q.isPending ? <Skeleton className="h-24 w-full" /> : <ActivityList rows={q.data ?? []} snapshot={s} ctx={ctx} showItem empty="Nothing has happened on this board yet." onRevert={async (a) => { if (await mutations.revertActivity(a)) toast.success("Put back"); client.invalidateQueries({ queryKey: key }); }} />}
      </div>
    </>
  );
}
