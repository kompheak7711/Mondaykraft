import type { Metadata } from "next";
import Link from "next/link";
import { AtSign, Bell, CheckCheck, MessageSquare, UserPlus, Zap } from "lucide-react";
import { cn } from "cn";
import { createClient } from "@/lib/supabase/server";
import { formatRelative } from "@/lib/format";
import { EmptyState } from "@/components/ui/empty-state";
import { markAllRead, markRead } from "../more-actions";

export const metadata: Metadata = { title: "Notifications" };

const tabs = [["all", "All"], ["unread", "Unread"], ["mentions", "I was mentioned"], ["assigned", "Assigned to me"]] as const;
const icons = { mention: AtSign, assigned: UserPlus, reply: MessageSquare, update: MessageSquare, automation: Zap, deleted: Bell, archived: Bell } as const;

/** S19: the bell, as a page (the popover arrives with the shell polish). */
export default async function NotificationsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab = "all" } = await searchParams;
  const supabase = await createClient();
  let q = supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(100);
  if (tab === "unread") q = q.is("read_at", null);
  if (tab === "mentions") q = q.eq("kind", "mention");
  if (tab === "assigned") q = q.eq("kind", "assigned");
  const { data } = await q;
  const rows = data ?? [];
  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Notifications</h1>
        <form action={markAllRead}><button type="submit" className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-surface-2"><CheckCheck className="size-4" /> Mark all as read</button></form>
      </div>
      <nav aria-label="Notification filters" className="flex gap-1 overflow-x-auto border-b border-border">
        {tabs.map(([key, label]) => (
          <Link key={key} href={key === "all" ? "/notifications" : `/notifications?tab=${key}`} aria-current={tab === key ? "page" : undefined}
            className={cn("shrink-0 border-b-2 px-3 py-2 text-sm", tab === key ? "border-brand font-medium text-brand-text" : "border-transparent text-text-muted hover:text-text")}>{label}</Link>
        ))}
      </nav>
      {rows.length === 0 ? (
        <EmptyState icon={Bell} title="You're all caught up" description="Mentions, assignments, replies and automation notices land here." />
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
          {rows.map((n) => {
            const Icon = icons[n.kind as keyof typeof icons] ?? Bell;
            const href = n.item_id && n.board_id ? `/boards/${n.board_id}/items/${n.item_id}${n.update_id ? `#update-${n.update_id}` : ""}` : n.board_id ? `/boards/${n.board_id}` : "/";
            return (
              <li key={n.id} className={cn("flex items-start gap-3 px-3 py-2.5", !n.read_at && "bg-brand-soft/40")}>
                <Icon className="mt-0.5 size-4 shrink-0 text-text-muted" aria-hidden />
                <div className="min-w-0 flex-1">
                  <Link href={href} className={cn("block text-sm hover:underline", !n.read_at && "font-medium")}>{n.text}</Link>
                  <div className="text-xs text-text-muted">{formatRelative(n.created_at)}</div>
                </div>
                {!n.read_at ? (
                  <form action={markRead}><input type="hidden" name="id" value={n.id} /><button type="submit" className="rounded-md px-2 py-1 text-xs text-text-muted hover:bg-surface-2 hover:text-text">Mark as read</button></form>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
