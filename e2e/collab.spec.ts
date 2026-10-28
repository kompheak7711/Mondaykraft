import { test as base, expect, type Browser, type Page } from "@playwright/test";
import { Client } from "pg";
import { login, openDemoBoard, DEMO } from "./helpers";

const BEN = { email: "demo.ben@example.com", password: DEMO.password };
const VIV = { email: "demo.viv@example.com", password: DEMO.password };
const test = base;

async function userPage(browser: Browser, who: { email: string; password: string }): Promise<Page> {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await login(page, who.email, who.password);
  return page;
}

test.describe("F03 realtime and permissions", () => {
  test("two browsers see each other's edits live", async ({ browser }) => {
    const ana = await userPage(browser, DEMO);
    const ben = await userPage(browser, BEN);
    await openDemoBoard(ana);
    await openDemoBoard(ben);
    const row = (p: Page) => p.getByRole("row").filter({ hasText: "Build the first version" });
    await row(ana).getByRole("button", { name: /^Status:/ }).click();
    await ana.getByRole("option", { name: /^Stuck/ }).click();
    await expect(row(ben).getByRole("button", { name: "Status: Stuck" })).toBeVisible({ timeout: 10_000 });
    await row(ben).getByRole("button", { name: /^Status:/ }).click();
    await ben.getByRole("option", { name: /Working on it/ }).click();
    await expect(row(ben).getByRole("button", { name: "Status: Working on it" })).toBeVisible({ timeout: 15_000 });
    await expect(row(ana).getByRole("button", { name: "Status: Working on it" })).toBeVisible({ timeout: 15_000 });
    await ana.context().close();
    await ben.context().close();
  });

  test("a remote change waits while the other person is typing in the same cell", async ({ browser }) => {
    const ana = await userPage(browser, DEMO);
    const ben = await userPage(browser, BEN);
    await openDemoBoard(ana);
    await openDemoBoard(ben);
    // make sure a Text column exists
    if (!(await ana.getByRole("columnheader").filter({ has: ana.getByRole("button", { name: "Text", exact: true }) }).count())) {
      await ana.getByRole("button", { name: "Add column" }).first().click();
      await ana.getByRole("button", { name: /^Text\s*A short line/ }).click();
      await expect(ben.getByRole("columnheader").filter({ hasText: /^Text$/ }).first()).toBeVisible({ timeout: 10_000 });
    }
    const row = (p: Page) => p.getByRole("row").filter({ hasText: "Agree the timeline" });
    await row(ben).getByRole("button", { name: /^Text:/ }).first().click();
    const draft = ben.getByRole("textbox", { name: "Text" });
    await draft.fill("Ben is typing");
    await row(ana).getByRole("button", { name: /^Text:/ }).first().click();
    await ana.getByRole("textbox", { name: "Text" }).fill("Ana wrote this");
    await ana.keyboard.press("Enter");
    await ana.waitForTimeout(1500);
    await expect(draft).toHaveValue("Ben is typing");
    await ben.keyboard.press("Escape");
    await expect(row(ben).getByRole("button", { name: "Text: Ana wrote this. Press Enter to edit" })).toBeVisible({ timeout: 10_000 });
    await ana.context().close();
    await ben.context().close();
  });

  test("a viewer can read the board but every cell is locked", async ({ browser }) => {
    const viv = await userPage(browser, VIV);
    await openDemoBoard(viv);
    await expect(viv.getByRole("button", { name: "New item" })).toHaveCount(0);
    await expect(viv.getByRole("button", { name: /^Status:/ })).toHaveCount(0);
    await expect(viv.getByRole("gridcell").filter({ hasText: "Working on it" }).first()).toBeVisible();
    await viv.context().close();
  });

  test("a non-member cannot open a private board", async ({ browser }) => {
    const ana = await userPage(browser, DEMO);
    await openDemoBoard(ana, "Bug tracker");
    const url = ana.url();
    const setKind = async (label: string) => {
      await ana.getByRole("button", { name: "Board options" }).click();
      await ana.getByRole("menuitem", { name: "Permissions" }).hover();
      await ana.getByRole("menuitemradio", { name: new RegExp(label) }).click();
      await ana.keyboard.press("Escape");
    };
    await setKind("Private");
    const ben = await userPage(browser, BEN);
    await ben.goto(url);
    await expect(ben.getByRole("heading", { name: /don't have access|doesn't exist/ })).toBeVisible();
    await setKind("Main");
    await ben.goto(url);
    await expect(ben.getByRole("grid")).toBeVisible();
    await ana.context().close();
    await ben.context().close();
  });
});

test.describe("F03 scale", () => {
  test("a 2,000-item board stays virtualised and scrolls to the end", async ({ browser }) => {
    const db = new Client({ connectionString: process.env.SUPABASE_DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres" });
    await db.connect();
    const ws = (await db.query(`select id from workspaces where name = 'Taskraft demo'`)).rows[0]?.id;
    expect(ws).toBeTruthy();
    const existing = (await db.query(`select id from boards where workspace_id = $1 and name = 'Big board' and deleted_at is null`, [ws])).rows[0];
    if (!existing) {
      const ana = (await db.query(`select id from auth.users where email = $1`, [DEMO.email])).rows[0].id;
      await db.query(`select set_config('request.jwt.claim.sub', $1, false), set_config('role', 'authenticated', false)`, [ana]);
      const board = (await db.query(`select create_board($1, 'Big board', '{}', null) as id`, [ws])).rows[0].id;
      const group = (await db.query(`select id from groups where board_id = $1`, [board])).rows[0].id;
      const status = (await db.query(`select id from columns where board_id = $1 and type = 'status'`, [board])).rows[0].id;
      await db.query(`insert into items (board_id, group_id, name, position, created_by) select $1, $2, 'Row ' || g, g, $3 from generate_series(1, 2000) g`, [board, group, ana]);
      await db.query(`insert into column_values (item_id, column_id, value) select i.id, $2, jsonb_build_object('label_id', (array['todo','working','stuck','done'])[1 + (row_number() over (order by i.position)) % 4]) from items i where i.board_id = $1`, [board, status]);
    }
    await db.end();
    const ana = await userPage(browser, DEMO);
    await openDemoBoard(ana, "Big board");
    await expect(ana.getByRole("row").filter({ hasText: "Row 1" }).first()).toBeVisible();
    const rendered = await ana.getByRole("row").count();
    expect(rendered).toBeLessThan(200);
    const grid = ana.getByRole("grid");
    const t0 = Date.now();
    for (let i = 0; i < 20; i++) { await grid.evaluate((el) => el.parentElement!.scrollBy(0, 4000)); await ana.waitForTimeout(50); }
    expect(Date.now() - t0).toBeLessThan(8000);
    await expect.poll(async () => {
      await grid.evaluate((el) => { const p = el.parentElement!; p.scrollTop = p.scrollHeight; });
      await ana.waitForTimeout(400);
      return ana.evaluate(() => [...document.querySelectorAll("[role=row]")].slice(-6).map((r) => (r as HTMLElement).innerText.slice(0, 30)).join("|"));
    }, { timeout: 20_000 }).toContain("Row 2000");
    await ana.context().close();
  });
});
