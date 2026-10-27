"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WORKSPACE_COOKIE } from "@/lib/workspace";

export type FormState = { error?: string; message?: string; link?: string };

export async function markRead(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  if (id) await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id).is("read_at", null);
  revalidatePath("/", "layout");
}

export async function markAllRead() {
  const supabase = await createClient();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
  revalidatePath("/", "layout");
}

export async function updateProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const name = String(formData.get("name") ?? "").trim();
  const timezone = String(formData.get("timezone") ?? "UTC");
  const title = String(formData.get("title") ?? "").trim() || null;
  const muted = formData.getAll("mute").map(String);
  if (!name) return { error: "Your name can't be empty." };
  const { error } = await supabase.from("profiles").update({ name, timezone, title, notification_prefs: { muted } }).eq("id", user.id);
  if (error) return { error: "Could not save your profile. Try again." };
  revalidatePath("/", "layout");
  return { message: "Saved." };
}

export async function inviteMember(_prev: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "member");
  const workspaceId = String(formData.get("workspaceId") ?? "");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Enter an email address like ben@example.com." };
  const { data, error } = await supabase.from("invites").insert({ workspace_id: workspaceId, email, role: role as "admin" | "member" | "viewer", invited_by: user.id }).select("token").single();
  if (error || !data) return { error: error?.code === "23505" ? "That person already has an open invite." : "Could not create the invite. Only owners and admins can invite." };
  revalidatePath("/members");
  // No email is sent yet: the link is copied and shared by hand (D-015, until a sending domain exists).
  return { message: `Invite ready for ${email}. Copy the link and send it to them.`, link: `/invite/${data.token}` };
}

export async function setMemberRole(formData: FormData) {
  const supabase = await createClient();
  const workspaceId = String(formData.get("workspaceId") ?? "");
  const userId = String(formData.get("userId") ?? "");
  const role = String(formData.get("role") ?? "member") as "owner" | "admin" | "member" | "viewer";
  await supabase.from("workspace_members").update({ role }).eq("workspace_id", workspaceId).eq("user_id", userId);
  revalidatePath("/members");
}

export async function revokeMembership(formData: FormData) {
  const supabase = await createClient();
  const workspaceId = String(formData.get("workspaceId") ?? "");
  const userId = String(formData.get("userId") ?? "");
  const { error } = await supabase.from("workspace_members").delete().eq("workspace_id", workspaceId).eq("user_id", userId);
  if (!error) revalidatePath("/", "layout");
}

export async function withdrawInvite(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("invites").delete().eq("id", String(formData.get("id") ?? ""));
  revalidatePath("/members");
}

export async function restoreThing(formData: FormData) {
  const supabase = await createClient();
  const kind = String(formData.get("kind") ?? "");
  const id = String(formData.get("id") ?? "");
  if (kind === "archived_board") await supabase.from("boards").update({ archived_at: null }).eq("id", id);
  else if (kind === "archived_group") await supabase.from("groups").update({ archived_at: null }).eq("id", id);
  else if (kind === "archived_item") await supabase.rpc("bulk_items", { p_action: "restore", p_ids: [id] });
  else await supabase.rpc("restore", { p_kind: kind, p_id: id });
  revalidatePath("/", "layout");
}

export async function acceptInviteAction(token: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("accept_invite", { p_token: token });
  if (error || !data) return { error: error?.message ?? "This invite is not valid." };
  (await cookies()).set(WORKSPACE_COOKIE, data, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  return { workspaceId: data };
}
