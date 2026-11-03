import { test } from "@playwright/test";
import { createDayPlan, dayCell, joinAs, testLogin, uid } from "./helpers";

// Visual review only: `SHOTS=1 pnpm exec playwright test e2e/screens.spec.ts`
test.skip(!process.env.SHOTS, "screenshots on demand");

const out = process.env.SHOTS_DIR ?? "test-results/shots";

for (const [label, viewport] of [
  ["390", { width: 390, height: 844 }],
  ["1440", { width: 1440, height: 900 }],
] as const) {
  test(`screens ${label}`, async ({ browser }) => {
    const ctx = await browser.newContext({
      viewport,
      locale: "es-ES",
      timezoneId: "Europe/Madrid",
    });
    const page = await ctx.newPage();
    await page.goto("/es");
    await page.screenshot({
      path: `${out}/${label}-landing.png`,
      fullPage: true,
    });
    await page.goto("/es/login");
    await page.screenshot({
      path: `${out}/${label}-login.png`,
      fullPage: true,
    });
    await testLogin(page, "Marta");
    await page.screenshot({
      path: `${out}/${label}-dashboard-empty.png`,
      fullPage: true,
    });
    await page.goto("/es/plans/new");
    await page.getByLabel("Título").fill("Cena de Navidad");
    await page.getByRole("button", { name: "Siguiente", exact: true }).click();
    await page.getByRole("button", { name: "Mes siguiente" }).click();
    await page.getByRole("button", { name: /^\S+, 10 de/ }).click();
    await page.getByRole("button", { name: /^\S+, 20 de/ }).click();
    await page.screenshot({
      path: `${out}/${label}-wizard-when.png`,
      fullPage: true,
    });
    const { path } = await createDayPlan(page, `Cena ${uid()}`);
    await page.screenshot({
      path: `${out}/${label}-created.png`,
      fullPage: true,
    });
    for (const [name, days] of [
      ["Nuria", [10, 11, 12]],
      ["Oriol", [11, 12]],
      ["Pau", [11]],
    ] as const) {
      const c = await browser.newContext({ viewport });
      const g = await c.newPage();
      await joinAs(g, path, name);
      for (const d of days) await dayCell(g, d).click();
      await g.getByRole("button", { name: "Guardar", exact: true }).click();
      await g.getByText("Todo guardado").waitFor();
      await c.close();
    }
    const c = await browser.newContext({ viewport });
    const g = await c.newPage();
    await joinAs(g, path, "Quim");
    await dayCell(g, 12).click();
    await g.screenshot({
      path: `${out}/${label}-participate.png`,
      fullPage: true,
    });
    await page.goto("/es/dashboard");
    await page.screenshot({
      path: `${out}/${label}-dashboard.png`,
      fullPage: true,
    });
    await page.getByRole("link", { name: /Cena/ }).first().click();
    await page.waitForURL(/manage/);
    await page.screenshot({
      path: `${out}/${label}-manage.png`,
      fullPage: true,
    });
    await ctx.close();
    await c.close();
  });
}

test("screens hour + dark", async ({ browser }) => {
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: "dark",
  });
  const page = await ctx.newPage();
  await page.goto("/es");
  await page.screenshot({ path: `${out}/dark-landing.png` });
  await testLogin(page, "Rita");
  await page.goto("/es/plans/new");
  await page.getByLabel("Título").fill(`Reunión ${uid()}`);
  await page.getByRole("button", { name: "Siguiente", exact: true }).click();
  await page.getByRole("button", { name: "Mes siguiente" }).click();
  await page.getByRole("button", { name: /^\S+, 7 de/ }).click();
  await page.getByRole("button", { name: /^\S+, 11 de/ }).click();
  await page.getByText("Horas", { exact: true }).click();
  await page.getByLabel("Zona horaria").fill("Europe/Madrid");
  await page.getByRole("button", { name: "Siguiente", exact: true }).click();
  await page.getByRole("button", { name: "Siguiente", exact: true }).click();
  await page.getByRole("button", { name: "Crear plan" }).click();
  const url = await page.getByRole("textbox", { name: "Enlace" }).inputValue();
  await joinAs(page, new URL(url).pathname, "Rita");
  await page.getByRole("button", { name: /^\S+, 8 de .* 10:00$/ }).click();
  await page.getByRole("button", { name: /^\S+, 9 de .* 11:00$/ }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${out}/dark-hour.png`, fullPage: true });
  await ctx.close();
});
