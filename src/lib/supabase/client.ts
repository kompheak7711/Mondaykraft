import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/db/types";
import { supabaseKey, supabaseUrl } from "./env";

let browserClient: ReturnType<typeof createBrowserClient<Database>> | undefined;

/** One client per browser tab. Safe to call from any client component. */
export function createClient() {
  browserClient ??= createBrowserClient<Database>(supabaseUrl, supabaseKey);
  return browserClient;
}
