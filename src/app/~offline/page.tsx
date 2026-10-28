import { WifiOff } from "lucide-react";

export const metadata = { title: "Offline" };

/** Shown by the service worker when a page is requested with no connection. */
export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center">
      <WifiOff className="size-8 text-text-muted" aria-hidden />
      <h1 className="text-lg font-semibold">You&apos;re offline</h1>
      <p className="max-w-sm text-sm text-text-muted">This page isn&apos;t saved on this device yet. Boards you opened before will load once you&apos;re back online, and any edits you made are kept until then.</p>
    </main>
  );
}
