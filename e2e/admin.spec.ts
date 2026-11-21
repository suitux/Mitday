import { expect, test } from "@playwright/test";
import { createDayPlan, testLogin, uid } from "./helpers";

test("anonymous visitors are sent to login", async ({ page }) => {
  await page.goto("/es/admin");
  await expect(page).toHaveURL(/\/es\/login\?callbackUrl=%2Fes%2Fadmin/);
});

test("non-admin users get a 404 and no menu entry", async ({ page }) => {
  await testLogin(page, "Normal");
  await page.getByRole("button", { name: "Cuenta" }).click();
  await expect(
    page.getByRole("menuitem", { name: "Mis planes" }),
  ).toBeVisible();
  await expect(
    page.getByRole("menuitem", { name: "Administración" }),
  ).toHaveCount(0);
  const res = await page.goto("/es/admin");
  expect(res?.status()).toBe(404);
});

test("admin lists users, searches and opens a user's plans", async ({
  page,
  context,
}) => {
  const title = `Cena admin ${uid()}`;
  const owner = await testLogin(page, "Owner");
  await createDayPlan(page, title);

  await context.clearCookies();
  await testLogin(page, "Admin", "es", "admin@test.mitday");
  await page.getByRole("button", { name: "Cuenta" }).click();
  await page.getByRole("menuitem", { name: "Administración" }).click();
  await expect(
    page.getByRole("heading", { name: "Administración" }),
  ).toBeVisible();

  await page.getByRole("searchbox").fill(owner);
  await page.getByRole("button", { name: "Buscar" }).click();
  await expect(page).toHaveURL(/q=/);
  await page.getByRole("link", { name: new RegExp(owner) }).click();

  await expect(page.getByRole("heading", { name: "Owner" })).toBeVisible();
  const owned = page.getByRole("region", { name: /Planes creados/ });
  await expect(owned.getByText(title)).toBeVisible();
  await expect(
    owned.getByRole("link", { name: "Ver página pública" }),
  ).toHaveAttribute("href", /\/es\/p\//);
});
