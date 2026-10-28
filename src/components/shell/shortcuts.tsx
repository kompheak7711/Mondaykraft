"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";

export const shortcuts = [
  ["?", "Show this list"],
  ["⌘ K or /", "Search"],
  ["N", "Add an item to the first group of the open board"],
  ["G then H, W, I or N", "Go home, to My Work, Inbox or Notifications"],
  ["↑ ↓ ← →", "Move between cells"],
  ["Enter", "Open the cell editor"],
  ["Esc", "Close an editor or clear the selection"],
  ["F2", "Rename the focused item"],
  ["⌘ ↵", "Post an update"],
  ["Space on a grip", "Pick up or drop a row, group, column or widget; arrows move it"],
] as const;

const typing = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.closest("[role=dialog],[role=menu],[role=listbox]") !== null);

/** Global keys. Single letters are ignored while typing or inside a dialog, menu or list. */
export function Shortcuts() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let chord = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const go = { h: "/", w: "/my-work", i: "/inbox", n: "/notifications" } as Record<string, string>;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); router.push("/search"); return; }
      if (e.metaKey || e.ctrlKey || e.altKey || typing(e.target)) return;
      const key = e.key.toLowerCase();
      if (chord) {
        chord = false;
        clearTimeout(timer);
        if (go[key]) { e.preventDefault(); router.push(go[key]); }
        return;
      }
      if (e.key === "?") { e.preventDefault(); setOpen(true); }
      else if (e.key === "/") { e.preventDefault(); router.push("/search"); }
      else if (key === "n") {
        const add = Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find((b) => b.textContent?.trim() === "Add item");
        if (add) { e.preventDefault(); add.click(); }
      } else if (key === "g") {
        chord = true;
        timer = setTimeout(() => { chord = false; }, 1000);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); clearTimeout(timer); };
  }, [router]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>Single letters work when you are not typing in a field.</DialogDescription>
        </DialogHeader>
        <ul className="divide-y divide-border rounded-lg border border-border">
          {shortcuts.map(([keys, what]) => <li key={keys} className="flex items-center justify-between gap-3 px-3 py-2 text-sm"><span>{what}</span><Kbd>{keys}</Kbd></li>)}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
