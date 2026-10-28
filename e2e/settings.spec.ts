import { test, expect, login, openDemoBoard } from "./helpers";

test.describe("F14 settings and shortcuts", () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test("global shortcuts: ? lists them, ⌘K searches, N adds an item", async ({ page, axe }) => {
    await page.keyboard.press("Shift+?");
    await expect(page.getByRole("dialog", { name: "Keyboard shortcuts" })).toBeVisible();
    await axe();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.keyboard.press("Meta+k");
    await page.waitForURL(/\/search/);
    await openDemoBoard(page);
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.keyboard.press("n");
    await expect(page.getByRole("textbox", { name: "Add item" })).toBeFocused();
    await page.keyboard.type("?");
    await expect(page.getByRole("dialog")).toHaveCount(0); // typing in a field never triggers a shortcut
  });

  test("an owner renames the workspace and renames it back", async ({ page }) => {
    await page.goto("/settings");
    const name = page.getByLabel("Workspace name");
    const original = await name.inputValue();
    await name.fill(`${original} renamed`);
    await page.getByRole("button", { name: "Rename workspace" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Saved." })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Workspace" }).getByText(`${original} renamed`)).toBeVisible();
    await name.fill(original);
    await page.getByRole("button", { name: "Rename workspace" }).click();
    await expect(page.getByRole("navigation", { name: "Workspace" }).getByText(original, { exact: true })).toBeVisible();
  });
});
