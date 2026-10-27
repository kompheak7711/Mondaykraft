"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { moduleFor } from "@/lib/columns";
import type { BoardContext, Column } from "@/lib/columns/types";
import type { BoardSnapshot } from "@/lib/board/types";
import type { BoardMutations } from "@/lib/board/mutations";

/** S05: rename, describe and configure a column. Label and option edits save as you go; the rest on Save. */
export function ColumnSettingsDialog({ column, onClose, snapshot: s, ctx, mutations }: { column: Column | null; onClose: () => void; snapshot: BoardSnapshot; ctx: BoardContext; mutations: BoardMutations }) {
  const live = column ? s.columns.find((c) => c.id === column.id) ?? column : null;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [width, setWidth] = useState(140);
  useEffect(() => {
    if (live) { setTitle(live.title); setDescription(live.description ?? ""); setWidth(live.width); }
  }, [live?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!live) return null;
  const m = moduleFor(live.type);
  const Settings = m.SettingsEditor;
  const save = async () => {
    const p: Partial<Pick<Column, "title" | "description" | "width">> = {};
    if (title.trim() && title.trim() !== live.title) p.title = title.trim();
    if ((description.trim() || null) !== live.description) p.description = description.trim() || null;
    if (width !== live.width) p.width = Math.min(1000, Math.max(60, width));
    if (Object.keys(p).length) await mutations.updateColumn(live, p);
    onClose();
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><m.icon className="size-4 text-text-muted" aria-hidden /> {live.title}</DialogTitle>
          <DialogDescription>{m.label} column. {m.description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
            <div className="space-y-1"><Label htmlFor="col-title">Title</Label><Input id="col-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} /></div>
            <div className="space-y-1"><Label htmlFor="col-width">Width (px)</Label><Input id="col-width" type="number" min={60} max={1000} value={width} onChange={(e) => setWidth(Number(e.target.value))} /></div>
          </div>
          <div className="space-y-1"><Label htmlFor="col-desc">Description</Label><Textarea id="col-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Shown as a tooltip on the column header" /></div>
          {Settings ? (
            <div className="space-y-2 rounded-md border border-border p-3">
              <Settings column={live} board={ctx} onChange={(settings) => mutations.updateColumn(live, { settings })} />
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={save}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
