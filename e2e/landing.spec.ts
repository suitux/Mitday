import { expect, test } from "@playwright/test";
import { testLogin } from "./helpers";

test("landing in es, ca and en @mobile", async ({ page }) => {
  for (const [locale, title] of [
    ["es", "Se acabó el «a ver si quedamos»"],
    ["ca", "Prou de «a veure si quedem»"],
    ["en", "No more “we should hang out”"],
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

test("landing demo: friends answer, then you paint @mobile", async ({
  page,
}) => {
  await page.goto("/es");
  await expect(page.getByText(/^Ganador provisional:/)).toBeVisible();
  const day = page.getByRole("button", { name: /^\S+, 2 de/ });
  await day.click();
  await expect(day).toHaveAccessibleName(/— Puedo$/);
});

test("language switcher changes the locale", async ({ page }) => {
  await page.goto("/es");
  await page.getByLabel("Idioma").click();
  await page.getByRole("option", { name: "English" }).click();
  await expect(page).toHaveURL(/\/en$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "No more “we should hang out”",
  );
});

test("closing sentence starts a plan with its title", async ({ page }) => {
  await testLogin(page, "Ana");
  await page.goto("/es");
  await page.getByLabel("Para qué es el plan").fill("Cena de Navidad");
  await page.getByRole("button", { name: "Crear", exact: true }).click();
  await expect(page).toHaveURL(/\/es\/plans\/new\?title=Cena/);
  await expect(page.getByLabel("Título")).toHaveValue("Cena de Navidad");
});

test("closing sentence keeps the title through login", async ({ page }) => {
  await page.goto("/es");
  await page.getByLabel("Para qué es el plan").fill("Barbacoa");
  await page.getByRole("button", { name: "Crear", exact: true }).click();
  await expect(page).toHaveURL(
    /\/es\/login\?callbackUrl=%2Fes%2Fplans%2Fnew%3Ftitle%3DBarbacoa/,
  );
});
