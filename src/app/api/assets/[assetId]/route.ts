import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Redirects to a one-hour signed URL for a file the user may read (the asset row is behind RLS). */
export async function GET(_request: Request, { params }: { params: Promise<{ assetId: string }> }) {
  const { assetId } = await params;
  const supabase = await createClient();
  const { data: asset } = await supabase.from("assets").select("storage_path, name").eq("id", assetId).is("deleted_at", null).maybeSingle();
  if (!asset) return new NextResponse("Not found", { status: 404 });
  const { data, error } = await supabase.storage.from("assets").createSignedUrl(asset.storage_path, 3600);
  if (error || !data) return new NextResponse("Not available", { status: 404 });
  return NextResponse.redirect(data.signedUrl, { headers: { "Cache-Control": "private, max-age=600" } });
}
