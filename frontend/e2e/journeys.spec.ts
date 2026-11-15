import { expect, test } from "@playwright/test";

test("journey 1: environment + lens → ranked list with breakdowns", async ({ page }) => {
  await page.goto("/#/rank");
  await expect(page.getByLabel("Environment")).toHaveValue("moon_base");
  await expect(page.locator("ol li").first()).toBeVisible();
  await page.getByRole("button", { name: "Why this rank" }).first().click();
  await expect(page.getByText(/Top drivers/)).toBeVisible();
});

test("journey 2: detail → SI panel → conditions and measurements", async ({ page }) => {
  await page.goto("/#/investigations/saffire-i");
  await expect(page.getByRole("heading", { name: "Saffire-I" })).toBeVisible();
  await expect(page.getByText("Fuels")).toBeVisible();
  // The e2e backend gets no provider key (see playwright.config.ts), so the
  // panel must say unavailable — never blank, never stuck loading.
  await expect(page.getByText("si_unavailable")).toBeVisible();
});

test("conditions chart renders ranges with target zone", async ({ page }) => {
  await page.goto("/#/conditions");
  await expect(page.getByRole("img", { name: /test ranges/ })).toBeVisible();
  await expect(page.getByText(/investigations report oxygen ranges/)).toBeVisible();
});

test("journey 3: gaps → compare → ask → export", async ({ page }) => {
  await page.goto("/#/gaps");
  await expect(page.getByText(/Partial gravity/)).toBeVisible();
  await page.goto("/#/compare?ids=bass-ii,saffire-i");
  await expect(page.getByText("Aligned fields")).toBeVisible();
  await expect(page.getByText("Export for modeling")).toBeVisible();
  await page.getByRole("button", { name: "Open ask chat" }).click();
  await page.getByLabel("Chat input").fill("How do flames behave at Mars gravity?");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText("Not covered by the available data", { exact: true })).toBeVisible();
});

test("theme toggle switches to light mode and persists", async ({ page }) => {
  await page.goto("/#/");
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", "light");
  await page.getByRole("button", { name: "Switch to light mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("safety insights render with disclaimer", async ({ page }) => {
  await page.goto("/#/safety");
  await expect(page.getByText("Prevention focus")).toBeVisible();
  await expect(page.getByText(/Research insights only/)).toBeVisible();
  await expect(page.locator("ol li").first()).toBeVisible();
});
