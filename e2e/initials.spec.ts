import { devices, expect, test } from "@playwright/test";
import { createDayPlan, dayCell, joinAs, testLogin, uid } from "./helpers";

test("cells show the initials of who answered, and + past five @mobile", async ({
  browser,
}) => {
  const owner = await browser.newContext({ locale: "es-ES" });
  const p = await owner.newPage();
  await testLogin(p, "Ana");
  const { path } = await createDayPlan(p, `Iniciales ${uid()}`);

  const names = ["Berta", "Carla", "Dani", "Eva", "Fran", "Gala"];
  for (const [i, name] of names.entries()) {
    const ctx = await browser.newContext({ locale: "es-ES" });
    const g = await ctx.newPage();
    await joinAs(g, path, name);
    await dayCell(g, 10).click();
    // Only the first two also answer day 11.
    if (i < 2) await dayCell(g, 11).click();
    await g.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(g.getByText("Todo guardado")).toBeVisible();
    await ctx.close();
  }

  const m = await browser.newContext({
    ...devices["Pixel 7"],
    locale: "es-ES",
  });
  const page = await m.newPage();
  await joinAs(page, path, "Hugo");

  const ten = dayCell(page, 10).locator("[data-initials] > span");
  await expect(ten).toHaveText(["B", "C", "D", "E", "F", "+"]);
  const eleven = dayCell(page, 11).locator("[data-initials] > span");
  await expect(eleven).toHaveText(["B", "C"]);
  await expect(dayCell(page, 12).locator("[data-initials]")).toHaveCount(0);

  if (process.env.SHOTS)
    await page.screenshot({
      path: "test-results/initials-mobile.png",
      fullPage: true,
    });

  await Promise.all([owner.close(), m.close()]);
});
