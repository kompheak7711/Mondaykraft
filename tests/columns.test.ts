// @vitest-environment node
import { describe, expect, it } from "vitest";
import { columnModules } from "@/lib/columns";
import { progressOf } from "@/lib/columns/progress";
import type { BoardContext, Column } from "@/lib/columns/types";

const col = (type: Column["type"], settings: Record<string, unknown> = {}, id: string = type): Column => ({ id, board_id: "b", scope: "item", title: type, type, settings, width: 140, position: 1, description: null });
const ctx: BoardContext = { boardId: "b", workspaceId: "w", members: [{ id: "u1", name: "Ana" }, { id: "u2", name: "Ben" }], tags: [{ id: "t1", name: "urgent", color: "red" }], assets: {}, timezone: "UTC", statusColumns: [] };
const status = col("status", { labels: [{ id: "todo", label: "Not started", color: "gray" }, { id: "done", label: "Done", color: "green", is_done: true }] });

describe("column validation mirrors the database validator", () => {
  it("accepts the documented value shapes", () => {
    expect(columnModules.status.schema.safeParse({ label_id: "done" }).success).toBe(true);
    expect(columnModules.people.schema.safeParse({ ids: ["11111111-1111-4111-8111-111111111111"] }).success).toBe(true);
    expect(columnModules.date.schema.safeParse({ date: "2026-10-28", time: "09:30" }).success).toBe(true);
    expect(columnModules.timeline.schema.safeParse({ from: "2026-10-01", to: "2026-10-15" }).success).toBe(true);
    expect(columnModules.numbers.schema.safeParse({ number: 12.5 }).success).toBe(true);
    expect(columnModules.link.schema.safeParse({ url: "https://example.com", text: "Site" }).success).toBe(true);
    expect(columnModules.checkbox.schema.safeParse({ checked: true }).success).toBe(true);
  });
  it("rejects the shapes the database rejects", () => {
    expect(columnModules.status.schema.safeParse({ label: "Done" }).success).toBe(false);
    expect(columnModules.people.schema.safeParse({ ids: [] }).success).toBe(false);
    expect(columnModules.date.schema.safeParse({ date: "next tuesday" }).success).toBe(false);
    expect(columnModules.numbers.schema.safeParse({ number: "12" }).success).toBe(false);
    expect(columnModules.link.schema.safeParse({ url: "not a url" }).success).toBe(false);
    expect(columnModules.progress.schema.safeParse({ anything: 1 }).success).toBe(false);
  });
  it("derives the same text as the database", () => {
    expect(columnModules.status.toText({ label_id: "done" }, status, ctx)).toBe("Done");
    expect(columnModules.people.toText({ ids: ["u2", "u1"] }, col("people"), ctx)).toBe("Ana, Ben");
    expect(columnModules.tags.toText({ ids: ["t1"] }, col("tags"), ctx)).toBe("urgent");
    expect(columnModules.date.toText({ date: "2026-10-28", time: "09:30" }, col("date"), ctx)).toBe("2026-10-28 09:30");
    expect(columnModules.timeline.toText({ from: "2026-10-01", to: "2026-10-15" }, col("timeline"), ctx)).toBe("2026-10-01 - 2026-10-15");
    expect(columnModules.numbers.toText({ number: 1234.5 }, col("numbers", { unit: "$", unit_position: "prefix", decimals: 1 }), ctx)).toBe("$1,234.5");
  });
});

describe("filters and sort keys", () => {
  it("status filters by label set and emptiness", () => {
    const m = columnModules.status;
    expect(m.matches({ label_id: "done" }, "is", ["done"], status, ctx)).toBe(true);
    expect(m.matches({ label_id: "todo" }, "is", ["done"], status, ctx)).toBe(false);
    expect(m.matches(null, "is_empty", undefined, status, ctx)).toBe(true);
    expect(m.matches({ label_id: "todo" }, "is_not", ["done"], status, ctx)).toBe(true);
    expect(m.sortKey({ label_id: "done" }, status, ctx)).toBe(1);
    expect(m.sortKey(null, status, ctx)).toBeNull();
  });
  it("dates compare as days and numbers as numbers", () => {
    const d = columnModules.date;
    expect(d.matches({ date: "2026-01-02" }, "after", "2026-01-01", col("date"), ctx)).toBe(true);
    expect(d.matches({ date: "2026-01-02" }, "before", "2026-01-01", col("date"), ctx)).toBe(false);
    expect(d.matches(null, "is_past", undefined, col("date"), ctx)).toBe(false);
    const n = columnModules.numbers;
    expect(n.matches({ number: 10 }, "gt", 9, col("numbers"), ctx)).toBe(true);
    expect(n.matches({ number: 9 }, "gt", "10", col("numbers"), ctx)).toBe(false);
    expect([n.sortKey({ number: 10 }, col("numbers"), ctx), n.sortKey({ number: 9 }, col("numbers"), ctx)]).toEqual([10, 9]);
  });
  it("text filters are case-insensitive substrings", () => {
    const t = columnModules.text;
    expect(t.matches({ text: "Launch Plan" }, "contains", "plan", col("text"), ctx)).toBe(true);
    expect(t.matches({ text: "Launch Plan" }, "not_contains", "plan", col("text"), ctx)).toBe(false);
    expect(t.matches(null, "is_empty", undefined, col("text"), ctx)).toBe(true);
  });
});

describe("progress roll-up", () => {
  const s2 = col("status", status.settings, "s2");
  const board: BoardContext = { ...ctx, statusColumns: [status, s2] };
  it("counts done labels across the status columns", () => {
    const p = col("progress", { source_column_ids: [] });
    expect(progressOf(p, { status: { label_id: "done" }, s2: { label_id: "todo" } }, board)).toBe(0.5);
    expect(progressOf(p, { status: { label_id: "done" }, s2: { label_id: "done" } }, board)).toBe(1);
    expect(progressOf(p, {}, board)).toBe(0);
  });
  it("honours an explicit source list and returns null without sources", () => {
    expect(progressOf(col("progress", { source_column_ids: ["s2"] }), { status: { label_id: "done" } }, board)).toBe(0);
    expect(progressOf(col("progress"), {}, { ...board, statusColumns: [] })).toBeNull();
  });
});
