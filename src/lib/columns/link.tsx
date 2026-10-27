"use client";

import { useState } from "react";
import { z } from "zod";
import { ExternalLink, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CellButton, Muted, matchText, textOps } from "./shared";
import type { CellProps, CellValue, ColumnModule } from "./types";

const urlOf = (value: CellValue) => (typeof value?.url === "string" ? (value.url as string) : "");
const textOf = (value: CellValue) => (typeof value?.text === "string" ? (value.text as string) : "");
const isHttp = (u: string) => /^https?:\/\//i.test(u);

function LinkCell({ column, value, canEdit, onChange, variant }: CellProps) {
  const url = urlOf(value);
  const text = textOf(value);
  const [draftUrl, setDraftUrl] = useState(url);
  const [draftText, setDraftText] = useState(text);
  const [bad, setBad] = useState(false);
  const save = (close: () => void) => {
    let u = draftUrl.trim();
    if (u && !/^[a-z]+:\/\//i.test(u)) u = "https://" + u;
    if (!u) { onChange(null); close(); return; }
    if (!isHttp(u)) { setBad(true); return; }
    onChange({ url: u, ...(draftText.trim() ? { text: draftText.trim() } : {}) });
    close();
  };
  return (
    <CellButton canEdit={canEdit} variant={variant} label={`${column.title}: ${text || url || "empty"}`}
      editor={(close) => (
        <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); save(close); }}>
          <div className="space-y-1"><Label htmlFor={`link-url-${column.id}`}>Address</Label>
            <Input id={`link-url-${column.id}`} value={draftUrl} onChange={(e) => { setDraftUrl(e.target.value); setBad(false); }} placeholder="https://example.com" inputMode="url" aria-invalid={bad || undefined} autoFocus /></div>
          {bad ? <p role="alert" className="text-xs text-danger">Use a web address that starts with http:// or https://.</p> : null}
          <div className="space-y-1"><Label htmlFor={`link-text-${column.id}`}>Text to show</Label>
            <Input id={`link-text-${column.id}`} value={draftText} onChange={(e) => setDraftText(e.target.value)} placeholder="Optional" maxLength={500} /></div>
          <div className="flex justify-between">
            <Button type="button" variant="ghost" size="sm" disabled={!url} onClick={() => { onChange(null); setDraftUrl(""); setDraftText(""); close(); }}>Clear</Button>
            <Button type="submit" size="sm">Save</Button>
          </div>
        </form>
      )}>
      {url ? (
        <span className="flex min-w-0 items-center gap-1 text-brand-text">
          <a href={url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="truncate underline-offset-2 hover:underline" aria-label={`${text || url} (opens in a new tab)`}>{text || url.replace(/^https?:\/\//, "")}</a>
          <ExternalLink className="size-3 shrink-0" aria-hidden />
        </span>
      ) : <Muted>{variant === "field" ? "Add a link" : ""}</Muted>}
    </CellButton>
  );
}

export const linkModule: ColumnModule = {
  type: "link",
  label: "Link",
  description: "A web address with the text to show.",
  icon: Link2,
  group: "essential",
  defaultSettings: () => ({}),
  schema: z.object({ url: z.string().url(), text: z.string().max(500).optional() }),
  toText: (value) => textOf(value) || urlOf(value),
  sortKey: (value) => (textOf(value) || urlOf(value)).toLowerCase() || null,
  filterOps: textOps,
  matches: (value, op, operand) => matchText(`${textOf(value)} ${urlOf(value)}`, op, operand),
  summaries: ["count", "none"],
  Cell: LinkCell,
};
