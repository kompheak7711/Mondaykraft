import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-surface px-4 py-12">
      <div className="mb-8 text-xl font-bold tracking-tight">Taskraft</div>
      <div className="w-full max-w-sm rounded-lg border border-border bg-bg p-6 shadow-card">{children}</div>
    </main>
  );
}
