import { expect, test, type Page } from "@playwright/test";
import { joinAs, testLogin, uid } from "./helpers";

type Mode = "Un rango" | "Días sueltos" | "Abierto";
type Grain = "Días" | "Franjas" | "Horas";

async function createPlan(
  page: Page,
  title: string,
  mode: Mode,
  grain: Grain,
  hours?: { from: string; to: string },
) {
  await page.goto("/es/plans/new");
  await page.getByLabel("Título").fill(title);
  await page.getByRole("button", { name: "Siguiente", exact: true }).click();
  await page.getByText(mode, { exact: true }).click();
  if (mode !== "Abierto") {
    await page.getByRole("button", { name: "Mes siguiente" }).click();
    await page.getByRole("button", { name: /^\S+, 10 de/ }).click();
    await page.getByRole("button", { name: /^\S+, 12 de/ }).click();
  }
  await page.getByText(grain, { exact: true }).click();
  if (grain === "Horas") {
    await page.getByLabel("Zona horaria").fill("Europe/Madrid");
    if (hours) {
      await page.getByLabel("Desde").selectOption({ label: hours.from });
      await page.getByLabel("Hasta").selectOption({ label: hours.to });
    }
  }
  await page.getByRole("button", { name: "Siguiente", exact: true }).click();
  await page.getByRole("button", { name: "Siguiente", exact: true }).click();
  await page.getByRole("button", { name: "Crear plan" }).click();
  await expect(
    page.getByRole("heading", { name: "Plan creado" }),
  ).toBeVisible();
  return new URL(
    await page.getByRole("textbox", { name: "Enlace" }).inputValue(),
  ).pathname;
}

test("every dateMode × granularity can be created and shows in the dashboard", async ({
  page,
}) => {
  await testLogin(page, "Hugo");
  const tag = uid();
  const modes: Mode[] = ["Un rango", "Días sueltos", "Abierto"];
  const grains: Grain[] = ["Días", "Franjas", "Horas"];
  for (const m of modes)
    for (const g of grains) await createPlan(page, `${tag} ${m} ${g}`, m, g);
  await page.goto("/es/dashboard");
  for (const m of modes)
    for (const g of grains) {
      await expect(
        page.getByRole("link", { name: new RegExp(`${tag} ${m} ${g}`) }),
      ).toBeVisible();
    }
});

test("slot plan: open a day, paint a slot", async ({ page, browser }) => {
  await testLogin(page, "Iris");
  const path = await createPlan(
    page,
    `Franjas ${uid()}`,
    "Un rango",
    "Franjas",
  );
  const g = await (await browser.newContext()).newPage();
  await joinAs(g, path, "Jon");
  await g
    .getByRole("button", { name: /^\S+, 11 de .* franjas marcadas/ })
    .click();
  await g.getByRole("button", { name: /^Cena/ }).click();
  await g.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(g.getByText("Todo guardado")).toBeVisible();
  await g.reload();
  await expect(
    g.getByRole("button", { name: /^\S+, 11 de .* 1 de 2 franjas marcadas/ }),
  ).toBeVisible();
});

test("hour plan in Europe/Madrid seen from America/New_York", async ({
  page,
  browser,
}) => {
  await testLogin(page, "Kai");
  const path = await createPlan(page, `Horas ${uid()}`, "Un rango", "Horas", {
    from: "09:00",
    to: "12:00",
  });

  const ny = await browser.newContext({
    locale: "es-ES",
    timezoneId: "America/New_York",
  });
  const g = await ny.newPage();
  await joinAs(g, path, "Lia");
  await expect(g.getByText(/Horas en America\/New York/)).toBeVisible();
  await expect(g.getByText(/el plan está en Europe\/Madrid/)).toBeVisible();
  // 09:00 in Madrid (CET, winter) is 03:00 in New York (EST).
  const first = g.getByRole("button", { name: /^\S+, 10 de .* 03:00$/ });
  await expect(first).toBeVisible();
  await expect(
    g.getByRole("button", { name: /^\S+, 10 de .* 09:00/ }),
  ).toHaveCount(0);

  // Drag from 03:00 to 05:00 paints three cells.
  const last = g.getByRole("button", { name: /^\S+, 10 de .* 05:00$/ });
  const a = (await first.boundingBox())!;
  const b = (await last.boundingBox())!;
  await g.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await g.mouse.down();
  await g.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 });
  await g.mouse.up();
  await expect(
    g.getByRole("button", { name: /^\S+, 10 de .* 04:00 — Sí/ }),
  ).toBeVisible();
  await g.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(g.getByText("Todo guardado")).toBeVisible();

  // The creator (Madrid) sees the same instants at 09:00–11:00.
  await page.goto("/es/dashboard");
  await page.getByRole("link", { name: /Horas/ }).first().click();
  await expect(
    page.getByRole("columnheader", { name: /10 .*09:00/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("columnheader", { name: /10 .*11:00/ }),
  ).toBeVisible();
  await ny.close();
});
