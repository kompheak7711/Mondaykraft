import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";

export const metadata: Metadata = { title: "Search" };

type Hit = { kind: string; id: string; title: string; snippet: string; board_id: string | null; item_id: string | null };
const groups = [["board", "Boards"], ["item", "Items"], ["update", "Updates"], ["person", "People"]] as const;

/** S21: one search across boards, items, updates and people. */
export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const supabase = await createClient();
  const { data } = q.trim() ? await supabase.rpc("search", { q: q.trim(), lim: 40 }) : { data: [] };
  const hits = (data ?? []) as Hit[];
  const href = (h: Hit) => h.kind === "board" ? `/boards/${h.id}` : h.kind === "item" ? `/boards/${h.board_id}/items/${h.id}` : h.kind === "update" ? `/boards/${h.board_id}/items/${h.item_id}#update-${h.id}` : "/members";
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-6">
      <form action="/search" className="relative" role="search">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-muted" aria-hidden />
        <Input name="q" defaultValue={q} placeholder="Search boards, items, updates and people" aria-label="Search" className="h-10 pl-9" autoFocus />
      </form>
      {!q.trim() ? (
        <p className="text-sm text-text-muted">Type a word and press Enter. Items match on their name and on any cell text.</p>
      ) : hits.length === 0 ? (
        <EmptyState icon={Search} title={`Nothing matches “${q}”`} description="Try another word, or check the spelling. Only things you can see are searched." />
      ) : (
        groups.map(([kind, label]) => {
          const rows = hits.filter((h) => h.kind === kind);
          return rows.length ? (
            <section key={kind} className="space-y-2">
              <h2 className="text-sm font-semibold text-text-muted">{label} · {rows.length}</h2>
              <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
                {rows.map((h) => (
                  <li key={h.kind + h.id}>
                    <Link href={href(h)} className="block px-3 py-2 hover:bg-surface-2">
                      <div className="truncate text-sm font-medium">{h.title}</div>
                      {h.snippet ? <div className="truncate text-xs text-text-muted">{h.snippet}</div> : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null;
        })
      )}
    </div>
  );
}
