// @vitest-environment node
// Database rules, run against local Supabase (supabase start). Skipped when the database is not reachable.
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const url = process.env.SUPABASE_DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const ANA = "aaaaaaaa-1111-1111-1111-111111111111";
const BEN = "aaaaaaaa-2222-2222-2222-222222222222";
const VIV = "aaaaaaaa-3333-3333-3333-333333333333";
let db: Client | null = null;

const asUser = (id: string | null) => db!.query(`select set_config('request.jwt.claim.sub', $1, true), set_config('role', $2, true)`, [id ?? "", id ? "authenticated" : "postgres"]);

beforeAll(async () => {
  const c = new Client({ connectionString: url });
  try { await c.connect(); db = c; } catch { db = null; }
  if (!db) return;
  await db.query("begin");
  await db.query(`insert into auth.users (id, email, raw_user_meta_data) values ($1,'t.ana@example.com','{"name":"Ana"}'),($2,'t.ben@example.com','{"name":"Ben"}'),($3,'t.viv@example.com','{"name":"Viv"}') on conflict do nothing`, [ANA, BEN, VIV]);
});
afterAll(async () => { if (db) { await db.query("rollback"); await db.end(); } });

async function setup() {
  await asUser(ANA);
  const ws = (await db!.query(`insert into workspaces (name, created_by) values ('T', $1) returning id`, [ANA])).rows[0].id as string;
  await asUser(null);
  await db!.query(`insert into workspace_members (workspace_id, user_id, role) values ($1,$2,'member'),($1,$3,'viewer')`, [ws, BEN, VIV]);
  await asUser(ANA);
  const board = (await db!.query(`select create_board($1, 'Board', '{}', null) as id`, [ws])).rows[0].id as string;
  const group = (await db!.query(`select id from groups where board_id = $1`, [board])).rows[0].id as string;
  const status = (await db!.query(`select id from columns where board_id = $1 and type = 'status'`, [board])).rows[0].id as string;
  return { ws, board, group, status };
}

describe.skipIf(!process.env.CI && false)("database rules", () => {
  it("move_rows keeps the asked order and renumbers when gaps close", async () => {
    if (!db) return;
    await db.query("savepoint s1");
    const { board, group } = await setup();
    const ids: string[] = [];
    for (const n of ["A", "B", "C", "D"]) ids.push((await db.query(`insert into items (board_id, group_id, name, position, created_by) values ($1,$2,$3,$4,$5) returning id`, [board, group, n, ids.length + 1, ANA])).rows[0].id);
    await db.query(`select move_rows('items', $1::uuid[], $2, $3)`, [[ids[3]], group, ids[0]]);
    let order = (await db.query(`select name from items where group_id = $1 order by position, created_at`, [group])).rows.map((r) => r.name);
    expect(order).toEqual(["A", "D", "B", "C"]);
    for (let i = 0; i < 25; i++) await db.query(`select move_rows('items', $1::uuid[], $2, $3)`, [[ids[2]], group, ids[0]]);
    order = (await db.query(`select name from items where group_id = $1 order by position, created_at`, [group])).rows.map((r) => r.name);
    expect(order).toEqual(["A", "C", "D", "B"]);
    await db.query("rollback to savepoint s1");
  });

  it("evaluates automation triggers, conditions and actions, with the loop guard", async () => {
    if (!db) return;
    await db.query("savepoint s2");
    const { board, group, status } = await setup();
    const done = (await db.query(`insert into groups (board_id, title, position) values ($1,'Done',2) returning id`, [board])).rows[0].id;
    await db.query(`insert into automations (board_id, name, trigger, conditions, actions, created_by) values ($1,'move', jsonb_build_object('type','status_changed','column_id',$2::text,'label_id','done'), '[{"type":"group_is","group_id":"${group}"}]', jsonb_build_array(jsonb_build_object('type','move_to_group','group_id',$3::text)), $4)`, [board, status, done, ANA]);
    const item = (await db.query(`insert into items (board_id, group_id, name, position, created_by) values ($1,$2,'X',1,$3) returning id`, [board, group, ANA])).rows[0].id;
    await db.query(`insert into column_values (item_id, column_id, value) values ($1,$2,'{"label_id":"working"}')`, [item, status]);
    expect((await db.query(`select group_id from items where id = $1`, [item])).rows[0].group_id).toBe(group);
    await db.query(`update column_values set value = '{"label_id":"done"}' where item_id = $1 and column_id = $2`, [item, status]);
    expect((await db.query(`select group_id from items where id = $1`, [item])).rows[0].group_id).toBe(done);
    expect((await db.query(`select count(*)::int as n from automation_runs where board_id = $1 and status = 'ok'`, [board])).rows[0].n).toBe(1);
    await db.query(`insert into automations (board_id, name, trigger, actions, created_by) values ($1,'A', jsonb_build_object('type','status_changed','column_id',$2::text,'label_id','todo'), jsonb_build_array(jsonb_build_object('type','change_status','column_id',$2::text,'label_id','stuck')), $3), ($1,'B', jsonb_build_object('type','status_changed','column_id',$2::text,'label_id','stuck'), jsonb_build_array(jsonb_build_object('type','change_status','column_id',$2::text,'label_id','todo')), $3)`, [board, status, ANA]);
    await db.query(`update column_values set value = '{"label_id":"todo"}' where item_id = $1 and column_id = $2`, [item, status]);
    expect((await db.query(`select count(*)::int as n from automation_runs where board_id = $1 and status = 'skipped' and error like 'loop guard%'`, [board])).rows[0].n).toBeGreaterThan(0);
    await db.query("rollback to savepoint s2");
  });

  it("recurring automations fire once per local day from the cron tick and never twice", async () => {
    if (!db) return;
    await db.query("savepoint s2b");
    const { board, group } = await setup();
    await db.query(`insert into automations (board_id, name, trigger, actions, created_by) values ($1,'daily', '{"type":"every","every":"day","at_time":"00:00"}', jsonb_build_array(jsonb_build_object('type','create_item','group_id',$2::text,'name','Stand-up {item}')), $3)`, [board, group, ANA]);
    await db.query("savepoint bad");
    await expect(db.query(`insert into automations (board_id, name, trigger, actions, created_by) values ($1,'bad', '{"type":"every","every":"fortnight"}', '[{"type":"create_item"}]', $2)`, [board, ANA])).rejects.toThrow(/day, week or month/);
    await db.query("rollback to savepoint bad");
    await asUser(null);
    expect((await db.query(`select public.run_date_automations() as n`)).rows[0].n).toBe(1);
    expect((await db.query(`select public.run_date_automations() as n`)).rows[0].n).toBe(0);
    const made = (await db.query(`select name, created_by from items where group_id = $1 and name like 'Stand-up%'`, [group])).rows;
    expect(made).toEqual([{ name: "Stand-up ", created_by: ANA }]);
    expect((await db.query(`select count(*)::int as n from automation_runs where board_id = $1 and status = 'ok' and item_id is null and fire_date is not null`, [board])).rows[0].n).toBe(1);
    await db.query("rollback to savepoint s2b");
  });

  it("permission rules: viewer reads but cannot write, non-member sees nothing, edit_assigned scopes to own items", async () => {
    if (!db) return;
    await db.query("savepoint s3");
    const { board, group, status } = await setup();
    const item = (await db.query(`insert into items (board_id, group_id, name, position, created_by) values ($1,$2,'Y',1,$3) returning id`, [board, group, ANA])).rows[0].id;
    await asUser(VIV);
    expect((await db.query(`select count(*)::int as n from items where board_id = $1`, [board])).rows[0].n).toBe(1);
    await expect(db.query(`insert into column_values (item_id, column_id, value) values ($1,$2,'{"label_id":"done"}')`, [item, status])).rejects.toThrow();
    await db.query("rollback to savepoint s3");
    await db.query("savepoint s3b");
    const t = await setup();
    const other = "aaaaaaaa-4444-4444-4444-444444444444";
    await asUser(null);
    await db.query(`insert into auth.users (id, email, raw_user_meta_data) values ($1,'t.out@example.com','{"name":"Out"}') on conflict do nothing`, [other]);
    await asUser(other);
    expect((await db.query(`select count(*)::int as n from boards where id = $1`, [t.board])).rows[0].n).toBe(0);
    await asUser(ANA);
    await db.query(`update boards set permission_set = 'edit_assigned' where id = $1`, [t.board]);
    const people = (await db.query(`select id from columns where board_id = $1 and type = 'people'`, [t.board])).rows[0].id;
    const mine = (await db.query(`insert into items (board_id, group_id, name, position, created_by) values ($1,$2,'mine',1,$3) returning id`, [t.board, t.group, ANA])).rows[0].id;
    const theirs = (await db.query(`insert into items (board_id, group_id, name, position, created_by) values ($1,$2,'theirs',2,$3) returning id`, [t.board, t.group, ANA])).rows[0].id;
    await db.query(`insert into column_values (item_id, column_id, value) values ($1,$2,$3)`, [mine, people, JSON.stringify({ ids: [BEN] })]);
    await asUser(BEN);
    const ok = await db.query(`update items set name = 'mine!' where id = $1`, [mine]);
    const no = await db.query(`update items set name = 'theirs!' where id = $1`, [theirs]);
    expect([ok.rowCount, no.rowCount]).toEqual([1, 0]);
    await db.query("rollback to savepoint s3b");
  });

  it("the cell validator rejects unknown labels and bad dates", async () => {
    if (!db) return;
    await db.query("savepoint s4");
    const { board, group, status } = await setup();
    const item = (await db.query(`insert into items (board_id, group_id, name, position, created_by) values ($1,$2,'Z',1,$3) returning id`, [board, group, ANA])).rows[0].id;
    await db.query("savepoint f1");
    await expect(db.query(`insert into column_values (item_id, column_id, value) values ($1,$2,'{"label_id":"nope"}')`, [item, status])).rejects.toThrow(/unknown label/);
    await db.query("rollback to savepoint f1");
    const date = (await db.query(`select id from columns where board_id = $1 and type = 'date'`, [board])).rows[0].id;
    await db.query("savepoint f2");
    await expect(db.query(`insert into column_values (item_id, column_id, value) values ($1,$2,'{"date":"soon"}')`, [item, date])).rejects.toThrow();
    await db.query("rollback to savepoint f2");
    await db.query("rollback to savepoint s4");
  });
});
