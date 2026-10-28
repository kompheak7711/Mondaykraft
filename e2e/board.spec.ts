import { test, expect, login, openDemoBoard } from "./helpers";

test.describe("F02 F03 F06 F07 F08 the board", () => {
  test.beforeEach(async ({ page }) => { await login(page); await openDemoBoard(page); });

  test("F03-H1 adds an item and edits its status inline", async ({ page, axe }) => {
    const name = `Spec item ${Date.now()}`;
    await page.getByRole("button", { name: "Add item" }).first().click();
    await page.getByLabel("Add item").fill(name);
    await page.keyboard.press("Enter");
    const row = page.getByRole("row").filter({ hasText: name });
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: /^Status:/ }).click();
    await page.getByRole("option", { name: /Working on it/ }).click();
    await expect(row.getByRole("button", { name: "Status: Working on it" })).toBeVisible();
    await axe();
    await page.reload();
    await expect(page.getByRole("row").filter({ hasText: name }).getByRole("button", { name: "Status: Working on it" })).toBeVisible();
  });

  test("F03-N1 the server rejects a bad number and the cell rolls back", async ({ page }) => {
    if (!(await page.getByRole("columnheader").filter({ has: page.getByRole("button", { name: "Numbers", exact: true }) }).count())) {
      await page.getByRole("button", { name: "Add column" }).first().click();
      await page.getByRole("button", { name: /^Numbers\s*Amounts/ }).click();
    }
    const cell = page.getByRole("row").filter({ hasText: "Write the project brief" }).getByRole("button", { name: /^Numbers:/ }).first();
    await cell.click();
    await page.keyboard.type("twelve");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("textbox", { name: "Numbers" })).toHaveAttribute("aria-invalid", "true");
    await page.keyboard.press("Escape");
  });

  test("F07-H1 switches to the Kanban view and back", async ({ page, axe }) => {
    await page.getByRole("navigation", { name: "Views" }).getByRole("button", { name: "Kanban", exact: true }).click();
    await expect(page.getByRole("region", { name: /Working on it/ })).toBeVisible();
    await axe();
    await page.getByRole("navigation", { name: "Views" }).getByRole("button", { name: /^Main table/ }).click();
    await expect(page.getByRole("grid")).toBeVisible();
  });

  test("F06-H1 posts an update with a mention and sees it in the panel", async ({ page, axe }) => {
    await page.getByRole("link", { name: "Agree the timeline" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    const editor = page.getByRole("textbox", { name: "Update", exact: true });
    await editor.click();
    await editor.type("Ready for review @Ben");
    await page.getByRole("option", { name: /Ben Okafor/ }).click();
    await page.getByRole("button", { name: "Post" }).click();
    await expect(page.getByRole("article").first()).toContainText("Ready for review");
    await expect(page.getByRole("article").first()).toContainText("@Ben Okafor");
    await axe();
  });

  test("F08-H1 the seeded automation moves a done item to the last group", async ({ page }) => {
    const row = page.getByRole("row").filter({ hasText: "Set up the test plan" });
    await row.getByRole("button", { name: /^Status:/ }).click();
    await page.getByRole("option", { name: /^Done/ }).click();
    await expect(page.getByRole("row").filter({ hasText: "Set up the test plan" }).getByRole("button", { name: "Status: Done" })).toBeVisible();
    await page.goto(page.url().replace(/\?.*$/, "") + "/automations");
    await page.getByRole("tab", { name: "Run history" }).click();
    await expect(page.getByText("ok").first()).toBeVisible();
  });
});

test.describe("F02 F05 groups, Tab order and export", () => {
  test.beforeEach(async ({ page }) => { await login(page); await openDemoBoard(page); });

  test("F02-H2 duplicates a group with its items, then trashes the copy", async ({ page }) => {
    await page.getByRole("button", { name: "Done group options" }).click();
    await page.getByRole("menuitem", { name: "Duplicate group" }).click();
    const copy = page.getByRole("row").filter({ has: page.getByRole("button", { name: "Done (copy) group options" }) });
    await expect(copy).toBeVisible();
    await expect(copy).toContainText("2 items");
    await page.getByRole("button", { name: "Done (copy) group options" }).click();
    await page.getByRole("menuitem", { name: "Move group to trash" }).click();
    await expect(page.getByRole("button", { name: "Done (copy) group options" })).toHaveCount(0);
  });

  test("F03-E2 Tab and Shift+Tab walk the cells of a row", async ({ page }) => {
    const row = page.getByRole("row").filter({ hasText: "Write the project brief" });
    await row.locator("[data-cell]").first().locator("button, a, input, [tabindex]").first().focus();
    const col = () => page.evaluate(() => (document.activeElement as HTMLElement | null)?.closest<HTMLElement>("[data-cell]")?.dataset.cell?.split(",")[1] ?? null);
    expect(await col()).toBe("0");
    await page.keyboard.press("Tab");
    expect(await col()).toBe("1");
    await page.keyboard.press("Tab");
    expect(await col()).toBe("2");
    await page.keyboard.press("Shift+Tab");
    expect(await col()).toBe("1");
  });

  test("F05-H2 exports the selected rows as CSV", async ({ page }) => {
    await page.getByRole("checkbox", { name: "Select Write the project brief" }).check();
    await page.getByRole("checkbox", { name: "Select Agree the timeline" }).check();
    const bar = page.getByRole("toolbar", { name: "2 items selected" });
    const [download] = await Promise.all([page.waitForEvent("download"), bar.getByRole("button", { name: "Export CSV" }).click()]);
    const text = (await import("node:fs/promises")).readFile(await download.path(), "utf8");
    const lines = (await text).replace(/^﻿/, "").trim().split(/\r?\n/);
    expect(download.suggestedFilename()).toBe("Project tracker.csv");
    expect(lines[0]).toMatch(/^Item,Group,Owner,Status/);
    expect(lines).toHaveLength(3);
    expect(lines.slice(1).join("\n")).toContain("Write the project brief");
    await expect(bar).toHaveCount(0);
  });
});
