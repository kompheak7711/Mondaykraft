"use client";

import { useState, type ReactNode } from "react";
import { Check, Plus } from "lucide-react";
import { cn } from "cn";
import { Input } from "@/components/ui/input";

export type PickOption = { id: string; label: string; color?: string; leading?: ReactNode };

/**
 * Search + toggle list used by people, dropdown and tags. Selected options sort first.
 * `max` 1 turns it into a single pick that closes after choosing.
 */
export function OptionList({
  options, selected, onToggle, max, onCreate, placeholder = "Search...", empty = "Nothing matches", renderChip,
}: {
  options: PickOption[];
  selected: string[];
  onToggle: (id: string, next: boolean) => void;
  max?: number;
  onCreate?: (label: string) => Promise<string | null> | string | null;
  placeholder?: string;
  empty?: string;
  renderChip?: (o: PickOption) => ReactNode;
}) {
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  const needle = q.trim().toLowerCase();
  const list = options
    .filter((o) => !needle || o.label.toLowerCase().includes(needle))
    .sort((a, b) => Number(selected.includes(b.id)) - Number(selected.includes(a.id)));
  const canCreate = Boolean(onCreate && needle && !options.some((o) => o.label.toLowerCase() === needle));
  const full = max !== undefined && max > 1 && selected.length >= max;

  const create = async () => {
    if (!onCreate || !needle) return;
    setCreating(true);
    const id = await onCreate(q.trim());
    setCreating(false);
    if (id) {
      if (max === 1) selected.forEach((s) => onToggle(s, false));
      onToggle(id, true);
      setQ("");
    }
  };

  return (
    <div className="space-y-2">
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} aria-label={placeholder} className="h-8" autoFocus
        onKeyDown={(e) => { if (e.key === "Enter" && canCreate) { e.preventDefault(); create(); } }} />
      <ul role="listbox" aria-multiselectable={max !== 1} className="max-h-64 space-y-0.5 overflow-y-auto">
        {list.map((o) => {
          const on = selected.includes(o.id);
          return (
            <li key={o.id}>
              <button
                type="button"
                role="option"
                aria-selected={on}
                disabled={!on && full}
                onClick={() => {
                  if (max === 1 && !on) selected.forEach((s) => onToggle(s, false));
                  onToggle(o.id, !on);
                }}
                className={cn("flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-sm hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50", on && "bg-brand-soft")}
              >
                {o.leading}
                {renderChip ? renderChip(o) : <span className="truncate">{o.label}</span>}
                {on ? <Check className="ml-auto size-4 shrink-0 text-brand-text" aria-hidden /> : null}
              </button>
            </li>
          );
        })}
        {list.length === 0 && !canCreate ? <li className="px-2 py-3 text-sm text-text-muted">{empty}</li> : null}
        {canCreate ? (
          <li>
            <button type="button" onClick={create} disabled={creating} className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-sm text-brand-text hover:bg-surface-2">
              <Plus className="size-4" aria-hidden /> Create “{q.trim()}”
            </button>
          </li>
        ) : null}
      </ul>
    </div>
  );
}
