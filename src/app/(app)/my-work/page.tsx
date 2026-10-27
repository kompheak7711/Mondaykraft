import type { Metadata } from "next";
import Link from "next/link";
import { addDays, endOfWeek, format, parseISO, startOfWeek } from "date-fns";
import { CheckCircle2, ListTodo } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { todayKey } from "@/lib/format";
import { StatusChip } from "@/components/ui/status-chip";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "My Work" };

type Row = { item_id: string; item_name: string; parent_name: string | null; board_id: string; board_name: string; group_title: string | null; status_column_id: string | null; status: { label_id?: string } | null; status_label: string | null; is_done: boolean; due: string | null };

/** S18: everything assigned to me, grouped by due date in my time zone. */
export default async function MyWorkPage({ searchParams }: { searchParams: Promise<{ done?: string }> }) {
  const { done } = await searchParams;
  const showDone = done === "1";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [{ data: rows }, { data: profile }] = await Promise.all([
    supabase.rpc("my_work", { p_show_done: showDone }),
    supabase.from("profiles").select("timezone").eq("id", user!.id).single(),
  ]);
  const items = (rows ?? []) as unknown as Row[];
  const statusIds = Array.from(new Set(items.map((r) => r.status_column_id).filter(Boolean))) as string[];
  const { data: cols } = statusIds.length ? await supabase.from("columns").select("id, settings").in("id", statusIds) : { data: [] };
  const colorOf = (colId: string | null, labelId?: string) => {
    const labels = (cols?.find((c) => c.id === colId)?.settings as { labels?: { id: string; color: string }[] } | null)?.labels ?? [];
    return labels.find((l) => l.id === labelId)?.color;
  };

  const today = parseISO(todayKey(profile?.timezone ?? undefined));
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const nextWeekEnd = endOfWeek(addDays(weekEnd, 1), { weekStartsOn: 1 });
  const buckets: { key: string; title: string; test: (d: Date | null) => boolean }[] = [
    { key: "past", title: "Past dates", test: (d) => Boolean(d && d < today) },
    { key: "today", title: "Today", test: (d) => Boolean(d && format(d, "yyyy-MM-dd") === format(today, "yyyy-MM-dd")) },
    { key: "week", title: "This week", test: (d) => Boolean(d && d > today && d <= weekEnd) },
    { key: "next", title: "Next week", test: (d) => Boolean(d && d > weekEnd && d <= nextWeekEnd) },
    { key: "later", title: "Later", test: (d) => Boolean(d && d > nextWeekEnd) },
    { key: "none", title: "Without a date", test: (d) => d === null },
  ];
  void startOfWeek;
  const grouped = buckets.map((b) => ({ ...b, rows: items.filter((r) => b.test(r.due ? parseISO(r.due) : null)) })).filter((b) => b.rows.length);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">My Work</h1>
          <p className="text-sm text-text-muted">Items where a people column names you, across every board you can see.</p>
        </div>
        <Link href={showDone ? "/my-work" : "/my-work?done=1"} className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-surface-2">{showDone ? "Hide done items" : "Show done items"}</Link>
      </div>
      {grouped.length === 0 ? (
        <EmptyState icon={ListTodo} title="Nothing on your plate" description="When a teammate assigns you in a People column, the item shows up here by due date." />
      ) : (
        grouped.map((b) => (
          <section key={b.key} className="space-y-2">
            <h2 className="text-sm font-semibold text-text-muted">{b.title} <span className="font-normal">· {b.rows.length}</span></h2>
            <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
              {b.rows.map((r) => (
                <li key={r.item_id} className="flex flex-wrap items-center gap-3 px-3 py-2">
                  <Link href={`/boards/${r.board_id}/items/${r.item_id}`} className="min-w-0 flex-1 truncate text-sm font-medium hover:underline">
                    {r.parent_name ? <span className="text-text-muted">{r.parent_name} / </span> : null}{r.item_name}
                  </Link>
                  <Link href={`/boards/${r.board_id}`} className="truncate text-xs text-text-muted hover:underline">{r.board_name}{r.group_title ? ` · ${r.group_title}` : ""}</Link>
                  {r.status_label ? <StatusChip label={r.status_label} color={colorOf(r.status_column_id, r.status?.label_id)} done={r.is_done} /> : null}
                  <span className={`w-20 text-right text-xs tabular-nums ${b.key === "past" ? "text-danger" : "text-text-muted"}`}>{r.due ? format(parseISO(r.due), "d MMM") : ""}</span>
                  {r.is_done ? <CheckCircle2 className="size-4 text-success" aria-label="Done" /> : null}
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
