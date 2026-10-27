import Link from "next/link";
import { cookies } from "next/headers";
import { LayoutDashboard, Table2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { pickWorkspace, WORKSPACE_COOKIE } from "@/lib/workspace";
import { EmptyState } from "@/components/ui/empty-state";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: workspaces } = await supabase.from("workspaces").select("id, name").is("deleted_at", null).order("created_at");
  const current = pickWorkspace((await cookies()).get(WORKSPACE_COOKIE)?.value, workspaces ?? []);
  if (!current) return null;
  const [{ data: boards }, { data: dashboards }] = await Promise.all([
    supabase.from("boards").select("id, name, description, updated_at").eq("workspace_id", current.id).is("deleted_at", null).is("archived_at", null).order("updated_at", { ascending: false }).limit(12),
    supabase.from("dashboards").select("id, name").eq("workspace_id", current.id).is("deleted_at", null).order("updated_at", { ascending: false }).limit(6),
  ]);
  const empty = !boards?.length && !dashboards?.length;
  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 p-4 sm:p-6">
      <div>
        <h1 className="text-xl font-bold">{current.name}</h1>
        <p className="text-sm text-text-muted">Recent boards and dashboards in this workspace.</p>
      </div>
      {empty ? (
        <EmptyState icon={Table2} title="Nothing here yet" description="Add a board from the sidebar to start tracking work with your team." />
      ) : (
        <>
          {boards?.length ? (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-text-muted">Boards</h2>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {boards.map((b) => (
                  <li key={b.id}>
                    <Link href={`/boards/${b.id}`} className="flex h-full flex-col gap-1 rounded-lg border border-border bg-surface p-4 hover:border-border-strong hover:shadow-card">
                      <span className="flex items-center gap-2 font-medium"><Table2 className="size-4 text-text-muted" aria-hidden />{b.name}</span>
                      {b.description ? <span className="line-clamp-2 text-xs text-text-muted">{b.description}</span> : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {dashboards?.length ? (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-text-muted">Dashboards</h2>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {dashboards.map((d) => (
                  <li key={d.id}>
                    <Link href={`/dashboards/${d.id}`} className="flex items-center gap-2 rounded-lg border border-border bg-surface p-4 font-medium hover:border-border-strong hover:shadow-card">
                      <LayoutDashboard className="size-4 text-text-muted" aria-hidden />{d.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
