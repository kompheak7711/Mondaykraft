"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { createWorkspace, type ActionState } from "@/app/(app)/actions";

export function Onboarding({ name }: { name: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(createWorkspace, {});
  const tz = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC";
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-surface px-4 py-12">
      <form action={action} className="w-full max-w-sm space-y-5 rounded-lg border border-border bg-bg p-6 shadow-card">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold">{name ? `Welcome, ${name.split(" ")[0]}.` : "Welcome."}</h1>
          <p className="text-sm text-text-muted">Name your workspace. Boards, people and dashboards live inside it. You can rename it later.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ws-name">Workspace name</Label>
          <Input id="ws-name" name="name" placeholder="Acme team" required maxLength={120} autoFocus />
          <input type="hidden" name="timezone" value={tz} />
        </div>
        {state.error ? <p role="alert" className="text-sm text-danger">{state.error}</p> : null}
        <Button type="submit" className="w-full" disabled={pending} aria-busy={pending}>
          {pending ? <Spinner className="text-on-brand" /> : null} Create workspace
        </Button>
      </form>
    </main>
  );
}
