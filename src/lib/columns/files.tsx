"use client";

import { useRef, useState } from "react";
import { z } from "zod";
import { FileIcon, FileImage, FileText, Paperclip, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Spinner } from "@/components/ui/spinner";
import { CellButton, Muted } from "./shared";
import type { AssetInfo, BoardContext, CellProps, CellValue, ColumnModule } from "./types";

const idsOf = (value: CellValue) => (Array.isArray(value?.ids) ? (value!.ids as string[]) : []);
const assetsOf = (value: CellValue, board: BoardContext) => idsOf(value).map((id) => board.assets[id]).filter(Boolean) as AssetInfo[];
const isImage = (a: AssetInfo) => a.mime.startsWith("image/");
const Icon = ({ a }: { a: AssetInfo }) => (isImage(a) ? <FileImage className="size-4" aria-hidden /> : a.mime.startsWith("text/") || a.mime.includes("pdf") ? <FileText className="size-4" aria-hidden /> : <FileIcon className="size-4" aria-hidden />);

export function Thumb({ a, board, size = 24 }: { a: AssetInfo; board: BoardContext; size?: number }) {
  const url = isImage(a) ? board.assetUrl?.(a) : undefined;
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={a.name} width={size} height={size} className="shrink-0 rounded-sm object-cover" style={{ width: size, height: size }} />
  ) : (
    <span className="flex shrink-0 items-center justify-center rounded-sm bg-surface-2 text-text-muted" style={{ width: size, height: size }} title={a.name}><Icon a={a} /></span>
  );
}

function FilesCell({ column, item, value, canEdit, onChange, variant, board }: CellProps) {
  const assets = assetsOf(value, board);
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const upload = async (files: FileList | null) => {
    if (!files?.length || !board.onUpload) return;
    setBusy(true);
    setError(null);
    try {
      const added = await board.onUpload(item, column, Array.from(files));
      const next = [...idsOf(value), ...added.map((a) => a.id)];
      if (next.length) onChange({ ids: next });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed. Try again.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };
  const remove = (id: string) => {
    const next = idsOf(value).filter((x) => x !== id);
    onChange(next.length ? { ids: next } : null);
  };
  return (
    <CellButton canEdit={canEdit} variant={variant} label={`${column.title}: ${assets.length ? assets.map((a) => a.name).join(", ") : "no files"}`} width="w-80"
      editor={() => (
        <div className="space-y-2" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); upload(e.dataTransfer.files); }}>
          <ul className="max-h-56 space-y-1 overflow-y-auto">
            {assets.map((a) => (
              <li key={a.id} className="flex items-center gap-2 rounded-md px-1 py-0.5 hover:bg-surface-2">
                <Thumb a={a} board={board} size={28} />
                <a href={board.assetUrl?.(a)} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate text-sm hover:underline">{a.name}</a>
                <span className="text-xs text-text-muted">{Math.max(1, Math.round(a.size / 1024))} KB</span>
                <IconButton aria-label={`Remove ${a.name}`} size="sm" onClick={() => remove(a.id)}><X /></IconButton>
              </li>
            ))}
            {assets.length === 0 ? <li className="px-1 py-2 text-sm text-text-muted">No files yet. Drop files here or upload.</li> : null}
          </ul>
          {error ? <p role="alert" className="text-xs text-danger">{error}</p> : null}
          <input ref={inputRef} type="file" multiple className="sr-only" aria-label="Upload files" onChange={(e) => upload(e.target.files)} />
          <Button variant="outline" size="sm" disabled={busy || !board.onUpload} onClick={() => inputRef.current?.click()}>
            {busy ? <Spinner /> : <Upload />} Upload (25 MB max)
          </Button>
        </div>
      )}>
      {assets.length ? (
        <span className="flex items-center gap-1">
          {assets.slice(0, 3).map((a) => <Thumb key={a.id} a={a} board={board} />)}
          {assets.length > 3 ? <span className="text-xs text-text-muted">+{assets.length - 3}</span> : null}
          {variant === "field" ? <span className="ml-1 truncate text-sm">{assets.map((a) => a.name).join(", ")}</span> : null}
        </span>
      ) : (
        <Muted>{variant === "field" ? "Attach files" : <Paperclip className="size-4" aria-hidden />}</Muted>
      )}
    </CellButton>
  );
}

export const filesModule: ColumnModule = {
  type: "files",
  label: "Files",
  description: "Attachments, up to 25 MB each.",
  icon: Paperclip,
  group: "essential",
  defaultSettings: () => ({}),
  schema: z.object({ ids: z.array(z.string().uuid()).min(1) }),
  toText: (value, _c, board) => assetsOf(value, board).map((a) => a.name).join(", "),
  sortKey: (value) => idsOf(value).length || null,
  filterOps: [
    { id: "is_empty", label: "has no files", operand: "none" },
    { id: "not_empty", label: "has files", operand: "none" },
  ],
  matches: (value, op) => (op === "is_empty" ? idsOf(value).length === 0 : idsOf(value).length > 0),
  summaries: ["count", "none"],
  Cell: FilesCell,
};
