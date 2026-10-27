import type { Metadata } from "next";
import Link from "next/link";
import { Inbox } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatRelative } from "@/lib/format";
import { EmptyState } from "@/components/ui/empty-state";
import { PersonAvatar } from "@/components/ui/avatar-stack";

export const metadata: Metadata = { title: "Inbox" };

/** S20: the latest updates from every board you can read, newest first. */
export default async function InboxPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("updates")
    .select("id, body_text, created_at, item_id, board_id, author_id, items(name), boards(name), profiles(name, avatar_url)")
    .is("parent_update_id", null)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(50);
  const rows = data ?? [];
  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 p-4 sm:p-6">
      <div>
        <h1 className="text-xl font-bold">Inbox</h1>
        <p className="text-sm text-text-muted">Conversation from your boards in one feed.</p>
      </div>
      {rows.length === 0 ? (
        <EmptyState icon={Inbox} title="No updates yet" description="When someone posts on an item in a board you can see, it shows up here." />
      ) : (
        <ul className="space-y-3">
          {rows.map((u) => {
            const author = u.profiles as unknown as { name: string; avatar_url: string | null } | null;
            const item = u.items as unknown as { name: string } | null;
            const board = u.boards as unknown as { name: string } | null;
            return (
              <li key={u.id} className="rounded-lg border border-border bg-surface p-3">
                <div className="flex items-center gap-2">
                  <PersonAvatar person={{ id: u.author_id ?? "", name: author?.name ?? "Former member", avatarUrl: author?.avatar_url }} size={28} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm"><span className="font-medium">{author?.name ?? "Former member"}</span> <span className="text-text-muted">on</span> <Link href={`/boards/${u.board_id}/items/${u.item_id}`} className="font-medium hover:underline">{item?.name ?? "an item"}</Link></div>
                    <div className="truncate text-xs text-text-muted">{board?.name} · {formatRelative(u.created_at)}</div>
                  </div>
                </div>
                <p className="mt-2 line-clamp-4 text-sm whitespace-pre-wrap">{u.body_text}</p>
                <Link href={`/boards/${u.board_id}/items/${u.item_id}#updates`} className="mt-2 inline-block text-xs font-medium text-brand-text hover:underline">Reply</Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
