import { test as base, expect, type Page } from "@playwright/test";
import { login, openDemoBoard } from "./helpers";

// Plain test here: an offline browser logs network errors to the console on purpose.
const test = base;

test.describe("F03 offline and small screens", () => {
  test("an edit made offline is kept, shown as waiting, and synced when back online", async ({ page, context }) => {
    await login(page);
    await openDemoBoard(page);
    const row = page.getByRole("row").filter({ hasText: "Set up the test plan" });
    const current = (await row.getByRole("button", { name: /^Status:/ }).getAttribute("aria-label"))!.replace("Status: ", "");
    const next = current === "Stuck" ? "Done" : "Stuck";
    await context.setOffline(true);
    await row.getByRole("button", { name: /^Status:/ }).click();
    await page.getByRole("option", { name: new RegExp(`^${next}`) }).click();
    await expect(row.getByRole("button", { name: `Status: ${next}` })).toBeVisible();
    const badge = page.getByRole("status", { name: "Connection" });
    await expect(badge).toContainText(/Offline.*1 edit waiting/);
    await context.setOffline(false);
    await expect(badge).toBeHidden({ timeout: 15_000 });
    await page.reload();
    await expect(page.getByRole("row").filter({ hasText: "Set up the test plan" }).getByRole("button", { name: `Status: ${next}` })).toBeVisible();
  });

  test("the table becomes a card list on a phone", async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page: Page = await ctx.newPage();
    await login(page);
    await page.getByRole("button", { name: "Open navigation" }).click();
    await page.getByRole("navigation", { name: "Workspace" }).getByRole("link", { name: "Project tracker", exact: true }).first().click();
    await expect(page.getByRole("heading", { level: 1, name: "Project tracker" })).toBeVisible();
    await expect(page.getByRole("grid")).toHaveCount(0);
    const card = page.getByRole("listitem").filter({ hasText: "Write the project brief" });
    await expect(card).toBeVisible();
    await expect(card.getByRole("button", { name: /^Status:/ })).toBeVisible();
    await ctx.close();
  });
});
