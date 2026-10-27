import { expect, type Page, test as base } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

export const DEMO = { email: "demo.ana@example.com", password: "taskraft-demo-1", name: "Ana Lima" };

/** Every test fails on a console error or a 5xx response, and can run an axe scan. */
export const test = base.extend<{ page: Page; axe: () => Promise<void> }>({
  page: async ({ page }, use) => {
    const errors: string[] = [];
    page.on("console", (m) => { if (m.type() === "error" && !/favicon|hydration|third-party|Download the React DevTools/i.test(m.text())) errors.push(m.text()); });
    page.on("response", (r) => { if (r.status() >= 500) errors.push(`${r.status()} ${r.url()}`); });
    await use(page);
    expect(errors, "console errors or 5xx responses").toEqual([]);
  },
  axe: async ({ page }, use) => {
    await use(async () => {
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).disableRules(["color-contrast"]).analyze();
      const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(serious.map((v) => `${v.id}: ${v.nodes.length} nodes (${v.nodes[0]?.target.join(" ")})`), "axe serious/critical violations").toEqual([]);
    });
  },
});

export async function login(page: Page, email = DEMO.email, password = DEMO.password) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
}

export async function openDemoBoard(page: Page, name = "Project tracker") {
  await page.getByRole("navigation", { name: "Workspace" }).getByRole("link", { name, exact: true }).first().click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  await expect(page.getByRole("grid")).toBeVisible();
}

export { expect };
