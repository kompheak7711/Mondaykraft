import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { acceptInviteAction } from "@/app/(app)/more-actions";

export const metadata: Metadata = { title: "Join a workspace" };

/** F01 / F11: the invite link. Signed-out visitors log in first and come straight back here. */
export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/invite/${token}`)}`);
  const result = await acceptInviteAction(token);
  if ("workspaceId" in result) redirect("/");
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-surface px-4 py-12">
      <div className="w-full max-w-sm space-y-4 rounded-lg border border-border bg-bg p-6 text-center shadow-card">
        <h1 className="text-lg font-semibold">This invite didn&apos;t work</h1>
        <p className="text-sm text-text-muted">{result.error?.includes("different email") ? `It was sent to another email address. You are signed in as ${user.email}.` : "It may have expired or already been used. Ask the person who invited you for a new link."}</p>
        <div className="flex justify-center gap-3 text-sm">
          <Link href="/" className="font-medium text-brand-text hover:underline">Go to my workspace</Link>
          <Link href={`/login?next=${encodeURIComponent(`/invite/${token}`)}`} className="font-medium text-brand-text hover:underline">Log in as someone else</Link>
        </div>
      </div>
    </main>
  );
}
