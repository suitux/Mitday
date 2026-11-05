import { devices, expect, test, type Page } from "@playwright/test";
import { createDayPlan, dayCell, joinAs, testLogin, uid } from "./helpers";

/** Real touch swipe through CDP, so the browser scrolls / cancels as on a phone. */
async function swipe(
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
  steps = 12,
) {
  const cdp = await page.context().newCDPSession(page);
  const point = (x: number, y: number) => [{ x, y, id: 1 }];
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: point(from.x, from.y),
  });
  for (let i = 1; i <= steps; i++) {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: point(
        from.x + ((to.x - from.x) * i) / steps,
        from.y + ((to.y - from.y) * i) / steps,
      ),
    });
  }
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await cdp.detach();
}

async function center(page: Page, day: number) {
  const box = await dayCell(page, day).boundingBox();
  if (!box) throw new Error("cell not visible");
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

test("scrolling over the calendar never paints; a sideways swipe does @mobile", async ({
  browser,
}) => {
  const owner = await browser.newContext({ locale: "es-ES" });
  const p = await owner.newPage();
  await testLogin(p, "Ines");
  const { path } = await createDayPlan(p, `Scroll ${uid()}`);

  const ctx = await browser.newContext({
    ...devices["Pixel 7"],
    locale: "es-ES",
  });
  const page = await ctx.newPage();
  await joinAs(page, path, "Joan");

  // Vertical swipe starting on a cell: page scrolls, nothing painted.
  const start = await center(page, 10);
  await swipe(page, start, { x: start.x, y: start.y - 160 });
  await page.waitForTimeout(300);
  await expect(page.getByText("Cambios sin guardar")).toHaveCount(0);
  await expect(dayCell(page, 10)).not.toHaveAccessibleName(/Sí/);

  // Sideways swipe from day 10 to 12 paints the three days.
  const a = await center(page, 10);
  const b = await center(page, 12);
  await swipe(page, a, b);
  await expect(page.getByText("Cambios sin guardar")).toBeVisible();
  for (const d of [10, 11, 12])
    await expect(dayCell(page, d)).toHaveAccessibleName(/Sí/);

  await Promise.all([owner.close(), ctx.close()]);
});
