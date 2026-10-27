"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Kbd } from "@/components/ui/kbd";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { updateProfile, type FormState } from "../more-actions";

const kinds = [["mention", "Mentions"], ["assigned", "Assignments"], ["reply", "Replies to my updates"], ["update", "New updates on items I follow"], ["automation", "Automation notices"]] as const;
const shortcuts = [["⌘ K", "Search"], ["↑ ↓ ← →", "Move between cells"], ["Enter", "Open the cell editor"], ["Esc", "Close an editor or clear the selection"], ["F2", "Rename the focused item"], ["⌘ ↵", "Post an update"]] as const;

export function SettingsForm({ profile, zones, muted }: { profile: { name: string; title: string; timezone: string }; zones: string[]; muted: string[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateProfile, {});
  return (
    <div className="space-y-8">
      <form action={action} className="space-y-5">
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
      <section className="space-y-2">
        <h2 className="text-sm font-medium">Keyboard shortcuts</h2>
        <ul className="divide-y divide-border rounded-lg border border-border">
          {shortcuts.map(([keys, what]) => <li key={keys} className="flex items-center justify-between px-3 py-2 text-sm"><span>{what}</span><Kbd>{keys}</Kbd></li>)}
        </ul>
      </section>
    </div>
  );
}
