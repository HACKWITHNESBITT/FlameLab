import { expect, test } from "@playwright/test";

test("journey 1: environment + lens → ranked list with breakdowns", async ({ page }) => {
  await page.goto("/#/rank");
  await expect(page.getByLabel("Environment")).toHaveValue("moon_base");
  await expect(page.locator("ol li").first()).toBeVisible();
  await page.getByRole("button", { name: "Why this rank" }).first().click();
  await expect(page.getByText(/Top drivers/)).toBeVisible();
});

test("journey 2: detail → SI panel → conditions and measurements", async ({ page }) => {
  test.setTimeout(150_000);
  await page.goto("/#/investigations/saffire-i");
  await expect(page.getByRole("heading", { name: "Saffire-I" })).toBeVisible();
  await expect(page.getByText("Fuels")).toBeVisible();
  // Terminal state, with or without a provider key: verified SI content, the
  // unavailable panel, or an honest provider-error panel — never blank, never
  // stuck loading. A live provider call can take a while.
  await expect(page.getByText("Generating verified summary")).toBeHidden({ timeout: 150_000 });
  await expect(
    page.getByText("Findings", { exact: true }).or(page.getByRole("alert")),
  ).toBeVisible();
});

test("conditions map renders with target zone", async ({ page }) => {
  await page.goto("/#/conditions");
  await expect(page.getByRole("img", { name: /conditions map/ })).toBeVisible();
});

test("journey 3: gaps → compare → ask → export", async ({ page }) => {
  await page.goto("/#/gaps");
  await expect(page.getByText(/Partial gravity/)).toBeVisible();
  await page.goto("/#/compare?ids=bass-ii,saffire-i");
  await expect(page.getByText("Aligned fields")).toBeVisible();
  await expect(page.getByText("Export for modeling")).toBeVisible();
  await page.goto("/#/ask");
  await page.getByLabel("Question").fill("How do flames behave at Mars gravity?");
  await page.getByRole("button", { name: "Ask", exact: true }).click();
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
