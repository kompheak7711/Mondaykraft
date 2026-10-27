"use client";

import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { AlignLeft, Type } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CellButton, Muted, matchText, textOps } from "./shared";
import type { CellProps, CellValue, ColumnModule } from "./types";

const textOf = (value: CellValue) => (typeof value?.text === "string" ? (value.text as string) : "");

/** Short text edits in place: click or press Enter to type, Enter saves, Escape cancels. */
function TextCell({ column, value, canEdit, onChange, variant }: CellProps) {
  const text = textOf(value);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(text);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (!editing) setDraft(text); }, [text, editing]);
  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);

  const commit = () => {
    setEditing(false);
    const next = draft.trim();
    if (next === text) return;
    onChange(next ? { text: next } : null);
  };

  if (editing) {
    return (
      <input
        ref={ref}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); commit(); }
          if (e.key === "Escape") { e.preventDefault(); setDraft(text); setEditing(false); }
        }}
        maxLength={4000}
        aria-label={column.title}
        className={cn("h-full w-full bg-bg px-2 text-sm outline-none ring-2 ring-brand ring-inset", variant === "field" && "min-h-8 rounded-md")}
      />
    );
  }
  const base = cn("flex h-full w-full min-w-0 items-center px-2 text-left text-sm", variant === "field" && "min-h-8 rounded-md border border-transparent hover:border-border-input");
  if (!canEdit) return <div className={base} aria-label={`${column.title}: ${text || "empty"}`}><span className="truncate">{text || <Muted>{""}</Muted>}</span></div>;
  return (
    <button type="button" onClick={() => setEditing(true)} aria-label={`${column.title}: ${text || "empty"}. Press Enter to edit`} className={cn(base, "hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-inset")}>
      <span className="truncate">{text || (variant === "field" ? <Muted>Add text</Muted> : "")}</span>
    </button>
  );
}

function LongTextCell({ column, value, canEdit, onChange, variant }: CellProps) {
  const text = textOf(value);
  const [draft, setDraft] = useState(text);
  const firstLine = text.split("\n")[0];
  return (
    <CellButton
      canEdit={canEdit}
      variant={variant}
      label={`${column.title}: ${firstLine || "empty"}`}
      width="w-96"
      onOpenChange={undefined}
      editor={(close) => (
        <div className="space-y-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onFocus={() => setDraft(text)}
            rows={6}
            maxLength={100000}
            aria-label={column.title}
            autoFocus
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { onChange(draft.trim() ? { text: draft } : null); close(); }
              if (e.key === "Escape") { setDraft(text); close(); }
            }}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-muted">⌘↵ to save</span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setDraft(text); close(); }}>Cancel</Button>
              <Button size="sm" onClick={() => { onChange(draft.trim() ? { text: draft } : null); close(); }}>Save</Button>
            </div>
          </div>
        </div>
      )}
    >
      {text ? <span className={cn("truncate", variant === "field" && "line-clamp-3 whitespace-pre-wrap")}>{variant === "field" ? text : firstLine}</span> : <Muted>{variant === "field" ? "Add notes" : ""}</Muted>}
    </CellButton>
  );
}

const textBase = {
  schema: z.object({ text: z.string().min(1) }),
  toText: (value: CellValue) => textOf(value),
  sortKey: (value: CellValue) => textOf(value).toLowerCase() || null,
  filterOps: textOps,
  matches: (value: CellValue, op: string, operand: unknown) => matchText(textOf(value), op, operand),
  summaries: ["count" as const, "none" as const],
};

export const textModule: ColumnModule = {
  ...textBase,
  type: "text",
  label: "Text",
  description: "A short line of text.",
  icon: Type,
  group: "essential",
  defaultSettings: () => ({}),
  groupKey: (value) => ({ key: textOf(value), label: textOf(value) || "Empty" }),
  Cell: TextCell,
};

export const longTextModule: ColumnModule = {
  ...textBase,
  type: "long_text",
  label: "Long text",
  description: "Notes and descriptions, several paragraphs long.",
  icon: AlignLeft,
  group: "essential",
  defaultSettings: () => ({}),
  Cell: LongTextCell,
};
