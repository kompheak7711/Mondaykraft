"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "cn";

const options = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  // true after hydration only, so the server and first client render agree
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const current = mounted ? (theme ?? "system") : "system";
  return (
    <div role="radiogroup" aria-label="Theme" className={cn("inline-flex rounded-md border border-border bg-surface p-0.5", className)}>
      {options.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={current === value}
          onClick={() => setTheme(value)}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-sm px-3 text-sm font-medium text-text-muted transition-colors hover:text-text",
            current === value && "bg-bg text-text shadow-card",
          )}
        >
          <Icon className="size-4" aria-hidden />
          {label}
        </button>
      ))}
    </div>
  );
}
