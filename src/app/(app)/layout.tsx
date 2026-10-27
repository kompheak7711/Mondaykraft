import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { pickWorkspace, WORKSPACE_COOKIE } from "@/lib/workspace";
import { Shell } from "@/components/shell/shell";
import { Onboarding } from "@/components/shell/onboarding";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: workspaces }] = await Promise.all([
    supabase.from("profiles").select("id, name, email, avatar_url, theme").eq("id", user.id).single(),
    supabase.from("workspaces").select("id, name, color, timezone").is("deleted_at", null).order("created_at"),
  ]);
  const current = pickWorkspace((await cookies()).get(WORKSPACE_COOKIE)?.value, workspaces ?? []);
  if (!current || !profile) return <Onboarding name={profile?.name ?? ""} />;

  const [{ data: boards }, { data: folders }, { data: dashboards }, { data: favorites }, { data: membership }, { count: unread }] = await Promise.all([
    supabase.from("boards").select("id, name, folder_id, kind, position, archived_at").eq("workspace_id", current.id).is("deleted_at", null).order("position"),
    supabase.from("folders").select("id, name, color, parent_folder_id, position").eq("workspace_id", current.id).order("position"),
    supabase.from("dashboards").select("id, name, folder_id, kind").eq("workspace_id", current.id).is("deleted_at", null).order("created_at"),
    supabase.from("favorites").select("board_id, dashboard_id, position").order("position"),
    supabase.from("workspace_members").select("role").eq("workspace_id", current.id).eq("user_id", user.id).single(),
    supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null),
  ]);

  return (
    <Shell
      profile={profile}
      workspaces={workspaces ?? []}
      current={current}
      role={membership?.role ?? "member"}
      boards={boards ?? []}
      folders={folders ?? []}
      dashboards={dashboards ?? []}
      favorites={favorites ?? []}
      unread={unread ?? 0}
    >
      {children}
    </Shell>
  );
}
