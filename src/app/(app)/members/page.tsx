import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { pickWorkspace, WORKSPACE_COOKIE } from "@/lib/workspace";
import { formatRelative } from "@/lib/format";
import { PersonAvatar } from "@/components/ui/avatar-stack";
import { EmptyState } from "@/components/ui/empty-state";
import { revokeMembership, setMemberRole, withdrawInvite } from "../more-actions";
import { InviteForm } from "./invite-form";

export const metadata: Metadata = { title: "Members" };

const roles = ["owner", "admin", "member", "viewer"] as const;

/** S23: who is in the workspace, their roles, and invites (copy-link flow, no email yet). */
export default async function MembersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: workspaces } = await supabase.from("workspaces").select("id, name").is("deleted_at", null).order("created_at");
  const current = pickWorkspace((await cookies()).get(WORKSPACE_COOKIE)?.value, workspaces ?? []);
  if (!current) return null;
  const [{ data: people }, { data: invites }] = await Promise.all([
    supabase.rpc("workspace_people", { p_workspace: current.id }),
    supabase.from("invites").select("id, email, role, token, created_at, expires_at").eq("workspace_id", current.id).is("accepted_at", null).order("created_at", { ascending: false }),
  ]);
  const me = people?.find((p) => p.id === user!.id);
  const canManage = me?.role === "owner" || me?.role === "admin";
  const owners = people?.filter((p) => p.role === "owner").length ?? 0;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 p-4 sm:p-6">
      <div>
        <h1 className="text-xl font-bold">Members of {current.name}</h1>
        <p className="text-sm text-text-muted">Owners and admins invite people and change roles. Viewers can read everything and change nothing.</p>
      </div>

      {canManage ? <InviteForm workspaceId={current.id} /> : null}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-text-muted">People · {people?.length ?? 0}</h2>
        <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
          {people?.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-3 px-3 py-2">
              <PersonAvatar person={{ id: p.id, name: p.name, avatarUrl: p.avatar_url }} size={32} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{p.name}{p.id === user!.id ? " (you)" : ""}</div>
                <div className="truncate text-xs text-text-muted">{p.email}</div>
              </div>
              {canManage && !(p.role === "owner" && owners <= 1) ? (
                <form action={setMemberRole} className="flex items-center gap-2">
                  <input type="hidden" name="workspaceId" value={current.id} />
                  <input type="hidden" name="userId" value={p.id} />
                  <select name="role" defaultValue={p.role} aria-label={`Role of ${p.name}`} className="h-8 rounded-md border border-border-input bg-bg px-2 text-sm" disabled={me?.role !== "owner" && p.role === "owner"}>
                    {roles.filter((r) => r !== "owner" || me?.role === "owner").map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <button type="submit" className="rounded-md border border-border px-2 py-1 text-xs hover:bg-surface-2">Apply</button>
                </form>
              ) : (
                <span className="rounded-pill bg-surface-2 px-2 py-0.5 text-xs capitalize">{p.role}</span>
              )}
              {(canManage || p.id === user!.id) && !(p.role === "owner" && owners <= 1) ? (
                <form action={revokeMembership}>
                  <input type="hidden" name="workspaceId" value={current.id} />
                  <input type="hidden" name="userId" value={p.id} />
                  <button type="submit" className="rounded-md px-2 py-1 text-xs text-danger hover:bg-danger-soft">{p.id === user!.id ? "Leave" : "Take out"}</button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      {canManage ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-text-muted">Pending invites · {invites?.length ?? 0}</h2>
          {!invites?.length ? (
            <EmptyState icon={Users} title="No open invites" description="Invite someone above. Until a sending domain is set up, you share the link yourself." className="py-6" />
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
              {invites.map((i) => (
                <li key={i.id} className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{i.email} <span className="font-normal text-text-muted">· {i.role}</span></div>
                    <div className="truncate text-xs text-text-muted">Sent {formatRelative(i.created_at)} · expires {formatRelative(i.expires_at)}</div>
                  </div>
                  <code className="max-w-56 truncate rounded-sm bg-surface-2 px-2 py-1 text-xs" title="Invite link">/invite/{i.token}</code>
                  <form action={withdrawInvite}><input type="hidden" name="id" value={i.id} /><button type="submit" className="rounded-md px-2 py-1 text-xs text-danger hover:bg-danger-soft">Withdraw</button></form>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}
