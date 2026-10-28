"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { EmptyState } from "@/components/ui/empty-state";
import { LABEL_COLORS } from "@/components/ui/status-chip";
import { moduleFor } from "@/lib/columns";
import type { BoardContext } from "@/lib/columns/types";
import { applyView, cellsOf, type CellIndex } from "@/lib/board/model";
import { settingsOf, type BoardSnapshot, type ViewRow, type ViewSettings } from "@/lib/board/types";
import type { BoardMutations } from "@/lib/board/mutations";
import type { ToolbarState } from "@/components/board/toolbar";

type Props = { snapshot: BoardSnapshot; index: CellIndex; ctx: BoardContext; mutations: BoardMutations; view: ViewRow; toolbar: ToolbarState };
const select = "h-8 rounded-md border border-border-input bg-bg px-2 text-sm";
const colorVar = (c?: string) => `var(--tk-label-${c && (LABEL_COLORS as readonly string[]).includes(c) ? c : "gray"})`;

/** S11: count or sum items by a column, as a bar, line or pie chart. Honours the view's filters. */
export function ChartView({ snapshot: s, index, ctx, mutations, view, toolbar }: Props) {
  const settings = settingsOf(view);
  const chart = settings.chart ?? { type: "bar" as const, y_fn: "count" as const };
  const groupable = s.columns.filter((c) => c.scope === "item" && moduleFor(c.type).groupKey);
  const numeric = s.columns.filter((c) => c.scope === "item" && c.type === "numbers");
  const xCol = groupable.find((c) => c.id === chart.x_column_id) ?? groupable[0];
  const yCol = numeric.find((c) => c.id === chart.y_column_id) ?? numeric[0];
  const stackCol = chart.type === "stacked" ? (groupable.find((c) => c.id === chart.stack_column_id && c.id !== xCol?.id) ?? groupable.find((c) => c.id !== xCol?.id)) : undefined;
  const merged = useMemo(() => ({ ...view, settings: { ...settings, group_by: null, search: toolbar.search, person_filter: toolbar.persons } }) as ViewRow, [view, settings, toolbar]);
  const { sections } = useMemo(() => applyView(s, index, ctx, merged), [s, index, ctx, merged]);

  // One bucket per x value; with a stack column, each bucket also carries one part per stack value (keys prefixed "s:").
  const { data, series } = useMemo(() => {
    if (!xCol) return { data: [], series: [] };
    type Acc = { count: number; values: number[] };
    const m = moduleFor(xCol.type);
    const sm = stackCol ? moduleFor(stackCol.type) : null;
    const fn = chart.y_fn ?? "count";
    const agg = (a: Acc) => {
      const sum = a.values.reduce((x, y) => x + y, 0);
      const v = fn === "count" ? a.count : !a.values.length ? 0 : fn === "sum" ? sum : fn === "avg" ? sum / a.values.length : fn === "min" ? Math.min(...a.values) : Math.max(...a.values);
      return Math.round(v * 100) / 100;
    };
    const buckets = new Map<string, { name: string; color?: string; all: Acc; parts: Map<string, Acc> }>();
    const found = new Map<string, { key: string; label: string; color?: string }>();
    for (const it of sections.flatMap((sec) => sec.items)) {
      const cells = cellsOf(index, it.id);
      const g = m.groupKey!(cells[xCol.id] ?? null, xCol, ctx);
      const b = buckets.get(g.key) ?? { name: g.label, color: g.color, all: { count: 0, values: [] }, parts: new Map() };
      const n = yCol ? (cells[yCol.id]?.number as number | undefined) : undefined;
      const push = (a: Acc) => { a.count += 1; if (typeof n === "number") a.values.push(n); };
      push(b.all);
      if (sm && stackCol) {
        const sk = sm.groupKey!(cells[stackCol.id] ?? null, stackCol, ctx);
        const key = `s:${sk.key}`;
        if (!found.has(key)) found.set(key, { key, label: sk.label, color: sk.color });
        const p = b.parts.get(key) ?? { count: 0, values: [] };
        push(p);
        b.parts.set(key, p);
      }
      buckets.set(g.key, b);
    }
    const series = Array.from(found.values()).map((x, i) => ({ ...x, fill: colorVar(x.color ?? LABEL_COLORS[i % LABEL_COLORS.length]) }));
    const data = Array.from(buckets.values()).map((b, i) => ({
      name: b.name, value: agg(b.all), fill: colorVar(b.color ?? LABEL_COLORS[i % LABEL_COLORS.length]),
      ...Object.fromEntries(series.map((x) => [x.key, b.parts.has(x.key) ? agg(b.parts.get(x.key)!) : 0])),
    }));
    return { data, series };
  }, [sections, index, xCol, yCol, stackCol, chart.y_fn, ctx]);

  const save = (p: Partial<NonNullable<ViewSettings["chart"]>>) => mutations.updateView(view, { settings: { ...settings, chart: { ...chart, ...p } } as never });
  if (!xCol) return <EmptyState title="Nothing to chart yet" description="Add a status, people, date, dropdown or checkbox column to group items by." />;

  return (
    <div className="flex h-full flex-col">
      {s.access.can_edit_structure ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-1.5 text-xs text-text-muted">
          <select className={select} aria-label="Chart type" value={chart.type} onChange={(e) => save({ type: e.target.value as "bar" | "line" | "pie" | "stacked" })}><option value="bar">Bar</option><option value="stacked">Stacked bar</option><option value="line">Line</option><option value="pie">Pie</option></select>
          <span>of</span>
          <select className={select} aria-label="Function" value={chart.y_fn ?? "count"} onChange={(e) => save({ y_fn: e.target.value as "count" | "sum" | "avg" | "min" | "max" })}><option value="count">count of items</option>{numeric.length ? <><option value="sum">sum</option><option value="avg">average</option><option value="min">minimum</option><option value="max">maximum</option></> : null}</select>
          {chart.y_fn && chart.y_fn !== "count" ? <select className={select} aria-label="Value column" value={yCol?.id} onChange={(e) => save({ y_column_id: e.target.value })}>{numeric.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select> : null}
          <span>by</span>
          <select className={select} aria-label="Group by column" value={xCol.id} onChange={(e) => save({ x_column_id: e.target.value })}>{groupable.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select>
          {chart.type === "stacked" ? (stackCol ? <><span>stacked by</span><select className={select} aria-label="Stack by column" value={stackCol.id} onChange={(e) => save({ stack_column_id: e.target.value })}>{groupable.filter((c) => c.id !== xCol.id).map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select></> : <span>(add a second status, people, date or dropdown column to stack by)</span>) : null}
        </div>
      ) : null}
      <div className="min-h-0 flex-1 p-4" role="img" aria-label={`${chart.type === "stacked" ? "stacked bar" : chart.type} chart of ${chart.y_fn ?? "count"} by ${xCol.title}${stackCol ? ` stacked by ${stackCol.title}` : ""}: ${data.map((d) => `${d.name} ${d.value}`).join(", ")}`}>
        {data.length === 0 ? <EmptyState title="No items to chart" description="Clear the filters or add items." /> : (
          <ResponsiveContainer width="100%" height="100%">
            {chart.type === "pie" ? (
              <PieChart><Pie data={data} dataKey="value" nameKey="name" label={(d) => `${d.name} (${d.value})`}>{data.map((d) => <Cell key={d.name} fill={d.fill} />)}</Pie><Tooltip /><Legend /></PieChart>
            ) : chart.type === "line" ? (
              <LineChart data={data}><CartesianGrid stroke="var(--tk-border)" /><XAxis dataKey="name" tick={{ fontSize: 12, fill: "var(--tk-text-muted)" }} /><YAxis tick={{ fontSize: 12, fill: "var(--tk-text-muted)" }} allowDecimals={false} /><Tooltip /><Line type="monotone" dataKey="value" stroke="var(--tk-accent)" strokeWidth={2} /></LineChart>
            ) : chart.type === "stacked" && series.length ? (
              <BarChart data={data}><CartesianGrid stroke="var(--tk-border)" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 12, fill: "var(--tk-text-muted)" }} /><YAxis tick={{ fontSize: 12, fill: "var(--tk-text-muted)" }} allowDecimals={false} /><Tooltip cursor={{ fill: "var(--tk-surface-2)" }} /><Legend />{series.map((x, i) => <Bar key={x.key} dataKey={x.key} name={x.label} stackId="all" fill={x.fill} radius={i === series.length - 1 ? [4, 4, 0, 0] : undefined} />)}</BarChart>
            ) : (
              <BarChart data={data}><CartesianGrid stroke="var(--tk-border)" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 12, fill: "var(--tk-text-muted)" }} /><YAxis tick={{ fontSize: 12, fill: "var(--tk-text-muted)" }} allowDecimals={false} /><Tooltip cursor={{ fill: "var(--tk-surface-2)" }} /><Bar dataKey="value" radius={[4, 4, 0, 0]}>{data.map((d) => <Cell key={d.name} fill={d.fill} />)}</Bar></BarChart>
            )}
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
