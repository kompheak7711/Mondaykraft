import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "cn";

export type Person = { id: string; name: string; avatarUrl?: string | null };

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "?";
}

const sizes = { 24: "size-6 text-[10px]", 28: "size-7 text-xs", 32: "size-8 text-xs", 40: "size-10 text-sm" } as const;
export type AvatarSize = keyof typeof sizes;

export function PersonAvatar({ person, size = 24, className }: { person: Person; size?: AvatarSize; className?: string }) {
  return (
    <Avatar className={cn(sizes[size], className)}>
      {person.avatarUrl ? <AvatarImage src={person.avatarUrl} alt="" /> : null}
      <AvatarFallback className="bg-brand-soft font-semibold text-brand-text">{initials(person.name)}</AvatarFallback>
    </Avatar>
  );
}

/** Up to `max` overlapping avatars, then "+n". The group's name lists everyone for screen readers. */
export function AvatarStack({ people, max = 5, size = 24, className }: { people: Person[]; max?: number; size?: AvatarSize; className?: string }) {
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  const names = people.map((p) => p.name).join(", ");
  return (
    <span role="group" aria-label={`${people.length} ${people.length === 1 ? "person" : "people"}: ${names}`} className={cn("inline-flex items-center", className)}>
      {shown.map((p, i) => (
        <PersonAvatar key={p.id} person={p} size={size} className={cn("ring-2 ring-bg", i > 0 && "-ml-2")} />
      ))}
      {rest > 0 ? (
        <span aria-hidden className={cn("-ml-2 inline-flex items-center justify-center rounded-pill bg-surface-2 font-medium text-text-muted ring-2 ring-bg", sizes[size])}>
          +{rest}
        </span>
      ) : null}
    </span>
  );
}
