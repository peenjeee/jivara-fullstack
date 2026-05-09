import { expect, test } from "@playwright/test";

test("landing page exposes auth entry", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("link", { name: /masuk/i }).first()).toBeVisible();
  await page.getByRole("link", { name: /masuk/i }).first().click();
  await expect(page).toHaveURL(/\/login/);
});

test("login validates empty fields", async ({ page }) => {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");

  await page.getByRole("button", { name: /masuk/i }).click();

  await expect(page.getByText("Harap isi semua kolom yang tersedia.")).toBeVisible();
});

test("login success stores auth and redirects", async ({ page }) => {
  await page.route("**/api/auth/login", async (route) => {
    await route.fulfill({
      json: {
        data: {
          access_token: "e2e-token",
          user: { id: "nurse-1", fullName: "Nurse Test", email: "nurse@test.local", role: "nurse", accountStatus: "active", age: 28 },
        },
      },
    });
  });
  await page.route("**/api/auth/status", async (route) => {
    await route.fulfill({
      json: {
        data: { user: { id: "nurse-1", fullName: "Nurse Test", email: "nurse@test.local", role: "nurse", accountStatus: "active", age: 28 } },
      },
    });
  });

  await page.goto("/login?callbackUrl=/dashboard");
  await page.waitForLoadState("networkidle");
  await page.getByLabel(/email/i).fill("nurse@test.local");
  await page.getByLabel(/kata sandi/i).fill("secret123");
  await page.getByRole("button", { name: /masuk/i }).click();

  await expect(page).toHaveURL(/\/dashboard/);
});
