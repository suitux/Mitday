import { expect, test } from "@playwright/test";

test("landing in es, ca and en @mobile", async ({ page }) => {
  for (const [locale, title] of [
    ["es", "El día que os va bien a todos"],
    ["ca", "El dia que us va bé a tots"],
    ["en", "The day that works for everyone"],
  ] as const) {
    await page.goto(`/${locale}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
  }
});

test("root redirects to a locale", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/(es|ca|en)$/);
});

test("protected routes redirect to login", async ({ page }) => {
  await page.goto("/es/dashboard");
  await expect(page).toHaveURL(/\/es\/login\?callbackUrl=%2Fes%2Fdashboard/);
  await page.goto("/en/plans/new");
  await expect(page).toHaveURL(/\/en\/login/);
});

test("unknown plan shows translated 404", async ({ page }) => {
  const res = await page.goto("/ca/p/doesnotexist1");
  expect(res?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { name: "No trobem aquesta pàgina" }),
  ).toBeVisible();
});
