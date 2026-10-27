"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WORKSPACE_COOKIE } from "@/lib/workspace";
import { templates } from "@/lib/templates";

const year = 60 * 60 * 24 * 365;

export type ActionState = { error?: string };

export async function setCurrentWorkspace(workspaceId: string) {
  (await cookies()).set(WORKSPACE_COOKIE, workspaceId, { path: "/", maxAge: year, sameSite: "lax" });
  revalidatePath("/", "layout");
}

export async function createWorkspace(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Give the workspace a name." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const timezone = String(formData.get("timezone") ?? "UTC") || "UTC";
  const { data, error } = await supabase.from("workspaces").insert({ name, created_by: user.id, timezone }).select("id").single();
  if (error || !data) return { error: "Could not create the workspace. Try again." };
  (await cookies()).set(WORKSPACE_COOKIE, data.id, { path: "/", maxAge: year, sameSite: "lax" });
  redirect("/");
}

export async function createBoard(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const workspaceId = String(formData.get("workspaceId") ?? "");
  const folderId = String(formData.get("folderId") ?? "") || null;
  const templateKey = String(formData.get("template") ?? "");
  if (!name) return { error: "Give the board a name." };
  const supabase = await createClient();
  const definition = templates.find((t) => t.key === templateKey)?.definition ?? {};
  const { data, error } = await supabase.rpc("create_board", { p_workspace: workspaceId, p_name: name, p_definition: definition, p_folder: folderId ?? undefined });
  if (error || !data) return { error: "Could not create the board. Try again." };
  revalidatePath("/", "layout");
  redirect(`/boards/${data}`);
}

export async function createDashboard(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const workspaceId = String(formData.get("workspaceId") ?? "");
  if (!name) return { error: "Give the dashboard a name." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data, error } = await supabase.from("dashboards").insert({ name, workspace_id: workspaceId, created_by: user.id }).select("id").single();
  if (error || !data) return { error: "Could not create the dashboard. Try again." };
  revalidatePath("/", "layout");
  redirect(`/dashboards/${data.id}`);
}

export async function createFolder(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const workspaceId = String(formData.get("workspaceId") ?? "");
  if (!name) return { error: "Give the folder a name." };
  const supabase = await createClient();
  const { error } = await supabase.from("folders").insert({ name, workspace_id: workspaceId });
  if (error) return { error: "Could not create the folder. Try again." };
  revalidatePath("/", "layout");
  return {};
}

export async function toggleFavorite(kind: "board" | "dashboard", id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const column = kind === "board" ? "board_id" : "dashboard_id";
  const { data: existing } = await supabase.from("favorites").select("id").eq(column, id).maybeSingle();
  if (existing) await supabase.from("favorites").delete().eq("id", existing.id);
  else await supabase.from("favorites").insert(kind === "board" ? { user_id: user.id, board_id: id } : { user_id: user.id, dashboard_id: id });
  revalidatePath("/", "layout");
}
