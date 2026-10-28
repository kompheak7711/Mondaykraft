import { test, expect, login, openDemoBoard } from "./helpers";

const nav = (page: import("@playwright/test").Page) => page.getByRole("navigation", { name: "Views" });
const order = (page: import("@playwright/test").Page) => nav(page).locator("button[aria-label^='Move '][aria-label$=' view']").evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")));

test.describe("F07 saved views", () => {
  test.beforeEach(async ({ page }) => { await login(page); await openDemoBoard(page); });

  test("F07-H2 reorders the views bar with the keyboard and the order survives a reload", async ({ page }) => {
    expect(await order(page)).toEqual(["Move Main table view", "Move Kanban view", "Move Gantt view"]);
    const grip = nav(page).getByRole("button", { name: "Move Gantt view" });
    await grip.focus();
    await page.keyboard.press("Space"); await page.waitForTimeout(40);
    await page.keyboard.press("ArrowLeft"); await page.waitForTimeout(40);
    await page.keyboard.press("Space");
    await expect.poll(() => order(page)).toEqual(["Move Main table view", "Move Gantt view", "Move Kanban view"]);
    await page.reload();
    await expect(page.getByRole("grid")).toBeVisible();
    expect(await order(page)).toEqual(["Move Main table view", "Move Gantt view", "Move Kanban view"]);
    // put it back
    await nav(page).getByRole("button", { name: "Move Gantt view" }).focus();
    await page.keyboard.press("Space"); await page.waitForTimeout(40);
    await page.keyboard.press("ArrowRight"); await page.waitForTimeout(40);
    await page.keyboard.press("Space");
    await expect.poll(() => order(page)).toEqual(["Move Main table view", "Move Kanban view", "Move Gantt view"]);
  });

  test("F07-H3 the board search is saved on the view", async ({ page }) => {
    const tools = page.getByRole("toolbar", { name: "Board tools" });
    await tools.getByRole("button", { name: "Search" }).click();
    await page.getByLabel("Search this board").fill("brief");
    await expect(page.getByRole("row").filter({ hasText: "Agree the timeline" })).toHaveCount(0);
    await expect(page.getByRole("row").filter({ hasText: "Write the project brief" })).toBeVisible();
    await page.waitForTimeout(900); // the view saves after a short pause
    await page.reload();
    await expect(page.getByLabel("Search this board")).toHaveValue("brief");
    await expect(page.getByRole("row").filter({ hasText: "Agree the timeline" })).toHaveCount(0);
    await page.getByLabel("Search this board").fill("");
    await page.waitForTimeout(900);
    await page.reload();
    await expect(page.getByRole("row").filter({ hasText: "Agree the timeline" })).toBeVisible();
    await expect(tools.getByRole("button", { name: "Search" })).toBeVisible();
  });

  test("F07-H4 a chart view stacks bars by a second column", async ({ page, axe }) => {
    await nav(page).getByRole("button", { name: "Add view" }).click();
    await page.getByRole("menuitem", { name: "Chart" }).click();
    await expect(page.getByRole("img", { name: /^bar chart of count by Status/ })).toBeVisible();
    await page.getByLabel("Chart type").selectOption("stacked");
    await expect(page.getByRole("img", { name: /^stacked bar chart of count by Status stacked by Owner/ })).toBeVisible();
    await expect(page.getByLabel("Stack by column")).toHaveValue(/./);
    await axe();
    await page.reload();
    await expect(page.getByRole("img", { name: /^stacked bar chart/ })).toBeVisible();
    await nav(page).getByRole("button", { name: "Chart view options" }).click();
    await page.getByRole("menuitem", { name: "Remove view" }).click();
    await expect(nav(page).getByRole("button", { name: "Chart", exact: true })).toHaveCount(0);
  });
});
