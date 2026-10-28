import { test, expect, login, openDemoBoard } from "./helpers";

test.describe("F04 F11 board members, activity and files", () => {
  test.beforeEach(async ({ page }) => { await login(page); await openDemoBoard(page); });

  test("an owner adds a member, changes the role and removes them; the owner wears the crown", async ({ page, axe }) => {
    await page.getByRole("link", { name: "Members" }).click();
    const sheet = page.getByRole("dialog", { name: "Board members" });
    await expect(sheet.getByText(/Ana Lima, owner/)).toBeVisible();
    await axe();
    if (await sheet.getByRole("button", { name: /Remove Ben/ }).count()) await sheet.getByRole("button", { name: /Remove Ben/ }).click();
    await sheet.getByLabel("Person to add").selectOption({ label: "Ben Okafor" });
    await sheet.getByRole("button", { name: "Add", exact: true }).click();
    await expect(sheet.getByText(/Ben Okafor, member/)).toBeVisible();
    await sheet.getByLabel("Role of Ben Okafor").selectOption("viewer");
    await expect(sheet.getByText(/Ben Okafor, viewer/)).toBeVisible();
    await sheet.getByRole("button", { name: "Remove Ben Okafor from the board" }).click();
    await expect(sheet.getByRole("button", { name: "Remove Ben Okafor from the board" })).toHaveCount(0);
  });

  test("the activity log lists what happened on the board", async ({ page }) => {
    await page.getByRole("link", { name: "Activity" }).click();
    const sheet = page.getByRole("dialog", { name: "Activity log" });
    await expect(sheet.getByRole("listitem").first()).toBeVisible();
  });

  test("a file uploads into the Files column and can be removed", async ({ page }) => {
    if (!(await page.getByRole("columnheader").filter({ has: page.getByRole("button", { name: "Files", exact: true }) }).count())) {
      await page.getByRole("button", { name: "Add column" }).first().click();
      await page.getByRole("button", { name: /^Files\s*Attachments/ }).click();
    }
    const cell = page.getByRole("row").filter({ hasText: "Write the project brief" }).getByRole("button", { name: /^Files:/ }).first();
    await cell.click();
    await page.getByLabel("Upload files").setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("hello from the spec") });
    await expect(page.getByRole("link", { name: "notes.txt" })).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Remove notes.txt" }).click();
    await expect(page.getByRole("link", { name: "notes.txt" })).toHaveCount(0);
  });
});
