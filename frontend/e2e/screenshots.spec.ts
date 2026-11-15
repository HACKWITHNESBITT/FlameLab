import { test } from "@playwright/test";

const SHOTS: [string, string][] = [
  ["/#/", "rank"],
  ["/#/investigations/saffire-i", "detail"],
  ["/#/conditions", "conditions"],
  ["/#/gaps", "gaps"],
  ["/#/compare?ids=bass-ii,saffire-i", "compare"],
  ["/#/ask", "ask"],
];

for (const [route, name] of SHOTS) {
  test(`shot ${name}`, async ({ page }) => {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await page.locator("#main").waitFor();
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `/tmp/flamelab-${name}.png` });
  });
}

test("shot wheel", async ({ page }) => {
  await page.goto("/#/", { waitUntil: "domcontentloaded" });
  await page.locator("#main").waitFor();
  await page.getByRole("button", { name: "Why this rank" }).first().click();
  await page.getByText(/Top drivers/).waitFor();
  await page.getByRole("img", { name: "Factor score wheel" }).scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "/tmp/flamelab-wheel.png" });
});

test("shot radar", async ({ page }) => {
  await page.goto("/#/compare?ids=bass-ii,saffire-i", { waitUntil: "domcontentloaded" });
  await page.locator("#main").waitFor();
  await page.waitForTimeout(2000);
  await page.locator('section[aria-label="Factor radar"]').screenshot({ path: "/tmp/flamelab-radar.png" });
});

test("shot light", async ({ page }) => {
  await page.goto("/#/", { waitUntil: "domcontentloaded" });
  await page.locator("#main").waitFor();
  await page.getByRole("button", { name: "Switch to light mode" }).click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "/tmp/flamelab-light.png" });
});

test("shot light wheel", async ({ page }) => {
  await page.goto("/#/", { waitUntil: "domcontentloaded" });
  await page.locator("#main").waitFor();
  await page.getByRole("button", { name: "Switch to light mode" }).click();
  await page.getByRole("button", { name: "Why this rank" }).first().click();
  await page.getByText(/Top drivers/).waitFor();
  await page.getByRole("img", { name: "Factor score wheel" }).scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "/tmp/flamelab-light-wheel.png" });
});
