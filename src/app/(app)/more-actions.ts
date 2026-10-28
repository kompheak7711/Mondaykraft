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
  const patch: { name: string; timezone: string; title: string | null; notification_prefs: { muted: string[] }; avatar_url?: string | null } = { name, timezone, title, notification_prefs: { muted } };
  // Photo: one object per person at avatars/{uid}/avatar (RLS keeps people in their own folder); the public URL is cache-busted on change.
  const avatar = formData.get("avatar");
  const path = `${user.id}/avatar`;
  if (formData.get("removeAvatar")) {
    await supabase.storage.from("avatars").remove([path]);
    patch.avatar_url = null;
  } else if (avatar instanceof File && avatar.size > 0) {
    if (avatar.size > 2 * 1024 * 1024) return { error: "The photo is over 2 MB." };
    if (!/^image\/(png|jpeg|webp|gif)$/.test(avatar.type)) return { error: "Use a PNG, JPEG, WebP or GIF." };
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, avatar, { upsert: true, contentType: avatar.type, cacheControl: "3600" });
    if (upErr) return { error: "Could not upload the photo. Try again." };
    patch.avatar_url = `${supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl}?v=${Date.now()}`;
  }
  const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
  if (error) return { error: "Could not save your profile. Try again." };
  revalidatePath("/", "layout");
  return { message: "Saved." };
}

export async function updateWorkspace(_prev: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const id = String(formData.get("workspaceId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const timezone = String(formData.get("timezone") ?? "UTC");
  if (!name) return { error: "The workspace needs a name." };
  const { data, error } = await supabase.from("workspaces").update({ name, timezone }).eq("id", id).select("id");
  if (error || !data?.length) return { error: "Could not rename the workspace. Only owners and admins can." };
  revalidatePath("/", "layout");
  return { message: "Saved." };
}

/** Owners only, and never the last workspace: there would be no page left to restore it from. */
export async function trashWorkspace(_prev: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const id = String(formData.get("workspaceId") ?? "");
  const [{ data: me }, { count }] = await Promise.all([
    supabase.from("workspace_members").select("role").eq("workspace_id", id).eq("user_id", user.id).maybeSingle(),
    supabase.from("workspaces").select("id", { count: "exact", head: true }).is("deleted_at", null),
  ]);
  if (me?.role !== "owner") return { error: "Only a workspace owner can do that." };
  if ((count ?? 0) <= 1) return { error: "Create another workspace first; you can't trash the only one you have." };
  const { error } = await supabase.from("workspaces").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) return { error: "Could not move the workspace to the trash." };
  (await cookies()).set(WORKSPACE_COOKIE, "", { path: "/", maxAge: 0 });
  revalidatePath("/", "layout");
  redirect("/");
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
  if (kind === "workspace") await supabase.from("workspaces").update({ deleted_at: null }).eq("id", id);
  else if (kind === "archived_board") await supabase.from("boards").update({ archived_at: null }).eq("id", id);
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
