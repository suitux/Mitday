import { expect, test, type BrowserContext } from "@playwright/test";
import { createDayPlan, dayCell, joinAs, testLogin, uid } from "./helpers";

/**
 * Headless Chromium has no push service: fake the PushManager so the flow
 * (permission → subscribe → server action) runs end to end.
 */
async function fakePush(context: BrowserContext) {
  await context.addInitScript(() => {
    const key = "__fakePushSub";
    const make = () => ({
      endpoint: `https://push.example.com/${Math.random().toString(36).slice(2)}`,
      toJSON() {
        return {
          endpoint: this.endpoint,
          keys: { p256dh: "BFake_p256dh-key", auth: "fake-auth" },
        };
      },
      unsubscribe: async () => {
        (window as unknown as Record<string, unknown>)[key] = null;
        return true;
      },
    });
    const w = window as unknown as Record<string, unknown>;
    if (!("PushManager" in window)) return;
    // Headless Chromium reports "denied" even after grantPermissions.
    Object.defineProperty(Notification, "permission", { get: () => "granted" });
    Notification.requestPermission = async () => "granted";
    PushManager.prototype.getSubscription = async function () {
      return (w[key] as PushSubscription | null) ?? null;
    };
    PushManager.prototype.subscribe = async function () {
      w[key] ??= make();
      return w[key] as PushSubscription;
    };
  });
}

test("guest is offered notifications after saving and can turn them on", async ({
  browser,
}) => {
  const owner = await browser.newContext({ locale: "es-ES" });
  const ownerPage = await owner.newPage();
  await testLogin(ownerPage, "Ana");
  const { path } = await createDayPlan(ownerPage, `Push ${uid()}`);

  const guest = await browser.newContext({ locale: "es-ES" });
  await fakePush(guest);
  const g = await guest.newPage();
  await joinAs(g, path, "Berta");
  // Nothing to be told about before the first save.
  await expect(
    g.getByRole("heading", { name: "¿Te avisamos cuando haya fecha?" }),
  ).toHaveCount(0);

  await dayCell(g, 11).click();
  await g.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(
    g.getByRole("heading", { name: "¿Te avisamos cuando haya fecha?" }),
  ).toBeVisible();
  await g.getByRole("button", { name: "Activar notificaciones" }).click();
  await expect(
    g.getByText("Notificaciones activadas en este dispositivo."),
  ).toBeVisible();

  // The plan page's manifest opens the installed app with the guest's identity.
  const manifest = await g.locator('link[rel="manifest"]').getAttribute("href");
  expect(decodeURIComponent(manifest ?? "")).toContain("/claim?k=");

  await g.getByRole("button", { name: "Desactivar" }).click();
  await expect(
    g.getByRole("button", { name: "Activar notificaciones" }),
  ).toBeVisible();
});

test("creator is offered notifications on the dashboard", async ({
  browser,
}) => {
  const context = await browser.newContext({ locale: "es-ES" });
  await fakePush(context);
  const page = await context.newPage();
  await testLogin(page, "Carla");
  await page.goto("/es/dashboard");
  await expect(
    page.getByRole("heading", {
      name: "¿Te avisamos cuando alguien responda?",
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Ahora no" }).click();
  // Dismissed: a quiet way back in remains.
  await expect(
    page.getByRole("heading", {
      name: "¿Te avisamos cuando alguien responda?",
    }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Activar notificaciones" }),
  ).toBeVisible();
});

test("iPhone Safari outside the home screen gets install steps", async ({
  browser,
}) => {
  const context = await browser.newContext({
    locale: "es-ES",
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  });
  // Safari only exposes PushManager to home-screen apps.
  await context.addInitScript(() => {
    delete (window as unknown as Record<string, unknown>).PushManager;
  });
  const page = await context.newPage();
  await testLogin(page, "Dani");
  await page.goto("/es/dashboard");
  await expect(
    page.getByRole("heading", { name: "Notificaciones en iPhone y iPad" }),
  ).toBeVisible();
  await expect(
    page.getByText("Elige «Añadir a pantalla de inicio» y confirma."),
  ).toBeVisible();
});

test("Instagram's in-app browser on iPhone is sent to Safari with the personal link", async ({
  browser,
}) => {
  const owner = await browser.newContext({ locale: "es-ES" });
  const ownerPage = await owner.newPage();
  await testLogin(ownerPage, "Ana");
  const { path } = await createDayPlan(ownerPage, `Push ${uid()}`);

  const context = await browser.newContext({
    locale: "es-ES",
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 337.0.3.23.54 (iPhone14,5; iOS 17_5; es_ES; es; scale=3.00; 1170x2532; 618023787)",
  });
  await context.addInitScript(() => {
    delete (window as unknown as Record<string, unknown>).PushManager;
  });
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const g = await context.newPage();
  await joinAs(g, path, "Berta");
  await dayCell(g, 11).click();
  await g.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(
    g.getByRole("heading", {
      name: "Ábrelo en Safari para recibir notificaciones",
    }),
  ).toBeVisible();
  await g.getByRole("button", { name: "Copiar enlace" }).click();
  const copied = await g.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain("/claim?k=");
});

test("iOS before 16.4 is not told to install", async ({ browser }) => {
  const context = await browser.newContext({
    locale: "es-ES",
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 16_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.3 Mobile/15E148 Safari/604.1",
  });
  await context.addInitScript(() => {
    delete (window as unknown as Record<string, unknown>).PushManager;
  });
  const page = await context.newPage();
  await testLogin(page, "Eva");
  await page.goto("/es/dashboard");
  await expect(page.getByRole("heading", { name: "Mis planes" })).toBeVisible();
  // Give the client effect time to run before asserting absence.
  await page.waitForTimeout(1000);
  await expect(page.getByText("Notificaciones en iPhone y iPad")).toHaveCount(
    0,
  );
});
