"use client";

import { useState } from "react";
import type { JSONContent } from "@tiptap/react";
import { MessageSquare, MoreHorizontal, Pin, Reply, ThumbsUp } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { PersonAvatar } from "@/components/ui/avatar-stack";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatRelative } from "@/lib/format";
import type { Person } from "@/lib/columns/types";
import { useUpdateMutations, useUpdates, type UpdateRow } from "@/lib/item/queries";
import { UpdateBody, UpdateEditor } from "./editor";

const EMOJI = ["👍", "🎉", "❤️", "👀", "✅", "🙏"];

export function Updates({ itemId, boardId, userId, members, canComment, isOwner }: { itemId: string; boardId: string; userId: string; members: Person[]; canComment: boolean; isOwner: boolean }) {
  const { data, isPending } = useUpdates(itemId);
  const m = useUpdateMutations(itemId, boardId, userId);
  return (
    <div className="space-y-4" id="updates">
      {canComment ? <UpdateEditor members={members} onSubmit={(doc) => m.post.mutateAsync({ body: doc as never })} /> : <p className="rounded-md bg-surface px-3 py-2 text-sm text-text-muted">You can read this conversation but not post in it.</p>}
      {isPending ? <div className="space-y-2"><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></div> : null}
      {data && data.length === 0 ? <EmptyState icon={MessageSquare} title="No updates yet" description="Start the conversation about this item. Mention a teammate with @." className="py-8" /> : null}
      <ul className="space-y-3">
        {data?.map((u) => <UpdateCard key={u.id} update={u} userId={userId} members={members} canComment={canComment} isOwner={isOwner} m={m} />)}
      </ul>
    </div>
  );
}

function UpdateCard({ update: u, userId, members, canComment, isOwner, m, isReply }: { update: UpdateRow; userId: string; members: Person[]; canComment: boolean; isOwner: boolean; m: ReturnType<typeof useUpdateMutations>; isReply?: boolean }) {
  const [editing, setEditing] = useState(false);
  const [replying, setReplying] = useState(false);
  const author = members.find((x) => x.id === u.author_id) ?? { id: u.author_id ?? "", name: "Former member" };
  const mine = u.author_id === userId;
  const counts = EMOJI.map((e) => ({ emoji: e, n: u.reactions.filter((r) => r.emoji === e).length, me: u.reactions.some((r) => r.emoji === e && r.user_id === userId) })).filter((c) => c.n > 0 || c.emoji === "👍");
  return (
    <li>
      <article aria-label={`Update by ${author.name}, ${formatRelative(u.created_at)}`} className={cn("rounded-lg border border-border bg-surface p-3", u.pinned && "border-t-2 border-t-brand", isReply && "bg-bg")}>
        <div className="flex items-center gap-2">
          <PersonAvatar person={author} size={28} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{author.name}</div>
            <div className="text-xs text-text-muted" title={new Date(u.created_at).toLocaleString()}>{formatRelative(u.created_at)}{u.edited_at ? " · edited" : ""}{u.pinned ? " · pinned" : ""}</div>
          </div>
          {(mine || isOwner) && canComment ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild><IconButton aria-label="Update options" size="sm"><MoreHorizontal /></IconButton></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {mine ? <DropdownMenuItem onSelect={() => setEditing(true)}>Edit</DropdownMenuItem> : null}
                {!isReply ? <DropdownMenuItem onSelect={() => m.pin.mutate({ id: u.id, pinned: !u.pinned })}><Pin className="size-4" /> {u.pinned ? "Unpin" : "Pin to top"}</DropdownMenuItem> : null}
                <DropdownMenuItem onSelect={() => navigator.clipboard?.writeText(`${location.origin}${location.pathname}#update-${u.id}`)}>Copy link</DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onSelect={() => m.remove.mutate(u.id)}>Remove</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
        <div className="mt-2" id={`update-${u.id}`}>
          {editing ? (
            <UpdateEditor members={members} initial={u.body as JSONContent} submitLabel="Save" autoFocus onCancel={() => setEditing(false)} onSubmit={async (doc) => { await m.edit.mutateAsync({ id: u.id, body: doc as never }); setEditing(false); }} />
          ) : (
            <UpdateBody doc={u.body as JSONContent} />
          )}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1">
          {counts.map((c) => (
            <button key={c.emoji} type="button" aria-pressed={c.me} aria-label={`${c.emoji} ${c.n}${c.me ? ", yours" : ""}`} disabled={!canComment} onClick={() => m.react.mutate({ id: u.id, emoji: c.emoji, on: !c.me })}
              className={cn("inline-flex h-6 items-center gap-1 rounded-pill border border-border px-2 text-xs hover:bg-surface-2 disabled:opacity-60", c.me && "border-brand bg-brand-soft text-brand-text")}>
              {c.emoji === "👍" && c.n === 0 ? <ThumbsUp className="size-3" aria-hidden /> : c.emoji} {c.n || ""}
            </button>
          ))}
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="xs" disabled={!canComment} aria-label="Add reaction">+</Button></DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="flex min-w-0 gap-1 p-1">
              {EMOJI.map((e) => <DropdownMenuItem key={e} className="px-1.5 text-base" onSelect={() => m.react.mutate({ id: u.id, emoji: e, on: !u.reactions.some((r) => r.emoji === e && r.user_id === userId) })}>{e}</DropdownMenuItem>)}
            </DropdownMenuContent>
          </DropdownMenu>
          {!isReply && canComment ? <Button variant="ghost" size="xs" onClick={() => setReplying((r) => !r)}><Reply /> Reply</Button> : null}
        </div>
        {u.replies.length || replying ? (
          <div className="mt-3 space-y-2 border-l-2 border-border pl-3">
            <ul className="space-y-2">{u.replies.map((r) => <UpdateCard key={r.id} update={r} userId={userId} members={members} canComment={canComment} isOwner={isOwner} m={m} isReply />)}</ul>
            {replying ? <UpdateEditor members={members} placeholder="Write a reply…" submitLabel="Reply" autoFocus onCancel={() => setReplying(false)} onSubmit={async (doc) => { await m.post.mutateAsync({ body: doc as never, parentId: u.id }); setReplying(false); }} /> : null}
          </div>
        ) : null}
      </article>
    </li>
  );
}
