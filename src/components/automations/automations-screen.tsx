"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Trash2, Zap } from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusChip } from "@/components/ui/status-chip";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/supabase/errors";
import type { Tables } from "@/lib/db/helpers";
import { useBoard } from "@/lib/board/use-board";
import { labelsOf } from "@/lib/columns/status";
import type { Column } from "@/lib/columns/types";
import { formatRelative } from "@/lib/format";

type AutomationRow = Tables<"automations">;
type RunRow = Tables<"automation_runs">;
type Trigger = { type: "item_created" | "status_changed" | "person_assigned" | "date_arrived"; column_id?: string; label_id?: string; user_id?: string; at_time?: string; offset_days?: number };
type Condition = { type: "status_is" | "status_is_not" | "person_is" | "group_is" | "checkbox_is"; column_id?: string; label_id?: string; user_id?: string; group_id?: string; checked?: boolean };
type Action = { type: "notify" | "change_status" | "move_to_group" | "assign_person" | "create_item" | "set_date"; to?: "creator" | "assignees" | "user"; user_id?: string; message?: string; column_id?: string; label_id?: string; group_id?: string; name?: string; mode?: "today" | "in_days" | "clear"; days?: number };
type Draft = { name: string; trigger: Trigger; conditions: Condition[]; actions: Action[] };

const select = "h-8 rounded-md border border-border-input bg-bg px-2 text-sm";
const starters: { title: string; description: string; make: (cols: Column[], groups: { id: string; title: string }[]) => Draft | null }[] = [
  { title: "When status changes to done, move the item to a group", description: "Keep a Done group tidy without dragging.", make: (cols, groups) => { const c = cols.find((x) => x.type === "status"); const done = c ? labelsOf(c).find((l) => l.is_done) : undefined; const g = groups[groups.length - 1]; return c && done && g ? { name: "Done items move to " + g.title, trigger: { type: "status_changed", column_id: c.id, label_id: done.id }, conditions: [], actions: [{ type: "move_to_group", group_id: g.id }] } : null; } },
  { title: "When an item is created, assign someone", description: "Every new item gets an owner.", make: (cols) => { const p = cols.find((x) => x.type === "people"); return p ? { name: "New items get an owner", trigger: { type: "item_created" }, conditions: [], actions: [{ type: "assign_person", column_id: p.id, user_id: "" }] } : null; } },
  { title: "When someone is assigned, notify them", description: "A note in the bell with the item name.", make: (cols) => { const p = cols.find((x) => x.type === "people"); return p ? { name: "Tell people when they are assigned", trigger: { type: "person_assigned", column_id: p.id }, conditions: [], actions: [{ type: "notify", to: "assignees", column_id: p.id, message: "You were assigned to {item} on {board}" }] } : null; } },
  { title: "When a date arrives, change the status", description: "Flag items on their due day.", make: (cols) => { const d = cols.find((x) => x.type === "date"); const c = cols.find((x) => x.type === "status"); const l = c ? labelsOf(c).find((x) => !x.is_done) : undefined; return d && c && l ? { name: "Due today becomes " + l.label, trigger: { type: "date_arrived", column_id: d.id, at_time: "09:00", offset_days: 0 }, conditions: [], actions: [{ type: "change_status", column_id: c.id, label_id: l.id }] } : null; } },
  { title: "When status changes to stuck, notify the creator", description: "The person who opened the item hears first.", make: (cols) => { const c = cols.find((x) => x.type === "status"); const l = c ? labelsOf(c).find((x) => /stuck|blocked/i.test(x.label)) ?? labelsOf(c)[0] : undefined; return c && l ? { name: "Creator hears when it is " + l.label.toLowerCase(), trigger: { type: "status_changed", column_id: c.id, label_id: l.id }, conditions: [], actions: [{ type: "notify", to: "creator", message: "{item} is now " + l.label + " on {board}" }] } : null; } },
  { title: "When an item is created, set the date to today", description: "A start date without typing it.", make: (cols) => { const d = cols.find((x) => x.type === "date"); return d ? { name: "New items dated today", trigger: { type: "item_created" }, conditions: [], actions: [{ type: "set_date", column_id: d.id, mode: "today" }] } : null; } },
];

/** S14 and S15: recipe gallery, custom builder, manage list and run history. Rules are stored as data; the database runs them. */
export function AutomationsScreen({ boardId }: { boardId: string }) {
  const board = useBoard(boardId);
  const supabase = createClient();
  const client = useQueryClient();
  const [draft, setDraft] = useState<(Draft & { id?: string }) | null>(null);
  const [tab, setTab] = useState("manage");
  const list = useQuery({ queryKey: ["automations", boardId], queryFn: async () => { const { data, error } = await supabase.from("automations").select("*").eq("board_id", boardId).is("deleted_at", null).order("created_at"); if (error) throw error; return data; } });
  const runs = useQuery({ queryKey: ["automation-runs", boardId], enabled: tab === "history", refetchInterval: tab === "history" ? 10_000 : false, queryFn: async () => { const { data, error } = await supabase.from("automation_runs").select("*").eq("board_id", boardId).order("started_at", { ascending: false }).limit(100); if (error) throw error; return data; } });
  const s = board.data;
  const cols = useMemo(() => (s?.columns ?? []).filter((c) => c.scope === "item"), [s]);
  const groups = useMemo(() => (s?.groups ?? []).slice().sort((a, b) => a.position - b.position), [s]);
  const refresh = () => client.invalidateQueries({ queryKey: ["automations", boardId] });

  if (board.isPending) return <div className="space-y-2 p-6"><Skeleton className="h-8 w-64" /><Skeleton className="h-24 w-full" /></div>;
  if (!s) return <EmptyState title="Board not available" description="You may not have access to it." />;
  const canEdit = s.access.can_edit_structure;

  const save = async () => {
    if (!draft) return;
    if (!draft.actions.length) { toast.error("Add at least one action."); return; }
    const payload = { board_id: boardId, name: draft.name.trim() || "Untitled automation", trigger: draft.trigger as never, conditions: draft.conditions as never, actions: draft.actions as never, created_by: s.userId };
    const { error } = draft.id ? await supabase.from("automations").update(payload).eq("id", draft.id) : await supabase.from("automations").insert(payload);
    if (error) { toast.error(friendlyError(error)); return; }
    toast.success(draft.id ? "Automation saved" : "Automation created");
    setDraft(null);
    setTab("manage");
    refresh();
  };
  const toggle = async (a: AutomationRow, enabled: boolean) => { const { error } = await supabase.from("automations").update({ enabled }).eq("id", a.id); if (error) toast.error(friendlyError(error)); refresh(); };
  const duplicate = async (a: AutomationRow) => { const { error } = await supabase.from("automations").insert({ board_id: boardId, name: a.name + " copy", trigger: a.trigger, conditions: a.conditions, actions: a.actions, enabled: false, created_by: s.userId }); if (error) toast.error(friendlyError(error)); refresh(); };
  const trash = async (a: AutomationRow) => { const { error } = await supabase.from("automations").update({ deleted_at: new Date().toISOString() }).eq("id", a.id); if (error) toast.error(friendlyError(error)); refresh(); };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 p-4 sm:p-6">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm"><Link href={`/boards/${boardId}`}><ArrowLeft /> {s.board.name}</Link></Button>
        <h1 className="text-lg font-semibold">Automations</h1>
      </div>
      {draft ? (
        <Builder draft={draft} setDraft={setDraft} cols={cols} groups={groups} members={s.members} onSave={save} onCancel={() => setDraft(null)} />
      ) : (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="manage">Manage{list.data?.length ? ` (${list.data.length})` : ""}</TabsTrigger>
            <TabsTrigger value="create">Create</TabsTrigger>
            <TabsTrigger value="history">Run history</TabsTrigger>
          </TabsList>
          <TabsContent value="manage" className="pt-3">
            {list.data?.length === 0 ? (
              <EmptyState icon={Zap} title="No automations yet" description="Pick a starter recipe or build your own: when something happens, do something." action={canEdit ? <Button onClick={() => setTab("create")}><Plus /> Create automation</Button> : undefined} />
            ) : (
              <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
                {list.data?.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center gap-3 px-3 py-2">
                    <Switch checked={a.enabled} disabled={!canEdit} onCheckedChange={(v) => toggle(a, v)} aria-label={`${a.name} on or off`} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{a.name}</div>
                      <div className="truncate text-xs text-text-muted">{describe(a, cols, groups, s.members)} · ran {a.run_count} {a.run_count === 1 ? "time" : "times"}{a.last_run_at ? `, last ${formatRelative(a.last_run_at)}` : ""}</div>
                    </div>
                    {canEdit ? (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="xs" onClick={() => setDraft({ id: a.id, name: a.name, trigger: a.trigger as Trigger, conditions: (a.conditions as Condition[]) ?? [], actions: a.actions as Action[] })}>Edit</Button>
                        <Button variant="ghost" size="xs" onClick={() => duplicate(a)}>Duplicate</Button>
                        <Button variant="ghost" size="xs" className="text-danger" onClick={() => trash(a)} aria-label={`Remove ${a.name}`}><Trash2 /></Button>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
          <TabsContent value="create" className="space-y-3 pt-3">
            {!canEdit ? <p className="text-sm text-text-muted">Only people who can edit the board structure create automations.</p> : null}
            <ul className="grid gap-2 sm:grid-cols-2">
              {starters.map((r) => { const d = r.make(cols, groups); return (
                <li key={r.title}>
                  <button type="button" disabled={!canEdit || !d} onClick={() => d && setDraft(d)} className={cn("flex w-full flex-col items-start gap-1 rounded-lg border border-border bg-surface p-3 text-left hover:border-border-strong disabled:opacity-50")}>
                    <span className="text-sm font-medium">{r.title}</span>
                    <span className="text-xs text-text-muted">{d ? r.description : "Needs a column this board doesn't have yet."}</span>
                  </button>
                </li>
              ); })}
            </ul>
            <Button disabled={!canEdit} onClick={() => setDraft({ name: "", trigger: { type: "item_created" }, conditions: [], actions: [] })}><Plus /> Custom automation</Button>
          </TabsContent>
          <TabsContent value="history" className="pt-3">
            {runs.isPending ? <Skeleton className="h-16 w-full" /> : null}
            {runs.data?.length === 0 ? <p className="text-sm text-text-muted">No runs yet. Runs appear here as automations fire, with any failures.</p> : null}
            <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
              {runs.data?.map((r: RunRow) => (
                <li key={r.id} className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
                  <StatusChip label={r.status} color={r.status === "ok" ? "green" : r.status === "failed" ? "red" : "gray"} />
                  <span className="min-w-0 flex-1 truncate">{list.data?.find((a) => a.id === r.automation_id)?.name ?? "Automation"}{r.item_id ? ` · ${s.items.find((i) => i.id === r.item_id)?.name ?? "an item"}` : ""}{r.error ? ` · ${r.error}` : ""}</span>
                  <span className="text-xs text-text-muted">{formatRelative(r.started_at)}</span>
                </li>
              ))}
            </ul>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function describe(a: AutomationRow, cols: Column[], groups: { id: string; title: string }[], members: { id: string; name: string }[]) {
  const t = a.trigger as Trigger;
  const col = (id?: string) => cols.find((c) => c.id === id)?.title ?? "a column";
  const label = (cid?: string, lid?: string) => { const c = cols.find((x) => x.id === cid); return (c ? labelsOf(c).find((l) => l.id === lid)?.label : undefined) ?? "any label"; };
  const when = t.type === "item_created" ? "When an item is created" : t.type === "status_changed" ? `When ${col(t.column_id)} changes to ${label(t.column_id, t.label_id)}` : t.type === "person_assigned" ? `When someone is assigned in ${col(t.column_id)}` : `When ${col(t.column_id)} arrives (${t.at_time ?? "09:00"})`;
  const acts = (a.actions as Action[]).map((x) => x.type === "notify" ? "notify" : x.type === "change_status" ? `set ${col(x.column_id)} to ${label(x.column_id, x.label_id)}` : x.type === "move_to_group" ? `move to ${groups.find((g) => g.id === x.group_id)?.title ?? "a group"}` : x.type === "assign_person" ? `assign ${members.find((m) => m.id === x.user_id)?.name ?? "someone"}` : x.type === "create_item" ? "create an item" : `set ${col(x.column_id)}`);
  return `${when}, then ${acts.join(" and ")}`;
}

function Builder({ draft, setDraft, cols, groups, members, onSave, onCancel }: { draft: Draft & { id?: string }; setDraft: (d: Draft & { id?: string }) => void; cols: Column[]; groups: { id: string; title: string }[]; members: { id: string; name: string }[]; onSave: () => void; onCancel: () => void }) {
  const statusCols = cols.filter((c) => c.type === "status" || c.type === "priority");
  const peopleCols = cols.filter((c) => c.type === "people");
  const dateCols = cols.filter((c) => c.type === "date");
  const checkCols = cols.filter((c) => c.type === "checkbox");
  const t = draft.trigger;
  const setT = (p: Partial<Trigger>) => setDraft({ ...draft, trigger: { ...t, ...p } });
  const labelsFor = (cid?: string) => { const c = cols.find((x) => x.id === cid); return c ? labelsOf(c) : []; };
  const colSel = (value: string | undefined, options: Column[], onChange: (id: string) => void, label: string) => (
    <select className={select} aria-label={label} value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
      <option value="" disabled>{label}</option>
      {options.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
    </select>
  );

  return (
    <div className="space-y-4 rounded-lg border border-border bg-surface p-4">
      <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Name this automation" aria-label="Automation name" className="max-w-md" maxLength={200} />

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-semibold">When</span>
        <select className={select} aria-label="Trigger" value={t.type} onChange={(e) => setDraft({ ...draft, trigger: { type: e.target.value as Trigger["type"], column_id: (e.target.value === "status_changed" ? statusCols[0] : e.target.value === "person_assigned" ? peopleCols[0] : e.target.value === "date_arrived" ? dateCols[0] : undefined)?.id, at_time: e.target.value === "date_arrived" ? "09:00" : undefined, offset_days: e.target.value === "date_arrived" ? 0 : undefined } })}>
          <option value="item_created">an item is created</option>
          <option value="status_changed" disabled={!statusCols.length}>a status changes</option>
          <option value="person_assigned" disabled={!peopleCols.length}>a person is assigned</option>
          <option value="date_arrived" disabled={!dateCols.length}>a date arrives</option>
        </select>
        {t.type === "status_changed" ? (<>
          <span>in</span>{colSel(t.column_id, statusCols, (id) => setT({ column_id: id, label_id: undefined }), "Status column")}
          <span>to</span>
          <select className={select} aria-label="Label" value={t.label_id ?? ""} onChange={(e) => setT({ label_id: e.target.value || undefined })}><option value="">any label</option>{labelsFor(t.column_id).map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}</select>
        </>) : null}
        {t.type === "person_assigned" ? (<><span>in</span>{colSel(t.column_id, peopleCols, (id) => setT({ column_id: id }), "People column")}</>) : null}
        {t.type === "date_arrived" ? (<>
          <span>in</span>{colSel(t.column_id, dateCols, (id) => setT({ column_id: id }), "Date column")}
          <span>at</span><Input type="time" value={t.at_time ?? "09:00"} onChange={(e) => setT({ at_time: e.target.value })} aria-label="Time" className="h-8 w-28" />
          <select className={select} aria-label="Offset" value={String(t.offset_days ?? 0)} onChange={(e) => setT({ offset_days: Number(e.target.value) })}>
            <option value="0">on the day</option><option value="-1">1 day before</option><option value="-3">3 days before</option><option value="-7">a week before</option><option value="1">1 day after</option>
          </select>
        </>) : null}
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2"><span className="font-semibold">Only if</span><span className="text-text-muted">{draft.conditions.length ? "" : "always"}</span>
          <Button variant="ghost" size="xs" onClick={() => setDraft({ ...draft, conditions: [...draft.conditions, { type: "status_is", column_id: statusCols[0]?.id, label_id: labelsFor(statusCols[0]?.id)[0]?.id }] })} disabled={!statusCols.length && !peopleCols.length && !checkCols.length}><Plus /> condition</Button></div>
        {draft.conditions.map((c, i) => {
          const set = (p: Partial<Condition>) => setDraft({ ...draft, conditions: draft.conditions.map((x, j) => (j === i ? { ...x, ...p } : x)) });
          return (
            <div key={i} className="flex flex-wrap items-center gap-2 pl-4">
              <select className={select} aria-label="Condition" value={c.type} onChange={(e) => set({ type: e.target.value as Condition["type"], column_id: e.target.value.startsWith("status") ? statusCols[0]?.id : e.target.value === "person_is" ? peopleCols[0]?.id : e.target.value === "checkbox_is" ? checkCols[0]?.id : undefined, group_id: e.target.value === "group_is" ? groups[0]?.id : undefined })}>
                <option value="status_is">status is</option><option value="status_is_not">status is not</option><option value="person_is" disabled={!peopleCols.length}>person is</option><option value="group_is">group is</option><option value="checkbox_is" disabled={!checkCols.length}>checkbox is</option>
              </select>
              {c.type.startsWith("status") ? (<>{colSel(c.column_id, statusCols, (id) => set({ column_id: id, label_id: undefined }), "Status column")}<select className={select} aria-label="Label" value={c.label_id ?? ""} onChange={(e) => set({ label_id: e.target.value })}>{labelsFor(c.column_id).map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}</select></>) : null}
              {c.type === "person_is" ? (<>{colSel(c.column_id, peopleCols, (id) => set({ column_id: id }), "People column")}<select className={select} aria-label="Person" value={c.user_id ?? ""} onChange={(e) => set({ user_id: e.target.value })}><option value="">choose</option>{members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></>) : null}
              {c.type === "group_is" ? <select className={select} aria-label="Group" value={c.group_id ?? ""} onChange={(e) => set({ group_id: e.target.value })}>{groups.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}</select> : null}
              {c.type === "checkbox_is" ? (<>{colSel(c.column_id, checkCols, (id) => set({ column_id: id }), "Checkbox column")}<select className={select} aria-label="Checked" value={String(c.checked ?? true)} onChange={(e) => set({ checked: e.target.value === "true" })}><option value="true">checked</option><option value="false">not checked</option></select></>) : null}
              <Button variant="ghost" size="xs" onClick={() => setDraft({ ...draft, conditions: draft.conditions.filter((_, j) => j !== i) })}>×</Button>
            </div>
          );
        })}
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2"><span className="font-semibold">Then</span>
          <Button variant="ghost" size="xs" onClick={() => setDraft({ ...draft, actions: [...draft.actions, { type: "notify", to: "creator", message: "{item} changed on {board}" }] })}><Plus /> action</Button></div>
        {draft.actions.map((a, i) => {
          const set = (p: Partial<Action>) => setDraft({ ...draft, actions: draft.actions.map((x, j) => (j === i ? { ...x, ...p } : x)) });
          return (
            <div key={i} className="flex flex-wrap items-center gap-2 pl-4">
              <select className={select} aria-label="Action" value={a.type} onChange={(e) => { const type = e.target.value as Action["type"]; set({ type, column_id: type === "change_status" ? statusCols[0]?.id : type === "assign_person" ? peopleCols[0]?.id : type === "set_date" ? dateCols[0]?.id : undefined, label_id: undefined, group_id: type === "move_to_group" || type === "create_item" ? groups[0]?.id : undefined, mode: type === "set_date" ? "today" : undefined, to: type === "notify" ? "creator" : undefined }); }}>
                <option value="notify">notify</option><option value="change_status" disabled={!statusCols.length}>change status</option><option value="move_to_group">move to group</option><option value="assign_person" disabled={!peopleCols.length}>assign a person</option><option value="create_item">create an item</option><option value="set_date" disabled={!dateCols.length}>set a date</option>
              </select>
              {a.type === "notify" ? (<>
                <select className={select} aria-label="Who" value={a.to ?? "creator"} onChange={(e) => set({ to: e.target.value as Action["to"] })}><option value="creator">the item&apos;s creator</option><option value="assignees" disabled={!peopleCols.length}>the people assigned</option><option value="user">a specific person</option></select>
                {a.to === "user" ? <select className={select} aria-label="Person" value={a.user_id ?? ""} onChange={(e) => set({ user_id: e.target.value })}><option value="">choose</option>{members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select> : null}
                <Input value={a.message ?? ""} onChange={(e) => set({ message: e.target.value })} placeholder="Message, with {item} and {board}" aria-label="Message" className="h-8 w-72" maxLength={300} />
              </>) : null}
              {a.type === "change_status" ? (<>{colSel(a.column_id, statusCols, (id) => set({ column_id: id, label_id: undefined }), "Status column")}<span>to</span><select className={select} aria-label="Label" value={a.label_id ?? ""} onChange={(e) => set({ label_id: e.target.value })}><option value="">choose</option>{labelsFor(a.column_id).map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}</select></>) : null}
              {a.type === "move_to_group" || a.type === "create_item" ? <select className={select} aria-label="Group" value={a.group_id ?? ""} onChange={(e) => set({ group_id: e.target.value })}>{groups.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}</select> : null}
              {a.type === "create_item" ? <Input value={a.name ?? ""} onChange={(e) => set({ name: e.target.value })} placeholder="Item name, {item} for the trigger item" aria-label="New item name" className="h-8 w-64" /> : null}
              {a.type === "assign_person" ? (<>{colSel(a.column_id, peopleCols, (id) => set({ column_id: id }), "People column")}<select className={select} aria-label="Person" value={a.user_id ?? ""} onChange={(e) => set({ user_id: e.target.value })}><option value="">choose</option>{members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></>) : null}
              {a.type === "set_date" ? (<>{colSel(a.column_id, dateCols, (id) => set({ column_id: id }), "Date column")}<select className={select} aria-label="Mode" value={a.mode ?? "today"} onChange={(e) => set({ mode: e.target.value as Action["mode"] })}><option value="today">to today</option><option value="in_days">to today plus days</option><option value="clear">to empty</option></select>{a.mode === "in_days" ? <Input type="number" value={a.days ?? 7} onChange={(e) => set({ days: Number(e.target.value) })} aria-label="Days" className="h-8 w-20" /> : null}</>) : null}
              <Button variant="ghost" size="xs" onClick={() => setDraft({ ...draft, actions: draft.actions.filter((_, j) => j !== i) })}>×</Button>
            </div>
          );
        })}
      </div>

      <div className="flex gap-2">
        <Button onClick={onSave}>{draft.id ? "Save changes" : "Create automation"}</Button>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}
