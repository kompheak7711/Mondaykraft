"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createBoard, createDashboard, createFolder, createWorkspace, type ActionState } from "@/app/(app)/actions";
import { templates } from "@/lib/templates";

type DialogProps = { open: boolean; onOpenChange: (open: boolean) => void };

function Footer({ pending, label }: { pending: boolean; label: string }) {
  return (
    <DialogFooter>
      <Button type="submit" disabled={pending} aria-busy={pending}>
        {pending ? <Spinner className="text-on-brand" /> : null} {label}
      </Button>
    </DialogFooter>
  );
}

export function NewBoardDialog({ open, onOpenChange, workspaceId, folders }: DialogProps & { workspaceId: string; folders: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(createBoard, {});
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form action={action} className="space-y-4">
          <DialogHeader>
            <DialogTitle>New board</DialogTitle>
            <DialogDescription>Start blank or from a template. Templates come with columns, groups and a few example items.</DialogDescription>
          </DialogHeader>
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <div className="space-y-1.5">
            <Label htmlFor="board-name">Board name</Label>
            <Input id="board-name" name="name" required maxLength={200} autoFocus placeholder="Launch plan" />
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Template</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="flex cursor-pointer items-start gap-2 rounded-md border border-border p-3 text-sm has-[:checked]:border-brand has-[:checked]:bg-brand-soft">
                <input type="radio" name="template" value="" defaultChecked className="mt-0.5 accent-brand" />
                <span><span className="font-medium">Blank</span><br /><span className="text-xs text-text-muted">Status, owner and due date columns, one group.</span></span>
              </label>
              {templates.map((t) => (
                <label key={t.key} className="flex cursor-pointer items-start gap-2 rounded-md border border-border p-3 text-sm has-[:checked]:border-brand has-[:checked]:bg-brand-soft">
                  <input type="radio" name="template" value={t.key} className="mt-0.5 accent-brand" />
                  <span><span className="font-medium">{t.name}</span><br /><span className="text-xs text-text-muted">{t.description}</span></span>
                </label>
              ))}
            </div>
          </fieldset>
          {folders.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="board-folder">Folder</Label>
              <select id="board-folder" name="folderId" className="h-8 w-full rounded-md border border-border-input bg-bg px-2 text-sm">
                <option value="">No folder</option>
                {folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
          )}
          {state.error ? <p role="alert" className="text-sm text-danger">{state.error}</p> : null}
          <Footer pending={pending} label="Create board" />
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function NewDashboardDialog({ open, onOpenChange, workspaceId }: DialogProps & { workspaceId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(createDashboard, {});
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form action={action} className="space-y-4">
          <DialogHeader>
            <DialogTitle>New dashboard</DialogTitle>
            <DialogDescription>Connect boards and add widgets once it exists.</DialogDescription>
          </DialogHeader>
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <div className="space-y-1.5">
            <Label htmlFor="dash-name">Dashboard name</Label>
            <Input id="dash-name" name="name" required maxLength={200} autoFocus placeholder="Team overview" />
          </div>
          {state.error ? <p role="alert" className="text-sm text-danger">{state.error}</p> : null}
          <Footer pending={pending} label="Create dashboard" />
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function NewFolderDialog({ open, onOpenChange, workspaceId }: DialogProps & { workspaceId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(createFolder, {});
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form
          action={(fd) => {
            action(fd);
            onOpenChange(false);
          }}
          className="space-y-4"
        >
          <DialogHeader>
            <DialogTitle>New folder</DialogTitle>
            <DialogDescription>Folders group boards and dashboards in the sidebar.</DialogDescription>
          </DialogHeader>
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <div className="space-y-1.5">
            <Label htmlFor="folder-name">Folder name</Label>
            <Input id="folder-name" name="name" required maxLength={120} autoFocus placeholder="Marketing" />
          </div>
          {state?.error ? <p role="alert" className="text-sm text-danger">{state.error}</p> : null}
          <Footer pending={pending} label="Create folder" />
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function NewWorkspaceDialog({ open, onOpenChange }: DialogProps) {
  const [state, action, pending] = useActionState<ActionState, FormData>(createWorkspace, {});
  const tz = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form action={action} className="space-y-4">
          <DialogHeader>
            <DialogTitle>New workspace</DialogTitle>
            <DialogDescription>A separate space with its own boards, members and dashboards.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="new-ws-name">Workspace name</Label>
            <Input id="new-ws-name" name="name" required maxLength={120} autoFocus />
            <input type="hidden" name="timezone" value={tz} />
          </div>
          {state.error ? <p role="alert" className="text-sm text-danger">{state.error}</p> : null}
          <Footer pending={pending} label="Create workspace" />
        </form>
      </DialogContent>
    </Dialog>
  );
}
