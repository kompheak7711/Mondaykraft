"use client";

import { z } from "zod";
import { Clock, History } from "lucide-react";
import { PersonAvatar } from "@/components/ui/avatar-stack";
import { formatRelative } from "@/lib/format";
import type { CellProps, ColumnModule } from "./types";

function CreationLogCell({ item, board, variant }: CellProps) {
  const who = board.members.find((m) => m.id === item.created_by);
  return (
    <div className={variant === "field" ? "flex min-h-8 items-center gap-2 px-2 text-sm" : "flex h-full w-full items-center gap-2 px-2 text-xs text-text-muted"} title={new Date(item.created_at).toLocaleString()}>
      {who ? <PersonAvatar person={who} size={24} /> : null}
      <span className="truncate">{formatRelative(item.created_at)}</span>
    </div>
  );
}

function LastUpdatedCell({ item, variant }: CellProps) {
  return (
    <div className={variant === "field" ? "flex min-h-8 items-center px-2 text-sm" : "flex h-full w-full items-center px-2 text-xs text-text-muted"} title={new Date(item.updated_at).toLocaleString()}>
      <span className="truncate">{formatRelative(item.updated_at)}</span>
    </div>
  );
}

const derivedBase = {
  derived: true,
  defaultSettings: () => ({}),
  schema: z.never(),
  toText: () => "",
  filterOps: [],
  matches: () => true,
  summaries: ["none" as const],
};

export const creationLogModule: ColumnModule = {
  ...derivedBase,
  type: "creation_log",
  label: "Creation log",
  description: "Who created the item and when.",
  icon: History,
  group: "more",
  sortKey: () => null,
  Cell: CreationLogCell,
};

export const lastUpdatedModule: ColumnModule = {
  ...derivedBase,
  type: "last_updated",
  label: "Last updated",
  description: "When the item last changed.",
  icon: Clock,
  group: "more",
  sortKey: () => null,
  Cell: LastUpdatedCell,
};
