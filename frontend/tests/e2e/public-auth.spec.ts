import { expect, test } from "@playwright/test";
import { gotoApp, waitForHydration } from "./helpers/auth";

test("landing page exposes auth entry", async ({ page }) => {
  await gotoApp(page, "/");

  await expect(page.getByRole("link", { name: /masuk/i }).first()).toBeVisible();
  await page.getByRole("link", { name: /masuk/i }).first().click();
  await expect(page).toHaveURL(/\/login/);
});

test("login validates empty fields", async ({ page }) => {
  await page.route("**/api/auth/refresh", async (route) => {
    await route.fulfill({ status: 401, json: { message: "Unauthenticated" } });
  });

  await gotoApp(page, "/login");
  await waitForHydration(page);

  await page.getByRole("button", { name: /masuk/i }).click();

  await expect(page.getByRole("alert")).toBeVisible();
});

test("login success stores auth and redirects", async ({ page }) => {
  const user = { id: "nurse-1", fullName: "Nurse Test", email: "nurse@test.local", role: "nurse", accountStatus: "active", age: 28 };

  await page.route("**/api/auth/refresh", async (route) => {
    await route.fulfill({ status: 401, json: { message: "Unauthenticated" } });
  });
  await page.route("**/api/auth/login", async (route) => {
    await route.fulfill({
      json: {
        data: {
          access_token: "e2e-token",
          user,
        },
      },
    });
  });
  await page.route("**/api/auth/status", async (route) => {
    await route.fulfill({
      json: {
        data: { user },
      },
    });
  });

  await gotoApp(page, "/login?callbackUrl=/dashboard");
  await waitForHydration(page);
  await page.getByLabel(/email/i).fill("nurse@test.local");
  await page.getByLabel(/^kata sandi/i).fill("secret123");
  await page.getByRole("button", { name: /masuk/i }).click();

  await expect(page).toHaveURL(/\/dashboard/);
});
