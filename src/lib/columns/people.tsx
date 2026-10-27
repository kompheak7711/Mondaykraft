"use client";

import { z } from "zod";
import { UserRound, UserRoundPlus } from "lucide-react";
import { AvatarStack, PersonAvatar } from "@/components/ui/avatar-stack";
import { CellButton } from "./shared";
import { OptionList } from "./pickers";
import type { BoardContext, CellProps, CellValue, Column, ColumnModule } from "./types";

const idsOf = (value: CellValue) => (Array.isArray(value?.ids) ? (value!.ids as string[]) : []);
const peopleOf = (value: CellValue, board: BoardContext) => idsOf(value).map((id) => board.members.find((m) => m.id === id) ?? { id, name: "Former member" });

function PeopleCell({ column, value, canEdit, onChange, variant, board }: CellProps) {
  const ids = idsOf(value);
  const people = peopleOf(value, board);
  const max = typeof column.settings.max === "number" ? column.settings.max : undefined;
  const toggle = (id: string, next: boolean) => {
    const set = next ? Array.from(new Set([...(max === 1 ? [] : ids), id])) : ids.filter((x) => x !== id);
    onChange(set.length ? { ids: set } : null);
  };
  return (
    <CellButton
      canEdit={canEdit}
      variant={variant}
      align="center"
      label={`${column.title}: ${people.length ? people.map((p) => p.name).join(", ") : "nobody"}`}
      className="justify-center"
      editor={() => (
        <OptionList
          options={board.members.map((m) => ({ id: m.id, label: m.name, leading: <PersonAvatar person={m} size={24} /> }))}
          selected={ids}
          onToggle={toggle}
          max={max}
          placeholder="Search people"
          empty="No one matches"
        />
      )}
    >
      {people.length ? (
        <AvatarStack people={people} size={24} max={4} />
      ) : (
        <span className="flex size-6 items-center justify-center rounded-pill border border-dashed border-border-strong text-text-muted" aria-hidden>
          <UserRoundPlus className="size-3.5" />
        </span>
      )}
      {variant === "field" && people.length ? <span className="ml-2 truncate text-sm">{people.map((p) => p.name).join(", ")}</span> : null}
    </CellButton>
  );
}

export const peopleModule: ColumnModule = {
  type: "people",
  label: "People",
  description: "Assign one or more teammates.",
  icon: UserRound,
  group: "essential",
  defaultSettings: () => ({}),
  schema: z.object({ ids: z.array(z.string().uuid()).min(1) }),
  toText: (value, _c, board) => peopleOf(value, board).map((p) => p.name).sort().join(", "),
  sortKey: (value, _c, board) => peopleOf(value, board).map((p) => p.name).sort().join(", ") || null,
  filterOps: [
    { id: "is", label: "is", operand: "people" },
    { id: "is_not", label: "is not", operand: "people" },
    { id: "is_empty", label: "is empty", operand: "none" },
    { id: "not_empty", label: "is not empty", operand: "none" },
  ],
  matches: (value, op, operand) => {
    const ids = idsOf(value);
    const set = Array.isArray(operand) ? (operand as string[]) : [];
    switch (op) {
      case "is": return set.length === 0 || set.some((id) => ids.includes(id));
      case "is_not": return !set.some((id) => ids.includes(id));
      case "is_empty": return ids.length === 0;
      case "not_empty": return ids.length > 0;
      default: return true;
    }
  },
  summaries: ["none"],
  groupKey: (value, _c, board) => {
    const p = peopleOf(value, board)[0];
    return p ? { key: p.id, label: p.name } : { key: "", label: "Unassigned" };
  },
  Cell: PeopleCell,
};
