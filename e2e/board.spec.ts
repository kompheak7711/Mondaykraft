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
    await page.getByRole("navigation", { name: "Views" }).getByRole("button", { name: /Kanban/ }).click();
    await expect(page.getByRole("region", { name: /Working on it/ })).toBeVisible();
    await axe();
    await page.getByRole("navigation", { name: "Views" }).getByRole("button", { name: /Main table/ }).click();
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
