import type { Metadata } from "next";
import { cookies } from "next/headers";
import { pickWorkspace, WORKSPACE_COOKIE } from "@/lib/workspace";
import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Profile and settings" };

/** S26: profile, time zone, theme, notification preferences, shortcuts. */
export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [{ data: profile }, { data: workspaces }] = await Promise.all([
    supabase.from("profiles").select("name, email, title, timezone, notification_prefs").eq("id", user!.id).single(),
    supabase.from("workspaces").select("id, name, timezone").is("deleted_at", null).order("created_at"),
  ]);
  const current = pickWorkspace((await cookies()).get(WORKSPACE_COOKIE)?.value, workspaces ?? []);
  const { data: membership } = current ? await supabase.from("workspace_members").select("role").eq("workspace_id", current.id).eq("user_id", user!.id).maybeSingle() : { data: null };
  const zones = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.("timeZone") ?? ["UTC"];
  const muted = ((profile?.notification_prefs as { muted?: string[] } | null)?.muted) ?? [];
  return (
    <div className="mx-auto w-full max-w-2xl space-y-8 p-4 sm:p-6">
      <div>
        <h1 className="text-xl font-bold">Profile and settings</h1>
        <p className="text-sm text-text-muted">{profile?.email}</p>
      </div>
      <SettingsForm profile={{ name: profile?.name ?? "", title: profile?.title ?? "", timezone: profile?.timezone ?? "UTC" }} zones={zones} muted={muted} workspace={current ? { ...current, role: membership?.role ?? "member" } : null} />
    </div>
  );
}
