import { expect, test } from "playwright/test";

test("loads the isolated mature dependency smoke registry", async ({ page }) => {
  const consoleErrors: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  page.on("pageerror", (error) => {
    consoleErrors.push(`${error.name}: ${error.message}`);
  });

  await page.goto("/");
  await expect(page.locator("#app")).toContainText("Sinan mature dependency spikes");

  const catalogKeys = await page.evaluate(() =>
    Object.keys((window as Window & { sinanMatureDependencySmokeCatalog?: Record<string, unknown> }).sinanMatureDependencySmokeCatalog ?? {})
  );

  expect(catalogKeys.sort()).toEqual([
    "audioSystem",
    "comlink",
    "dexie",
    "physicsAdapter",
    "rapier",
    "recast",
    "spector",
    "storageAdapter",
    "webAudio",
    "workerTaskAdapter"
  ]);
  expect(consoleErrors).toEqual([]);
});
