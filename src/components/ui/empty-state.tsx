import type { ComponentType, ReactNode } from "react";
import { cn } from "cn";

type Props = {
  icon?: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

/** One icon, one title, one sentence, one action. */
export function EmptyState({ icon: Icon, title, description, action, className }: Props) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 px-6 py-16 text-center", className)}>
      {Icon ? <Icon className="size-10 text-text-muted" aria-hidden /> : null}
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-text">{title}</h2>
        {description ? <p className="max-w-sm text-sm text-text-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
