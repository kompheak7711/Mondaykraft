import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "cn";

type Props = Omit<ComponentProps<typeof Button>, "size"> & {
  "aria-label": string;
  /** A count shows a numbered badge; true shows a dot. Put the count in aria-label too. */
  badge?: number | boolean;
  size?: "sm" | "md" | "lg";
};

export function IconButton({ badge, size = "md", variant = "ghost", className, children, ...props }: Props) {
  const sz = size === "sm" ? "icon-sm" : size === "lg" ? "icon-lg" : "icon";
  return (
    <Button variant={variant} size={sz} className={cn("relative", className)} {...props}>
      {children}
      {badge ? (
        <span
          aria-hidden
          className={cn(
            "absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-pill bg-danger px-1 text-[10px] font-semibold text-on-brand",
            badge === true && "h-2 min-w-2 px-0",
          )}
        >
          {typeof badge === "number" ? (badge > 99 ? "99+" : badge) : null}
        </span>
      ) : null}
    </Button>
  );
}
