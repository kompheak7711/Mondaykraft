import Link from "next/link";

// Placeholder until /replica-build adds the workspace shell (S02).
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-xl font-bold">Taskraft Management</h1>
      <p className="max-w-md text-sm text-text-muted">Boards, items and automations for a small team working together in real time. The app shell arrives in the next build step.</p>
      <Link href="/design" className="text-sm font-medium text-brand-text underline-offset-4 hover:underline">
        Design system
      </Link>
    </main>
  );
}
