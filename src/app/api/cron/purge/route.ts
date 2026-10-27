import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Daily purge (Vercel Cron, or `curl -H "Authorization: Bearer $CRON_SECRET" /api/cron/purge`).
 * Rows older than 30 days leave the trash through purge_trash(); the files they owned are cleared from Storage here,
 * because deleting rows never deletes objects.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return new NextResponse("Unauthorized", { status: 401 });
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("purge_trash");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const result = data as { boards: number; groups: number; items: number; storage_paths: string[] };
  let cleared = 0;
  for (let i = 0; i < result.storage_paths.length; i += 100) {
    const batch = result.storage_paths.slice(i, i + 100);
    const { error: storageError } = await admin.storage.from("assets").remove(batch);
    if (!storageError) cleared += batch.length;
  }
  return NextResponse.json({ ...result, storage_cleared: cleared, ran_at: new Date().toISOString() });
}
