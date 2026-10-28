import { test, expect, login, openDemoBoard } from "./helpers";

// Drag and drop through the keyboard sensor: Space picks up, arrows move 25 px a step, Space drops.
// The sensor coalesces presses that land in the same frame, so each press gets a frame of its own, as a person's would.
const press = async (page: import("@playwright/test").Page, key: string, times = 1) => { for (let i = 0; i < times; i++) { await page.keyboard.press(key); await page.waitForTimeout(40); } };
test.describe("F02 F04 drag and drop", () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test("moves an item below the next one and a group below the next group", async ({ page, axe }) => {
    await openDemoBoard(page);
    const names = async () => page.locator("[data-item-name]").evaluateAll((els) => els.map((e) => e.textContent?.trim()));
    const before = await names();
    const first = before[0]!;
    await page.getByRole("button", { name: `Move ${first}`, exact: true }).focus();
    await press(page, "Space");
    await press(page, "ArrowDown", 2);
    await press(page, "Space");
    await expect.poll(names).toEqual([before[1], before[0], ...before.slice(2)]);
    await axe();

    const groups = page.getByRole("button", { name: /^Move .* group$/ });
    const firstGroup = (await groups.first().getAttribute("aria-label"))!;
    await groups.first().focus();
    await press(page, "Space");
    await press(page, "ArrowDown", 14);
    await press(page, "Space");
    await expect.poll(() => groups.nth(1).getAttribute("aria-label")).toBe(firstGroup);
    // put it back so the suite stays idempotent
    await groups.nth(1).focus();
    await press(page, "Space");
    await press(page, "ArrowUp", 14);
    await press(page, "Space");
    await expect.poll(() => groups.first().getAttribute("aria-label")).toBe(firstGroup);
  });

  test("moves a column to the right of its neighbour", async ({ page }) => {
    await openDemoBoard(page);
    const titles = async () => page.getByRole("columnheader").evaluateAll((els) => els.slice(1, 4).map((e) => e.textContent?.trim()));
    const before = await titles();
    const handle = page.getByRole("button", { name: /^Move .* column$/ }).first();
    await handle.focus();
    await press(page, "Space");
    await press(page, "ArrowRight", 8);
    await press(page, "Space");
    await expect.poll(titles).toEqual([before[1], before[0], before[2]]);
    // and back
    await page.getByRole("button", { name: /^Move .* column$/ }).nth(1).focus();
    await press(page, "Space");
    await press(page, "ArrowLeft", 8);
    await press(page, "Space");
    await expect.poll(titles).toEqual(before);
  });

  test("reorders dashboard widgets", async ({ page }) => {
    await page.getByRole("navigation", { name: "Workspace" }).getByRole("link", { name: "Team overview", exact: true }).click();
    const widgets = page.locator(".grid > section[aria-label]");
    const labels = async () => widgets.evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")));
    await expect(widgets.first()).toBeVisible();
    if ((await labels()).length < 2) {
      await page.getByRole("button", { name: "Add widget" }).click();
      await page.getByRole("button", { name: /^Numbers Sum/ }).click();
      await expect.poll(async () => (await labels()).length).toBeGreaterThan(1);
    }
    const before = await labels();
    await page.getByRole("button", { name: `Move ${before[0]}` }).focus();
    await press(page, "Space");
    await press(page, "ArrowRight");
    await press(page, "Space");
    await expect.poll(labels).toEqual([before[1], before[0], ...before.slice(2)]);
    await page.getByRole("button", { name: `Move ${before[0]}` }).focus();
    await press(page, "Space");
    await press(page, "ArrowLeft");
    await press(page, "Space");
    await expect.poll(labels).toEqual(before);
  });
});
