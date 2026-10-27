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
  const merged = useMemo(() => ({ ...view, settings: { ...settings, group_by: null, search: toolbar.search, person_filter: toolbar.persons } }) as ViewRow, [view, settings, toolbar]);
  const { sections } = useMemo(() => applyView(s, index, ctx, merged), [s, index, ctx, merged]);

  const data = useMemo(() => {
    if (!xCol) return [];
    const m = moduleFor(xCol.type);
    const buckets = new Map<string, { name: string; color?: string; values: number[]; count: number }>();
    for (const it of sections.flatMap((sec) => sec.items)) {
      const g = m.groupKey!(cellsOf(index, it.id)[xCol.id] ?? null, xCol, ctx);
      const b = buckets.get(g.key) ?? { name: g.label, color: g.color, values: [], count: 0 };
      b.count += 1;
      const n = yCol ? (cellsOf(index, it.id)[yCol.id]?.number as number | undefined) : undefined;
      if (typeof n === "number") b.values.push(n);
      buckets.set(g.key, b);
    }
    const fn = chart.y_fn ?? "count";
    return Array.from(buckets.values()).map((b, i) => {
      const sum = b.values.reduce((a, c) => a + c, 0);
      const value = fn === "count" ? b.count : !b.values.length ? 0 : fn === "sum" ? sum : fn === "avg" ? sum / b.values.length : fn === "min" ? Math.min(...b.values) : Math.max(...b.values);
      return { name: b.name, value: Math.round(value * 100) / 100, fill: colorVar(b.color ?? LABEL_COLORS[i % LABEL_COLORS.length]) };
    });
  }, [sections, index, xCol, yCol, chart.y_fn, ctx]);

  const save = (p: Partial<NonNullable<ViewSettings["chart"]>>) => mutations.updateView(view, { settings: { ...settings, chart: { ...chart, ...p } } as never });
  if (!xCol) return <EmptyState title="Nothing to chart yet" description="Add a status, people, date, dropdown or checkbox column to group items by." />;

  return (
    <div className="flex h-full flex-col">
      {s.access.can_edit_structure ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-1.5 text-xs text-text-muted">
          <select className={select} aria-label="Chart type" value={chart.type} onChange={(e) => save({ type: e.target.value as "bar" | "line" | "pie" | "stacked" })}><option value="bar">Bar</option><option value="line">Line</option><option value="pie">Pie</option></select>
          <span>of</span>
          <select className={select} aria-label="Function" value={chart.y_fn ?? "count"} onChange={(e) => save({ y_fn: e.target.value as "count" | "sum" | "avg" | "min" | "max" })}><option value="count">count of items</option>{numeric.length ? <><option value="sum">sum</option><option value="avg">average</option><option value="min">minimum</option><option value="max">maximum</option></> : null}</select>
          {chart.y_fn && chart.y_fn !== "count" ? <select className={select} aria-label="Value column" value={yCol?.id} onChange={(e) => save({ y_column_id: e.target.value })}>{numeric.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select> : null}
          <span>by</span>
          <select className={select} aria-label="Group by column" value={xCol.id} onChange={(e) => save({ x_column_id: e.target.value })}>{groupable.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select>
        </div>
      ) : null}
      <div className="min-h-0 flex-1 p-4" role="img" aria-label={`${chart.type} chart of ${chart.y_fn ?? "count"} by ${xCol.title}: ${data.map((d) => `${d.name} ${d.value}`).join(", ")}`}>
        {data.length === 0 ? <EmptyState title="No items to chart" description="Clear the filters or add items." /> : (
          <ResponsiveContainer width="100%" height="100%">
            {chart.type === "pie" ? (
              <PieChart><Pie data={data} dataKey="value" nameKey="name" label={(d) => `${d.name} (${d.value})`}>{data.map((d) => <Cell key={d.name} fill={d.fill} />)}</Pie><Tooltip /><Legend /></PieChart>
            ) : chart.type === "line" ? (
              <LineChart data={data}><CartesianGrid stroke="var(--tk-border)" /><XAxis dataKey="name" tick={{ fontSize: 12, fill: "var(--tk-text-muted)" }} /><YAxis tick={{ fontSize: 12, fill: "var(--tk-text-muted)" }} allowDecimals={false} /><Tooltip /><Line type="monotone" dataKey="value" stroke="var(--tk-accent)" strokeWidth={2} /></LineChart>
            ) : (
              <BarChart data={data}><CartesianGrid stroke="var(--tk-border)" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 12, fill: "var(--tk-text-muted)" }} /><YAxis tick={{ fontSize: 12, fill: "var(--tk-text-muted)" }} allowDecimals={false} /><Tooltip cursor={{ fill: "var(--tk-surface-2)" }} /><Bar dataKey="value" radius={[4, 4, 0, 0]}>{data.map((d) => <Cell key={d.name} fill={d.fill} />)}</Bar></BarChart>
            )}
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
