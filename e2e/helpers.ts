import { expect, type Page } from "@playwright/test";

export const uid = () => Math.random().toString(36).slice(2, 8);

export async function testLogin(page: Page, name: string, locale = "es") {
  const email = `${name.toLowerCase()}-${uid()}@test.mitday`;
  await page.goto(`/${locale}/login`);
  const form = page.getByTestId("test-login");
  await form.getByPlaceholder("ana@test.mitday").fill(email);
  await form.getByLabel("Name").fill(name);
  await form.getByRole("button", { name: "Test login" }).click();
  await expect(page).toHaveURL(new RegExp(`/${locale}/dashboard`));
  return email;
}

/** Creates a day plan over a range in the next month via the wizard. Returns the share URL. */
export async function createDayPlan(
  page: Page,
  title: string,
  opts: { visibility?: "Todo" | "Solo el mapa" | "Nada" } = {},
) {
  await page.goto("/es/plans/new");
  await page.getByLabel("Título").fill(title);
  await page.getByRole("button", { name: "Siguiente", exact: true }).click();
  // Range: next month 10 → 12.
  await page.getByRole("button", { name: "Mes siguiente" }).click();
  await page.getByRole("button", { name: /^\S+, 10 de/ }).click();
  await page.getByRole("button", { name: /^\S+, 12 de/ }).click();
  await page.getByRole("button", { name: "Siguiente", exact: true }).click();
  await page.getByRole("button", { name: "Siguiente", exact: true }).click();
  if (opts.visibility)
    await page.getByText(opts.visibility, { exact: true }).click();
  await page.getByRole("button", { name: "Crear plan" }).click();
  await expect(
    page.getByRole("heading", { name: "Plan creado" }),
  ).toBeVisible();
  const url = await page.getByRole("textbox", { name: "Enlace" }).inputValue();
  return { url, path: new URL(url).pathname };
}

export async function joinAs(page: Page, path: string, name: string) {
  await page.goto(path);
  await page.getByLabel("Tu nombre").fill(name);
  await page.getByRole("button", { name: "Empezar a marcar" }).click();
  await expect(page.getByText(`Respondes como ${name}.`)).toBeVisible();
}

export function dayCell(page: Page, day: number) {
  return page.getByRole("button", { name: new RegExp(`^\\S+, ${day} de`) });
}
