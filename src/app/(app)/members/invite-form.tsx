"use client";

import { useActionState, useState } from "react";
import { Copy, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { inviteMember, type FormState } from "../more-actions";

export function InviteForm({ workspaceId }: { workspaceId: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(inviteMember, {});
  const [copied, setCopied] = useState(false);
  const link = state.link ? `${typeof window !== "undefined" ? window.location.origin : ""}${state.link}` : "";
  return (
    <form action={action} className="space-y-3 rounded-lg border border-border bg-surface p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold"><UserPlus className="size-4" aria-hidden /> Invite a teammate</h2>
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <div className="grid gap-3 sm:grid-cols-[1fr_140px_auto]">
        <div className="space-y-1"><Label htmlFor="inv-email">Email</Label><Input id="inv-email" name="email" type="email" required placeholder="ben@example.com" /></div>
        <div className="space-y-1"><Label htmlFor="inv-role">Role</Label>
          <select id="inv-role" name="role" defaultValue="member" className="h-8 w-full rounded-md border border-border-input bg-bg px-2 text-sm"><option value="admin">Admin</option><option value="member">Member</option><option value="viewer">Viewer</option></select></div>
        <div className="flex items-end"><Button type="submit" disabled={pending} aria-busy={pending}>Create invite</Button></div>
      </div>
      {state.error ? <p role="alert" className="text-sm text-danger">{state.error}</p> : null}
      {state.link ? (
        <div className="space-y-2 rounded-md bg-bg p-3 text-sm">
          <p role="status">{state.message}</p>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-sm bg-surface-2 px-2 py-1 text-xs">{link}</code>
            <Button type="button" variant="outline" size="sm" onClick={async () => { await navigator.clipboard?.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); }}><Copy /> {copied ? "Copied" : "Copy link"}</Button>
          </div>
          <p className="text-xs text-text-muted">The link works for 14 days and only for that email address.</p>
        </div>
      ) : null}
    </form>
  );
}
