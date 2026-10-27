import type { ComponentProps } from "react";
import { Check } from "lucide-react";
import { cn } from "cn";

export const LABEL_COLORS = ["green", "orange", "red", "blue", "purple", "teal", "yellow", "pink", "gray", "brown", "lime", "sky"] as const;
export type LabelColor = (typeof LABEL_COLORS)[number];

export const labelBg: Record<LabelColor, string> = {
  green: "bg-label-green",
  orange: "bg-label-orange",
  red: "bg-label-red",
  blue: "bg-label-blue",
  purple: "bg-label-purple",
  teal: "bg-label-teal",
  yellow: "bg-label-yellow",
  pink: "bg-label-pink",
  gray: "bg-label-gray",
  brown: "bg-label-brown",
  lime: "bg-label-lime",
  sky: "bg-label-sky",
};

export function isLabelColor(value: unknown): value is LabelColor {
  return typeof value === "string" && (LABEL_COLORS as readonly string[]).includes(value);
}

type Props = ComponentProps<"span"> & {
  label?: string;
  color?: string;
  done?: boolean;
  /** Fill the parent cell instead of rendering a small chip. */
  fill?: boolean;
};

/** A status or priority label. Colour is never the only signal: the name is always shown. */
export function StatusChip({ label, color, done, fill, className, ...props }: Props) {
  const size = fill ? "h-full w-full" : "h-6 px-2";
  if (!label) {
    return (
      <span
        className={cn("inline-flex items-center justify-center rounded-sm border border-dashed border-border-strong bg-surface-2 text-xs text-text-muted", size, className)}
        {...props}
      />
    );
  }
  return (
    <span
      className={cn("inline-flex items-center justify-center gap-1 rounded-sm text-xs font-medium text-on-brand", labelBg[isLabelColor(color) ? color : "gray"], size, className)}
      {...props}
    >
      {done ? <Check className="size-3 shrink-0" aria-hidden /> : null}
      <span className="truncate">{label}</span>
    </span>
  );
}
