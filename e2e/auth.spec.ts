import { test, expect, login, DEMO } from "./helpers";

test.describe("F01 sign in", () => {
  test("F01-H1 logs in and lands on the workspace home", async ({ page, axe }) => {
    await login(page);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Workspace" })).toBeVisible();
    await axe();
  });

  test("F01-N1 rejects a wrong password with a clear message", async ({ page, axe }) => {
    await page.goto("/login");
    await axe();
    await page.getByLabel("Email").fill(DEMO.email);
    await page.getByLabel("Password").fill("not-the-password");
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page.getByRole("alert").filter({ hasText: /match/ })).toContainText("don't match");
  });

  test("F01-E1 a signed-out visitor is sent to login and back after signing in", async ({ page }) => {
    await page.goto("/my-work");
    await expect(page).toHaveURL(/\/login\?next=%2Fmy-work/);
    await page.getByLabel("Email").fill(DEMO.email);
    await page.getByLabel("Password").fill(DEMO.password);
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).toHaveURL(/\/my-work/);
  });
});
