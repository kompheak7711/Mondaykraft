import { readFile } from "node:fs/promises";
import { test, expect, login, openDemoBoard } from "./helpers";

const VIV = { email: "demo.viv@example.com", password: "taskraft-demo-1" };

test.describe("Fixes from the review research: export, wrap, hide view, recurring, revert", () => {
  test.beforeEach(async ({ page }) => { await login(page); await openDemoBoard(page); });

  test("F05-H3 exports the whole board as CSV from the board menu", async ({ page }) => {
    await page.getByRole("button", { name: "Board options" }).click();
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("menuitem", { name: "Export board (CSV)" }).click()]);
    const lines = (await readFile(await download.path(), "utf8")).replace(/^﻿/, "").trim().split(/\r?\n/);
    expect(download.suggestedFilename()).toBe("Project tracker.csv");
    expect(lines[0]).toMatch(/^Item,Group,Parent,/);
    expect(lines.length).toBeGreaterThanOrEqual(11);
    expect(lines.some((l) => l.startsWith("Kick-off meeting,Done,"))).toBe(true);
  });

  test("F14-H3 exports every board of the workspace as a zip from settings", async ({ page }) => {
    await page.goto("/settings");
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Export all boards" }).click()]);
    expect(download.suggestedFilename()).toBe("Taskraft demo.zip");
    const bytes = await readFile(await download.path());
    expect(bytes.subarray(0, 4)).toEqual(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
    expect(bytes.toString("latin1")).toContain("Project tracker.csv");
  });

  test("F03-H5 wrap text is a column setting that survives a reload", async ({ page }) => {
    const header = page.getByRole("columnheader").filter({ has: page.getByRole("button", { name: "Text", exact: true }) });
    const cell = page.getByRole("row").filter({ hasText: "Write the project brief" }).getByRole("button", { name: /^Text:/ });
    await cell.click();
    await page.getByRole("textbox", { name: "Text" }).fill("A long sentence that needs more than one line to read in full when the column is narrow");
    await page.keyboard.press("Enter");
    await expect(cell.locator("span").first()).toHaveCSS("white-space", "nowrap");
    await header.getByRole("button", { name: "Text column options" }).click();
    await page.getByRole("menuitem", { name: "Wrap text" }).click();
    await expect(cell.locator("span").first()).toHaveCSS("white-space", "pre-wrap");
    const tall = await cell.boundingBox();
    expect(tall!.height).toBeGreaterThan(40);
    await page.reload();
    await expect(page.getByRole("row").filter({ hasText: "Write the project brief" }).getByRole("button", { name: /^Text:/ }).locator("span").first()).toHaveCSS("white-space", "pre-wrap");
    await header.getByRole("button", { name: "Text column options" }).click();
    await page.getByRole("menuitem", { name: "Stop wrapping text" }).click();
    await expect(cell.locator("span").first()).toHaveCSS("white-space", "nowrap");
    await cell.click();
    await page.getByRole("textbox", { name: "Text" }).fill("");
    await page.keyboard.press("Enter");
  });

  test("F07-H5 a hidden view stays for editors and vanishes for a viewer", async ({ page, browser }) => {
    const nav = page.getByRole("navigation", { name: "Views" });
    await nav.getByRole("button", { name: "Kanban", exact: true }).click();
    await nav.getByRole("button", { name: "Kanban view options" }).click();
    await page.getByRole("menuitem", { name: "Hide view" }).click();
    await expect(nav.getByRole("button", { name: "Kanban (hidden from viewers)" })).toBeVisible();
    const ctx = await browser.newContext();
    const viewer = await ctx.newPage();
    await login(viewer, VIV.email, VIV.password);
    await openDemoBoard(viewer);
    const vnav = viewer.getByRole("navigation", { name: "Views" });
    await expect(vnav.getByRole("button", { name: /^Main table/ })).toBeVisible();
    await expect(vnav.getByRole("button", { name: /Kanban/ })).toHaveCount(0);
    await ctx.close();
    await nav.getByRole("button", { name: "Kanban view options" }).click();
    await page.getByRole("menuitem", { name: "Show view" }).click();
    await expect(nav.getByRole("button", { name: "Kanban", exact: true })).toBeVisible();
    await nav.getByRole("button", { name: /^Main table/ }).click();
  });

  test("F08-H2 a recurring automation is created from the starter and described in plain words", async ({ page, axe }) => {
    await page.getByRole("link", { name: "Automate" }).click();
    await page.getByRole("tab", { name: "Create" }).click();
    await page.getByRole("button", { name: /^Every week, create an item/ }).click();
    await expect(page.getByLabel("Trigger")).toHaveValue("every");
    await expect(page.getByLabel("Weekday")).toHaveValue("1");
    await page.getByLabel("Repeat").selectOption("month");
    await page.getByLabel("Day of month").fill("15");
    await page.getByLabel("Time").fill("08:30");
    await axe();
    await page.getByRole("button", { name: "Create automation" }).click();
    const row = page.getByRole("listitem").filter({ hasText: "Weekly item" });
    await expect(row).toContainText("Every month on day 15 at 08:30, then create an item");
    await row.getByRole("button", { name: "Remove Weekly item" }).click();
    await expect(row).toHaveCount(0);
  });

  test("F10-H2 reverts a cell change from the activity log", async ({ page }) => {
    const row = page.getByRole("row").filter({ hasText: "Agree the timeline" });
    const cell = row.getByRole("button", { name: /^Text:/ });
    const [one, two] = [`one ${Date.now()}`, `two ${Date.now()}`];
    for (const v of [one, two]) {
      await cell.click();
      await page.getByRole("textbox", { name: "Text" }).fill(v);
      await page.keyboard.press("Enter");
      await expect(row.getByRole("button", { name: `Text: ${v}. Press Enter to edit` })).toBeVisible();
    }
    await page.getByRole("link", { name: "Activity" }).click();
    const log = page.getByRole("dialog", { name: "Activity log" });
    await log.getByRole("button", { name: `Revert: Text: ${one} → ${two}` }).click();
    await expect(log.getByRole("button", { name: `Revert: Text: ${two} → ${one}` })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(row.getByRole("button", { name: `Text: ${one}. Press Enter to edit` })).toBeVisible();
    await cell.click();
    await page.getByRole("textbox", { name: "Text" }).fill("");
    await page.keyboard.press("Enter");
    await expect(row.getByRole("button", { name: "Text: empty. Press Enter to edit" })).toBeVisible();
  });
});
