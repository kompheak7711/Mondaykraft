"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Kbd } from "@/components/ui/kbd";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { PersonAvatar } from "@/components/ui/avatar-stack";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { shortcuts } from "@/components/shell/shortcuts";
import { trashWorkspace, updateProfile, updateWorkspace, type FormState } from "../more-actions";

const kinds = [["mention", "Mentions"], ["assigned", "Assignments"], ["reply", "Replies to my updates"], ["update", "New updates on items I follow"], ["automation", "Automation notices"]] as const;

type Workspace = { id: string; name: string; timezone: string; role: string };

export function SettingsForm({ profile, zones, muted, workspace }: { profile: { name: string; title: string; timezone: string; avatarUrl: string | null }; zones: string[]; muted: string[]; workspace: Workspace | null }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateProfile, {});
  const [ws, wsAction, wsPending] = useActionState<FormState, FormData>(updateWorkspace, {});
  const [trash, trashAction, trashPending] = useActionState<FormState, FormData>(trashWorkspace, {});
  const [confirm, setConfirm] = useState(false);
  const canEditWorkspace = workspace?.role === "owner" || workspace?.role === "admin";
  return (
    <div className="space-y-8">
      <form action={action} className="space-y-5">
        <div className="flex items-start gap-4">
          <PersonAvatar person={{ id: "me", name: profile.name, avatarUrl: profile.avatarUrl }} size={40} className="mt-5" />
          <div className="space-y-1.5">
            <Label htmlFor="avatar">Photo</Label>
            <Input id="avatar" name="avatar" type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="h-auto py-1" />
            <p className="text-xs text-text-muted">PNG, JPEG, WebP or GIF up to 2 MB. Saved when you press Save.</p>
            {profile.avatarUrl ? <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="removeAvatar" value="1" className="accent-brand" /> Remove photo</label> : null}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5"><Label htmlFor="name">Name</Label><Input id="name" name="name" defaultValue={profile.name} required maxLength={120} /></div>
          <div className="space-y-1.5"><Label htmlFor="title">Title</Label><Input id="title" name="title" defaultValue={profile.title} placeholder="Product designer" maxLength={120} /></div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="timezone">Time zone</Label>
            <select id="timezone" name="timezone" defaultValue={profile.timezone} className="h-8 w-full rounded-md border border-border-input bg-bg px-2 text-sm">
              {zones.map((z) => <option key={z} value={z}>{z}</option>)}
            </select>
            <p className="text-xs text-text-muted">Used for “today”, overdue dates and the My Work buckets.</p>
          </div>
        </div>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">In-app notifications</legend>
          {kinds.map(([k, label]) => (
            <label key={k} className="flex items-center gap-2 text-sm"><input type="checkbox" name="mute" value={k} defaultChecked={muted.includes(k)} className="accent-brand" /> Mute {label.toLowerCase()}</label>
          ))}
        </fieldset>
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={pending} aria-busy={pending}>Save</Button>
          {state.message ? <span role="status" className="text-sm text-success">{state.message}</span> : null}
          {state.error ? <span role="alert" className="text-sm text-danger">{state.error}</span> : null}
        </div>
      </form>
      <section className="space-y-2">
        <h2 className="text-sm font-medium">Theme</h2>
        <ThemeToggle />
        <p className="text-xs text-text-muted">Saved on this device.</p>
      </section>
      {workspace ? (
        <section className="space-y-3">
          <h2 className="text-sm font-medium">Workspace</h2>
          {canEditWorkspace ? (
            <form action={wsAction} className="space-y-3">
              <input type="hidden" name="workspaceId" value={workspace.id} />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5"><Label htmlFor="ws-name">Workspace name</Label><Input id="ws-name" name="name" defaultValue={workspace.name} required maxLength={120} /></div>
                <div className="space-y-1.5">
                  <Label htmlFor="ws-timezone">Automations run in</Label>
                  <select id="ws-timezone" name="timezone" defaultValue={workspace.timezone} className="h-8 w-full rounded-md border border-border-input bg-bg px-2 text-sm">
                    {zones.map((z) => <option key={z} value={z}>{z}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button type="submit" variant="outline" disabled={wsPending} aria-busy={wsPending}>Rename workspace</Button>
                {ws.message ? <span role="status" className="text-sm text-success">{ws.message}</span> : null}
                {ws.error ? <span role="alert" className="text-sm text-danger">{ws.error}</span> : null}
              </div>
            </form>
          ) : <p className="text-sm text-text-muted">Only owners and admins can rename this workspace.</p>}
          {workspace.role === "owner" ? (
            <div className="flex items-center gap-3">
              <Button type="button" variant="destructive" size="sm" onClick={() => setConfirm(true)}>Move workspace to trash</Button>
              {trash.error ? <span role="alert" className="text-sm text-danger">{trash.error}</span> : null}
            </div>
          ) : null}
          <Dialog open={confirm} onOpenChange={setConfirm}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Move “{workspace.name}” to the trash?</DialogTitle>
                <DialogDescription>Its boards, dashboards and members go with it. You can restore it from Trash for 30 days.</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild><Button variant="outline" autoFocus>Cancel</Button></DialogClose>
                <form action={trashAction} onSubmit={() => setConfirm(false)}>
                  <input type="hidden" name="workspaceId" value={workspace.id} />
                  <Button type="submit" variant="destructive" disabled={trashPending}>Move to trash</Button>
                </form>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </section>
      ) : null}
      <section className="space-y-2">
        <h2 className="text-sm font-medium">Keyboard shortcuts</h2>
        <ul className="divide-y divide-border rounded-lg border border-border">
          {shortcuts.map(([keys, what]) => <li key={keys} className="flex items-center justify-between px-3 py-2 text-sm"><span>{what}</span><Kbd>{keys}</Kbd></li>)}
        </ul>
      </section>
    </div>
  );
}
