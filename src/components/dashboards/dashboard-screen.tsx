"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart3, BatteryMedium, GripVertical, Hash, LayoutDashboard, Plus, Settings2, Users, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { LABEL_COLORS } from "@/components/ui/status-chip";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/supabase/errors";
import type { Tables } from "@/lib/db/helpers";

type Widget = Tables<"widgets">;
type Source = { board_id: string; column_id?: string; value_column_id?: string; people_column_id?: string; date_column_id?: string };
type Layout = { x: number; y: number; w: number; h: number };
const colorVar = (c?: string | null) => `var(--tk-label-${c && (LABEL_COLORS as readonly string[]).includes(c) ? c : "gray"})`;
const widgetTypes = [
  { type: "numbers", label: "Numbers", icon: Hash, hint: "Sum, average, min, max or count of a numbers column." },
  { type: "battery", label: "Battery", icon: BatteryMedium, hint: "Share of items per status label." },
  { type: "chart", label: "Chart", icon: BarChart3, hint: "Items per label, person or option." },
  { type: "workload", label: "Workload", icon: Users, hint: "Items per person per week." },
] as const;

/** S16 and S17: a dashboard of widgets over one or more boards, computed by the database under RLS. */
export function DashboardScreen({ dashboardId }: { dashboardId: string }) {
  const supabase = createClient();
  const client = useQueryClient();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const q = useQuery({
    queryKey: ["dashboard", dashboardId],
    queryFn: async () => {
      const { data: dash, error } = await supabase.from("dashboards").select("*").eq("id", dashboardId).maybeSingle();
      if (error) throw error;
      if (!dash) return null;
      const [{ data: links }, { data: widgets }, { data: boards }, { data: columns }] = await Promise.all([
        supabase.from("dashboard_boards").select("board_id").eq("dashboard_id", dashboardId),
        supabase.from("widgets").select("*").eq("dashboard_id", dashboardId).order("created_at"),
        supabase.from("boards").select("id, name").eq("workspace_id", dash.workspace_id).is("deleted_at", null).is("archived_at", null).order("name"),
        supabase.from("columns").select("id, board_id, title, type, settings").is("deleted_at", null).eq("scope", "item"),
      ]);
      return { dash, linked: (links ?? []).map((l) => l.board_id), widgets: widgets ?? [], boards: boards ?? [], columns: columns ?? [] };
    },
  });
  const refresh = () => client.invalidateQueries({ queryKey: ["dashboard", dashboardId] });
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState("");

  if (q.isPending) return <div className="space-y-3 p-6"><Skeleton className="h-8 w-64" /><Skeleton className="h-40 w-full" /></div>;
  const d = q.data;
  if (!d) return <EmptyState icon={LayoutDashboard} title="This dashboard isn't available" description="It may be private to someone else, or it was removed." />;
  const connected = d.boards.filter((b) => d.linked.includes(b.id));
  const colsOf = (boardId: string, types: string[]) => d.columns.filter((c) => c.board_id === boardId && types.includes(c.type));

  const toggleBoard = async (boardId: string, on: boolean) => {
    const { error } = on ? await supabase.from("dashboard_boards").insert({ dashboard_id: dashboardId, board_id: boardId }) : await supabase.from("dashboard_boards").delete().eq("dashboard_id", dashboardId).eq("board_id", boardId);
    if (error) toast.error(friendlyError(error));
    refresh();
  };
  const addWidget = async (type: (typeof widgetTypes)[number]["type"]) => {
    const sources: Source[] = connected.map((b) => {
      if (type === "numbers") return { board_id: b.id, column_id: colsOf(b.id, ["numbers"])[0]?.id };
      if (type === "battery") return { board_id: b.id, column_id: colsOf(b.id, ["status"])[0]?.id };
      if (type === "chart") return { board_id: b.id, column_id: colsOf(b.id, ["status", "priority", "people", "dropdown"])[0]?.id };
      return { board_id: b.id, people_column_id: colsOf(b.id, ["people"])[0]?.id, date_column_id: colsOf(b.id, ["date", "timeline"])[0]?.id };
    }).filter((s) => s.column_id || s.people_column_id);
    const y = d.widgets.reduce((m, w) => Math.max(m, ((w.layout as Layout | null)?.y ?? 0) + ((w.layout as Layout | null)?.h ?? 3)), 0);
    const { error } = await supabase.from("widgets").insert({ dashboard_id: dashboardId, type, title: widgetTypes.find((t) => t.type === type)!.label, settings: { fn: "sum", sources } as never, layout: { x: 0, y, w: type === "numbers" ? 3 : 6, h: 3 } as never });
    if (error) toast.error(friendlyError(error));
    refresh();
  };
  const patchWidget = async (w: Widget, p: Partial<Pick<Widget, "title" | "settings" | "layout">>) => { const { error } = await supabase.from("widgets").update(p as never).eq("id", w.id); if (error) toast.error(friendlyError(error)); refresh(); };
  // Widgets read top to bottom by layout.y (ties by creation); a drop rewrites y as the new index.
  const widgets = d.widgets.slice().sort((a, b) => ((a.layout as Layout | null)?.y ?? 0) - ((b.layout as Layout | null)?.y ?? 0));
  const reorder = async (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const next = arrayMove(widgets, widgets.findIndex((w) => w.id === e.active.id), widgets.findIndex((w) => w.id === e.over!.id));
    await Promise.all(next.map((w, y) => supabase.from("widgets").update({ layout: { ...((w.layout as Layout | null) ?? { x: 0, w: 6, h: 3 }), y } as never }).eq("id", w.id)));
    refresh();
  };
  const dropWidget = async (w: Widget) => { const { error } = await supabase.from("widgets").delete().eq("id", w.id); if (error) toast.error(friendlyError(error)); refresh(); };
  const commitName = async () => { setRenaming(false); if (name.trim() && name.trim() !== d.dash.name) { await supabase.from("dashboards").update({ name: name.trim() }).eq("id", dashboardId); refresh(); } };

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2">
        {renaming ? (
          <Input value={name} onChange={(e) => setName(e.target.value)} onBlur={commitName} onKeyDown={(e) => { if (e.key === "Enter") commitName(); if (e.key === "Escape") setRenaming(false); }} aria-label="Dashboard name" className="h-8 max-w-sm text-lg font-semibold" autoFocus />
        ) : (
          <h1 className="text-lg font-semibold"><button type="button" onClick={() => { setName(d.dash.name); setRenaming(true); }} className="rounded-sm hover:bg-surface-2" title="Rename">{d.dash.name}</button></h1>
        )}
        <span className="text-xs text-text-muted">{d.dash.kind === "private" ? "Private" : "Main"} · {connected.length} {connected.length === 1 ? "board" : "boards"}</span>
        <div className="ml-auto flex items-center gap-1">
          <Popover>
            <PopoverTrigger asChild><Button variant="outline" size="sm"><Settings2 /> Connect boards</Button></PopoverTrigger>
            <PopoverContent align="end" className="w-72 p-2">
              <div className="mb-1 px-2 text-xs font-medium text-text-muted">Boards in this dashboard</div>
              <ul className="max-h-72 space-y-0.5 overflow-y-auto">
                {d.boards.map((b) => <li key={b.id}><label className="flex h-8 items-center gap-2 rounded-md px-2 text-sm hover:bg-surface-2"><Checkbox checked={d.linked.includes(b.id)} onCheckedChange={(v) => toggleBoard(b.id, v === true)} /> {b.name}</label></li>)}
                {d.boards.length === 0 ? <li className="px-2 py-3 text-sm text-text-muted">No boards in this workspace yet.</li> : null}
              </ul>
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild><Button size="sm" disabled={!connected.length}><Plus /> Add widget</Button></PopoverTrigger>
            <PopoverContent align="end" className="w-72 p-2">
              {widgetTypes.map((t) => (
                <button key={t.type} type="button" onClick={() => addWidget(t.type)} className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left hover:bg-surface-2">
                  <t.icon className="mt-0.5 size-4 shrink-0 text-text-muted" aria-hidden /><span><span className="block text-sm font-medium">{t.label}</span><span className="block text-xs text-text-muted">{t.hint}</span></span>
                </button>
              ))}
            </PopoverContent>
          </Popover>
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-auto p-4">
        {connected.length === 0 ? (
          <EmptyState icon={LayoutDashboard} title="Connect a board to begin" description="Widgets read from the boards you connect. Pick one or more with Connect boards." />
        ) : d.widgets.length === 0 ? (
          <EmptyState icon={LayoutDashboard} title="No widgets yet" description="Add a Numbers, Battery, Chart or Workload widget." />
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={reorder}>
            <SortableContext items={widgets.map((w) => w.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-12 gap-3" style={{ gridAutoRows: 80 }}>
                {widgets.map((w) => <WidgetFrame key={w.id} widget={w} boards={connected} columns={d.columns} onPatch={(p) => patchWidget(w, p)} onDrop={() => dropWidget(w)} />)}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}

function WidgetFrame({ widget: w, boards, columns, onPatch, onDrop }: { widget: Widget; boards: { id: string; name: string }[]; columns: { id: string; board_id: string; title: string; type: string; settings: unknown }[]; onPatch: (p: Partial<Pick<Widget, "title" | "settings" | "layout">>) => void; onDrop: () => void }) {
  const supabase = createClient();
  const layout = (w.layout as Layout | null) ?? { x: 0, y: 0, w: 6, h: 3 };
  const settings = (w.settings as { fn?: string; sources?: Source[] } | null) ?? {};
  const data = useQuery({ queryKey: ["widget", w.id, w.settings], queryFn: async () => { const { data, error } = await supabase.rpc("widget_data", { p_widget: w.id }); if (error) throw error; return data as unknown; }, refetchInterval: 60_000 });
  const resize = (dw: number, dh: number) => onPatch({ layout: { ...layout, w: Math.min(12, Math.max(2, layout.w + dw)), h: Math.min(8, Math.max(2, layout.h + dh)) } as never });
  const setSource = (boardId: string, key: keyof Source, value: string) => {
    const sources = (settings.sources ?? []).some((s) => s.board_id === boardId) ? (settings.sources ?? []).map((s) => (s.board_id === boardId ? { ...s, [key]: value } : s)) : [...(settings.sources ?? []), { board_id: boardId, [key]: value }];
    onPatch({ settings: { ...settings, sources } as never });
  };
  const types = w.type === "numbers" ? ["numbers"] : w.type === "battery" ? ["status"] : w.type === "chart" ? ["status", "priority", "people", "dropdown", "checkbox", "date"] : ["people"];
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: w.id });
  return (
    <section ref={setNodeRef} aria-label={w.title} className={cn("flex min-h-0 flex-col rounded-lg border border-border bg-surface shadow-card", isDragging && "z-10 opacity-70 shadow-pop")} style={{ gridColumn: `span ${layout.w}`, gridRow: `span ${layout.h}`, transform: CSS.Transform.toString(transform), transition }}>
      <header className="flex items-center gap-1 px-3 py-1.5">
        <button type="button" {...attributes} {...listeners} aria-label={`Move ${w.title}`} className="cursor-grab rounded-sm text-text-muted hover:text-text focus-visible:ring-2 focus-visible:ring-brand active:cursor-grabbing"><GripVertical className="size-4" /></button>
        <h2 className="min-w-0 flex-1 truncate text-sm font-semibold">{w.title}</h2>
        <Popover>
          <PopoverTrigger asChild><IconButton aria-label={`${w.title} settings`} size="sm"><Settings2 /></IconButton></PopoverTrigger>
          <PopoverContent align="end" className="w-80 space-y-3 p-3 text-sm">
            <label className="block space-y-1"><span className="font-medium">Title</span><Input defaultValue={w.title} onBlur={(e) => e.target.value.trim() && e.target.value !== w.title && onPatch({ title: e.target.value.trim() })} /></label>
            {w.type === "numbers" ? <label className="block space-y-1"><span className="font-medium">Function</span><select className="h-8 w-full rounded-md border border-border-input bg-bg px-2" value={settings.fn ?? "sum"} onChange={(e) => onPatch({ settings: { ...settings, fn: e.target.value } as never })}>{["sum", "avg", "min", "max", "count"].map((f) => <option key={f} value={f}>{f}</option>)}</select></label> : null}
            {boards.map((b) => {
              const src = settings.sources?.find((s) => s.board_id === b.id);
              const key: keyof Source = w.type === "workload" ? "people_column_id" : "column_id";
              return (
                <label key={b.id} className="block space-y-1"><span className="font-medium">{b.name}</span>
                  <select className="h-8 w-full rounded-md border border-border-input bg-bg px-2" value={(src?.[key] as string | undefined) ?? ""} onChange={(e) => setSource(b.id, key, e.target.value)}>
                    <option value="">not included</option>
                    {columns.filter((c) => c.board_id === b.id && types.includes(c.type)).map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                  {w.type === "workload" ? <select className="h-8 w-full rounded-md border border-border-input bg-bg px-2" aria-label={`${b.name} date column`} value={src?.date_column_id ?? ""} onChange={(e) => setSource(b.id, "date_column_id", e.target.value)}><option value="">no date (one bucket)</option>{columns.filter((c) => c.board_id === b.id && (c.type === "date" || c.type === "timeline")).map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select> : null}
                </label>
              );
            })}
            <div className="flex items-center gap-1"><span className="font-medium">Size</span><Button variant="outline" size="xs" onClick={() => resize(-1, 0)}>narrower</Button><Button variant="outline" size="xs" onClick={() => resize(1, 0)}>wider</Button><Button variant="outline" size="xs" onClick={() => resize(0, -1)}>shorter</Button><Button variant="outline" size="xs" onClick={() => resize(0, 1)}>taller</Button></div>
          </PopoverContent>
        </Popover>
        <IconButton aria-label={`Take ${w.title} off the dashboard`} size="sm" onClick={onDrop}><X /></IconButton>
      </header>
      <div className="min-h-0 flex-1 px-3 pb-3">
        {data.isPending ? <Skeleton className="h-full w-full" /> : <WidgetBody type={w.type} data={data.data} fn={settings.fn} />}
      </div>
    </section>
  );
}

function WidgetBody({ type, data, fn }: { type: string; data: unknown; fn?: string }) {
  if (type === "numbers") {
    const d = data as { value: number | null; count: number } | null;
    return <div className="flex h-full flex-col justify-center"><div className="text-xl font-bold tabular-nums">{d?.value == null ? "–" : new Intl.NumberFormat().format(Number(d.value))}</div><div className="text-sm text-text-muted">{fn ?? "sum"} over {d?.count ?? 0} items</div></div>;
  }
  if (type === "battery") {
    const d = data as { total: number; labels: { label: string; color: string | null; count: number; is_done: boolean }[] } | null;
    const total = d?.total ?? 0;
    const labels = d?.labels ?? [];
    const counted = labels.reduce((a, l) => a + l.count, 0);
    if (!total) return <p className="text-sm text-text-muted">No items on the connected boards.</p>;
    return (
      <div className="flex h-full flex-col justify-center gap-2">
        <div className="flex h-6 w-full overflow-hidden rounded-pill bg-surface-2" role="img" aria-label={labels.map((l) => `${l.label} ${Math.round((l.count / total) * 100)}%`).join(", ")}>
          {labels.map((l) => <span key={l.label} style={{ flex: l.count, backgroundColor: colorVar(l.color) }} />)}
          {total - counted > 0 ? <span style={{ flex: total - counted }} /> : null}
        </div>
        <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs">{labels.map((l) => <li key={l.label} className="flex items-center gap-1"><span className="size-2.5 rounded-sm" style={{ backgroundColor: colorVar(l.color) }} aria-hidden />{l.label} {Math.round((l.count / total) * 100)}%</li>)}</ul>
      </div>
    );
  }
  if (type === "chart") {
    const rows = ((data as { x: string; y: number }[] | null) ?? []).map((r, i) => ({ ...r, fill: colorVar(LABEL_COLORS[i % LABEL_COLORS.length]) }));
    if (!rows.length) return <p className="text-sm text-text-muted">Nothing to chart yet.</p>;
    return (
      <ResponsiveContainer width="100%" height="100%">
        {rows.length <= 6 ? <PieChart><Pie data={rows} dataKey="y" nameKey="x" innerRadius="45%" label={(e) => `${e.x} ${e.y}`}>{rows.map((r) => <Cell key={r.x} fill={r.fill} />)}</Pie><Tooltip /></PieChart>
          : <BarChart data={rows}><XAxis dataKey="x" tick={{ fontSize: 11, fill: "var(--tk-text-muted)" }} /><YAxis tick={{ fontSize: 11, fill: "var(--tk-text-muted)" }} allowDecimals={false} /><Tooltip cursor={{ fill: "var(--tk-surface-2)" }} /><Bar dataKey="y">{rows.map((r) => <Cell key={r.x} fill={r.fill} />)}</Bar></BarChart>}
      </ResponsiveContainer>
    );
  }
  const rows = (data as { user_id: string; name: string; week: string | null; count: number }[] | null) ?? [];
  if (!rows.length) return <p className="text-sm text-text-muted">Nobody is assigned on the connected boards.</p>;
  const people = Array.from(new Set(rows.map((r) => r.name)));
  const weeks = Array.from(new Set(rows.map((r) => r.week ?? "no date"))).sort();
  return (
    <div className="h-full overflow-auto">
      <table className="w-full text-xs"><thead><tr><th className="text-left font-medium text-text-muted">Person</th>{weeks.map((wk) => <th key={wk} className="px-1 text-right font-medium text-text-muted">{wk === "no date" ? "No date" : wk.slice(5)}</th>)}<th className="px-1 text-right font-medium text-text-muted">Total</th></tr></thead>
        <tbody>{people.map((p) => { const mine = rows.filter((r) => r.name === p); const total = mine.reduce((a, r) => a + r.count, 0); return <tr key={p} className="border-t border-border"><td className="py-1 font-medium">{p}</td>{weeks.map((wk) => { const n = mine.find((r) => (r.week ?? "no date") === wk)?.count ?? 0; return <td key={wk} className="px-1 py-1 text-right"><span className={cn("inline-block min-w-6 rounded-sm px-1 tabular-nums", n > 0 && "bg-brand-soft text-brand-text")}>{n || ""}</span></td>; })}<td className="px-1 py-1 text-right tabular-nums">{total}</td></tr>; })}</tbody></table>
    </div>
  );
}
