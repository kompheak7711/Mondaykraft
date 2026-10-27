import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";
import { supabaseUrl } from "./env";

/** Service-role client. Server only, for jobs that act for no user (the purge cron). Never import from client code. */
export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SECRET_KEY is not set");
  return createSupabaseClient<Database>(supabaseUrl, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
