import { test } from "@playwright/test";

const SHOTS: [string, string][] = [
  ["/#/", "overview"],
  ["/#/safety", "safety"],
  ["/#/rank", "rank"],
  ["/#/investigations/saffire-i", "detail"],
  ["/#/conditions", "conditions"],
  ["/#/gaps", "gaps"],
  ["/#/compare?ids=bass-ii,saffire-i", "compare"],
];

for (const [route, name] of SHOTS) {
  test(`shot ${name}`, async ({ page }) => {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await page.locator("#main").waitFor();
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `/tmp/flamelab-${name}.png` });
  });
}

test("shot ask", async ({ page }) => {
  await page.goto("/#/rank", { waitUntil: "domcontentloaded" });
  await page.locator("#main").waitFor();
  await page.getByRole("button", { name: "Open ask chat" }).click();
  await page.getByLabel("Chat input").fill("How do flames behave at Mars gravity?");
  await page.getByRole("button", { name: "Send" }).click();
  await page.getByText("Not covered by the available data", { exact: true }).waitFor();
  await page.waitForTimeout(500);
  await page.screenshot({ path: "/tmp/flamelab-ask.png" });
});

test("shot wheel", async ({ page }) => {
  await page.goto("/#/rank", { waitUntil: "domcontentloaded" });
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
  await page.goto("/#/rank", { waitUntil: "domcontentloaded" });
  await page.locator("#main").waitFor();
  await page.getByRole("button", { name: "Switch to light mode" }).click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "/tmp/flamelab-light.png" });
});

test("shot light wheel", async ({ page }) => {
  await page.goto("/#/rank", { waitUntil: "domcontentloaded" });
  await page.locator("#main").waitFor();
  await page.getByRole("button", { name: "Switch to light mode" }).click();
  await page.getByRole("button", { name: "Why this rank" }).first().click();
  await page.getByText(/Top drivers/).waitFor();
  await page.getByRole("img", { name: "Factor score wheel" }).scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "/tmp/flamelab-light-wheel.png" });
});
