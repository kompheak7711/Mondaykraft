/** RFC 4180 CSV: fields with a comma, quote or line break are quoted; quotes double. */
export function toCsv(rows: (string | number | null | undefined)[][]): string {
  const field = (v: string | number | null | undefined) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return rows.map((r) => r.map(field).join(",")).join("\r\n") + "\r\n";
}

/** Hands the browser a file to save. */
export function downloadBlob(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** A text file with a UTF-8 BOM, so spreadsheets open accents intact. */
export const downloadText = (name: string, text: string, type = "text/csv;charset=utf-8") => downloadBlob(name, new Blob(["﻿" + text], { type }));
