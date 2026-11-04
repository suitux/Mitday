import { expect, test } from "@playwright/test";
import { createDayPlan, dayCell, joinAs, testLogin, uid } from "./helpers";

test("create plan → guest answers → personal link → creator closes", async ({
  browser,
}) => {
  const owner = await browser.newContext({
    locale: "es-ES",
    timezoneId: "Europe/Madrid",
  });
  const ownerPage = await owner.newPage();
  await testLogin(ownerPage, "Ana");
  const title = `Cena ${uid()}`;
  const { path } = await createDayPlan(ownerPage, title);

  // Guest answers.
  const guest = await browser.newContext({ locale: "es-ES" });
  const g = await guest.newPage();
  await joinAs(g, path, "Berta");
  await dayCell(g, 11).click();
  await expect(g.getByText("Cambios sin guardar")).toBeVisible();
  await g.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(
    g.getByRole("heading", { name: "Tu enlace personal" }),
  ).toBeVisible();
  const personal = await g
    .getByRole("textbox", { name: "Enlace" })
    .first()
    .inputValue();
  expect(personal).toContain("/claim?k=");

  // Reload keeps answers.
  await g.reload();
  await expect(dayCell(g, 11)).toHaveAccessibleName(/— Sí/);

  // Personal link in another browser restores identity and allows editing.
  const other = await browser.newContext({ locale: "es-ES" });
  const o = await other.newPage();
  await o.goto(personal);
  await expect(o).toHaveURL(new RegExp(`${path}$`));
  await expect(o.getByText("Respondes como Berta.")).toBeVisible();
  await dayCell(o, 12).click();
  await o.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(o.getByText("Todo guardado")).toBeVisible();

  // Creator sees the table and closes on the best day.
  await ownerPage.goto("/es/dashboard");
  await ownerPage.getByRole("link", { name: new RegExp(title) }).click();
  await expect(ownerPage.getByRole("row", { name: /Berta/ })).toBeVisible();
  // Pick a day other than the suggested best one in the shadcn select.
  await ownerPage.getByLabel("Fecha elegida").click();
  await ownerPage.getByRole("option", { name: /12 de/ }).click();
  await ownerPage.getByRole("button", { name: "Cerrar plan" }).click();
  await expect(ownerPage.getByText("Cerrado en:")).toBeVisible();
  await expect(ownerPage.getByText("Cerrado en:")).toContainText("12 de");

  // Guest sees the banner and can download the .ics.
  await g.reload();
  await expect(g.getByText("Fecha decidida")).toBeVisible();
  const download = g.waitForEvent("download");
  await g.getByRole("link", { name: "Descargar .ics" }).click();
  const file = await download;
  const ics = await (await file.createReadStream()).toArray();
  expect(Buffer.concat(ics).toString()).toContain("BEGIN:VEVENT");
  await expect(
    g.getByRole("button", { name: "Guardar", exact: true }),
  ).toHaveCount(0);

  // Owner can reopen.
  await ownerPage.getByRole("button", { name: "Reabrir plan" }).click();
  await expect(
    ownerPage.getByRole("button", { name: "Cerrar plan" }),
  ).toBeVisible();

  await Promise.all([owner.close(), guest.close(), other.close()]);
});

test("hidden visibility sends nothing about others", async ({ browser }) => {
  const owner = await browser.newContext();
  const ownerPage = await owner.newPage();
  await testLogin(ownerPage, "Carla");
  const { path } = await createDayPlan(ownerPage, `Oculto ${uid()}`, {
    visibility: "Nada",
  });

  const a = await (await browser.newContext()).newPage();
  await joinAs(a, path, "Secretname");
  await dayCell(a, 10).click();
  await a.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(a.getByText("Todo guardado")).toBeVisible();

  const b = await (await browser.newContext()).newPage();
  await joinAs(b, path, "Otra");
  const html = await (await b.request.get(path)).text();
  expect(html).not.toContain("Secretname");
  expect(await b.content()).not.toContain("Secretname");
  await expect(
    b.getByText("En este plan solo ves tus respuestas."),
  ).toBeVisible();
  await owner.close();
});

test("non-owner gets 404 on manage", async ({ browser }) => {
  const owner = await browser.newContext();
  const p1 = await owner.newPage();
  await testLogin(p1, "Dani");
  await createDayPlan(p1, `Privado ${uid()}`);
  await p1.goto("/es/dashboard");
  await p1
    .getByRole("link", { name: /Privado/ })
    .first()
    .click();
  await p1.waitForURL(/\/manage$/);
  const manageUrl = p1.url();

  const intruder = await browser.newContext();
  const p2 = await intruder.newPage();
  await testLogin(p2, "Eva");
  const res = await p2.goto(manageUrl);
  expect(res?.status()).toBe(404);
  // Signed out: redirected to login, never the page.
  const anon = await (await browser.newContext()).newPage();
  await anon.goto(manageUrl);
  await expect(anon).toHaveURL(/\/login/);
  await Promise.all([owner.close(), intruder.close()]);
});

test("guest paints on mobile @mobile", async ({ browser }) => {
  const owner = await browser.newContext();
  const p = await owner.newPage();
  await testLogin(p, "Fran");
  const { path } = await createDayPlan(p, `Móvil ${uid()}`);
  const m = await browser.newContext({
    ...(await import("@playwright/test")).devices["Pixel 7"],
  });
  const g = await m.newPage();
  await joinAs(g, path, "Gala");
  await dayCell(g, 10).tap();
  await g.getByRole("button", { name: "Guardar", exact: true }).tap();
  await expect(g.getByText("Todo guardado")).toBeVisible();
  await Promise.all([owner.close(), m.close()]);
});
