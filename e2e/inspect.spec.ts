import { devices, expect, test, type Browser } from "@playwright/test";
import { createDayPlan, dayCell, joinAs, testLogin, uid } from "./helpers";

/** Plan where Berta answered day 11. Returns its share path. */
async function planWithAnswer(browser: Browser) {
  const owner = await browser.newContext({ locale: "es-ES" });
  const p = await owner.newPage();
  await testLogin(p, "Ana");
  const { path } = await createDayPlan(p, `Quién ${uid()}`);
  const guest = await browser.newContext({ locale: "es-ES" });
  const g = await guest.newPage();
  await joinAs(g, path, "Berta");
  await dayCell(g, 11).click();
  await g.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(g.getByText("Todo guardado")).toBeVisible();
  return { path, close: () => Promise.all([owner.close(), guest.close()]) };
}

test("right click on a cell shows who answered, without painting", async ({
  browser,
}) => {
  const { path, close } = await planWithAnswer(browser);
  const ctx = await browser.newContext({ locale: "es-ES" });
  const page = await ctx.newPage();
  await joinAs(page, path, "Carla");

  await dayCell(page, 11).click({ button: "right" });
  const sheet = page.getByRole("dialog");
  await expect(sheet).toBeVisible();
  await expect(sheet.getByText("Berta")).toBeVisible();
  await expect(page.getByText("Cambios sin guardar")).toHaveCount(0);

  await Promise.all([close(), ctx.close()]);
});

test("long press on a cell shows who answered @mobile", async ({ browser }) => {
  const { path, close } = await planWithAnswer(browser);
  const ctx = await browser.newContext({
    ...devices["Pixel 7"],
    locale: "es-ES",
  });
  const page = await ctx.newPage();
  await joinAs(page, path, "Dani");

  const cell = dayCell(page, 11);
  const box = await cell.boundingBox();
  if (!box) throw new Error("cell not visible");
  const at = {
    pointerType: "touch",
    pointerId: 7,
    isPrimary: true,
    button: 0,
    buttons: 1,
    clientX: box.x + box.width / 2,
    clientY: box.y + box.height / 2,
  };
  await cell.dispatchEvent("pointerdown", at);
  await page.waitForTimeout(700);
  // The sheet now hides the grid from the a11y tree; release on the window.
  await page.evaluate(
    (init) => window.dispatchEvent(new PointerEvent("pointerup", init)),
    { ...at, buttons: 0 },
  );

  const sheet = page.getByRole("dialog");
  await expect(sheet).toBeVisible();
  await expect(sheet.getByText("Berta")).toBeVisible();
  // A press paints nothing by itself.
  await expect(page.getByText("Cambios sin guardar")).toHaveCount(0);

  // A quick tap still paints.
  await page.keyboard.press("Escape");
  await expect(sheet).toHaveCount(0);
  await dayCell(page, 12).tap();
  await expect(page.getByText("Cambios sin guardar")).toBeVisible();

  await Promise.all([close(), ctx.close()]);
});
