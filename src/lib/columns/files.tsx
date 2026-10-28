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
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [failed, setFailed] = useState<File[]>([]);
  const upload = async (files: FileList | File[] | null) => {
    const list = files ? Array.from(files) : [];
    if (!list.length || !board.onUpload) return;
    setBusy(true);
    setError(null);
    setFailed((f) => f.filter((x) => !list.some((l) => l.name === x.name)));
    try {
      const added = await board.onUpload(item, column, list, (f, p) => setProgress((prev) => ({ ...prev, [f.name]: p })));
      const ok = new Set(added.map((a) => a.name));
      setFailed((f) => [...f, ...list.filter((l) => !ok.has(l.name))]);
      if (added.length) onChange({ ids: [...idsOf(value), ...added.map((a) => a.id)] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed. Try again.");
      setFailed((f) => [...f, ...list]);
    } finally {
      setBusy(false);
      setProgress({});
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
            {Object.entries(progress).map(([name, p]) => (
              <li key={name} className="flex items-center gap-2 px-1 py-0.5 text-sm"><Ring value={p} /><span className="min-w-0 flex-1 truncate">{name}</span><span className="text-xs text-text-muted tabular-nums">{Math.round(p * 100)}%</span></li>
            ))}
            {failed.map((f) => (
              <li key={f.name} className="flex items-center gap-2 px-1 py-0.5 text-sm"><span className="min-w-0 flex-1 truncate text-danger">{f.name} did not upload</span><Button variant="outline" size="xs" onClick={() => upload([f])}>Retry</Button></li>
            ))}
            {assets.length === 0 && !failed.length && !Object.keys(progress).length ? <li className="px-1 py-2 text-sm text-text-muted">No files yet. Drop files here or upload.</li> : null}
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

/** Upload progress as a ring, read out as a percentage. */
function Ring({ value }: { value: number }) {
  const r = 7;
  const c = 2 * Math.PI * r;
  return (
    <svg role="progressbar" aria-label="Uploading" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value * 100)} width="18" height="18" viewBox="0 0 18 18" className="shrink-0 -rotate-90">
      <circle cx="9" cy="9" r={r} fill="none" strokeWidth="2.5" className="stroke-border" />
      <circle cx="9" cy="9" r={r} fill="none" strokeWidth="2.5" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - value)} className="stroke-brand" />
    </svg>
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
