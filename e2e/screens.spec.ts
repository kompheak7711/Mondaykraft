import { test, expect, login } from "./helpers";

test.describe("F10 F11 F12 F13 the other screens", () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  for (const [path, heading] of [["/my-work", "My Work"], ["/notifications", "Notifications"], ["/inbox", "Inbox"], ["/members", /Members of/], ["/trash", "Trash and archive"], ["/settings", "Profile and settings"]] as const) {
    test(`renders ${path} without errors and passes axe`, async ({ page, axe }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
      await axe();
    });
  }

  test("F12-H1 search finds a seeded item", async ({ page }) => {
    await page.goto("/search?q=brief");
    await expect(page.getByRole("link", { name: /Write the project brief/ })).toBeVisible();
  });

  test("F12-E1 search with no hits says so", async ({ page }) => {
    await page.goto("/search?q=zzqqxx");
    await expect(page.getByText(/Nothing matches/)).toBeVisible();
  });

  test("F11-H1 an owner creates an invite link", async ({ page }) => {
    await page.goto("/members");
    await page.getByLabel("Email").fill(`invitee+${Date.now()}@example.com`);
    await page.getByRole("button", { name: "Create invite" }).click();
    await expect(page.getByRole("status")).toContainText("Invite ready");
    await expect(page.getByText(/\/invite\//).first()).toBeVisible();
  });

  test("F13-H1 a trashed item can be restored from the trash", async ({ page }) => {
    await page.getByRole("navigation", { name: "Workspace" }).getByRole("link", { name: "Bug tracker", exact: true }).click();
    const row = page.getByRole("row").filter({ hasText: "Kanban cards overlap" });
    await row.hover();
    await row.getByRole("checkbox", { name: /^Select / }).check();
    await page.getByRole("toolbar", { name: /selected/ }).getByRole("button", { name: "Delete" }).click();
    await expect(page.getByRole("row").filter({ hasText: "Kanban cards overlap" })).toHaveCount(0);
    await page.goto("/trash");
    const trashed = page.getByRole("listitem").filter({ hasText: "Kanban cards overlap" });
    await expect(trashed).toBeVisible();
    await trashed.getByRole("button", { name: "Restore" }).click();
    await expect(page.getByRole("listitem").filter({ hasText: "Kanban cards overlap" })).toHaveCount(0);
  });
});
