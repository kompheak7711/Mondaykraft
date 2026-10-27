// Seeds a demo workspace: three people, three boards from the templates, an automation and a dashboard.
// Run against local Supabase: pnpm seed   (reads .env.local; needs SUPABASE_SECRET_KEY)
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { templates } from "../src/lib/templates";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY!;
const admin = createClient(url, secret, { auth: { persistSession: false } });
const PASSWORD = "taskraft-demo-1";
const people = [
  { email: "demo.ana@example.com", name: "Ana Lima" },
  { email: "demo.ben@example.com", name: "Ben Okafor" },
  { email: "demo.viv@example.com", name: "Viv Chen" },
];

async function ensureUser(p: { email: string; name: string }) {
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const found = data.users.find((u) => u.email === p.email);
  if (found) return found.id;
  const { data: created, error } = await admin.auth.admin.createUser({ email: p.email, password: PASSWORD, email_confirm: true, user_metadata: { name: p.name } });
  if (error) throw error;
  return created.user.id;
}

async function main() {
  const ids = await Promise.all(people.map(ensureUser));
  const ana = createClient(url, anon, { auth: { persistSession: false } });
  const { error: signInError } = await ana.auth.signInWithPassword({ email: people[0].email, password: PASSWORD });
  if (signInError) throw signInError;

  const { data: existing } = await ana.from("workspaces").select("id").eq("name", "Taskraft demo").maybeSingle();
  if (existing) { console.log("Demo workspace already exists:", existing.id); return; }
  const { data: ws, error: wsErr } = await ana.from("workspaces").insert({ name: "Taskraft demo", created_by: ids[0], timezone: "UTC" }).select("id").single();
  if (wsErr || !ws) throw wsErr;
  await admin.from("workspace_members").upsert([{ workspace_id: ws.id, user_id: ids[1], role: "member" }, { workspace_id: ws.id, user_id: ids[2], role: "viewer" }]);

  const boardIds: string[] = [];
  for (const key of ["project-tracker", "content-calendar", "bug-tracker"]) {
    const t = templates.find((x) => x.key === key)!;
    const { data: boardId, error } = await ana.rpc("create_board", { p_workspace: ws.id, p_name: t.name, p_definition: t.definition as never });
    if (error || !boardId) throw error;
    boardIds.push(boardId);
  }
  // assign Ben on the first board's first item
  const { data: cols } = await ana.from("columns").select("id, type").eq("board_id", boardIds[0]);
  const { data: items } = await ana.from("items").select("id").eq("board_id", boardIds[0]).is("parent_item_id", null).limit(2);
  const peopleCol = cols?.find((c) => c.type === "people");
  const statusCol = cols?.find((c) => c.type === "status");
  if (peopleCol && items?.length) await ana.from("column_values").upsert({ item_id: items[0].id, column_id: peopleCol.id, board_id: boardIds[0], value: { ids: [ids[1]] } as never }, { onConflict: "item_id,column_id" });
  // an automation: done items notify the creator
  if (statusCol) {
    const { data: groups } = await ana.from("groups").select("id").eq("board_id", boardIds[0]).order("position");
    await ana.from("automations").insert({ board_id: boardIds[0], name: "Done items move to the last group", created_by: ids[0],
      trigger: { type: "status_changed", column_id: statusCol.id, label_id: "done" } as never, conditions: [] as never,
      actions: [{ type: "move_to_group", group_id: groups![groups!.length - 1].id }, { type: "notify", to: "creator", message: "{item} is done on {board}" }] as never });
  }
  // a dashboard over all three boards
  const { data: dash } = await ana.from("dashboards").insert({ workspace_id: ws.id, name: "Team overview", created_by: ids[0] }).select("id").single();
  if (dash) {
    await ana.from("dashboard_boards").insert(boardIds.map((b) => ({ dashboard_id: dash.id, board_id: b })));
    const { data: allCols } = await ana.from("columns").select("id, board_id, type").in("board_id", boardIds).eq("scope", "item");
    const statusSources = boardIds.map((b) => ({ board_id: b, column_id: allCols?.find((c) => c.board_id === b && c.type === "status")?.id })).filter((s) => s.column_id);
    await ana.from("widgets").insert([
      { dashboard_id: dash.id, type: "battery", title: "Progress", settings: { sources: statusSources } as never, layout: { x: 0, y: 0, w: 6, h: 3 } as never },
      { dashboard_id: dash.id, type: "chart", title: "By status", settings: { sources: statusSources } as never, layout: { x: 6, y: 0, w: 6, h: 4 } as never },
    ]);
  }
  console.log(`Seeded workspace ${ws.id} with ${boardIds.length} boards. Log in as ${people[0].email} / ${PASSWORD}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
