import { expect, test } from "@playwright/test";
import { gotoApp, loginAs } from "./helpers/auth";
import { mockCommonApi } from "./helpers/api";

test("super_admin dashboard redirects to admin approvals", async ({ context, page }) => {
  await loginAs(context, page, "super_admin");
  await mockCommonApi(page);

  await gotoApp(page, "/dashboard");

  await expect(page).toHaveURL(/\/admin-approvals/);
  await expect(page.getByRole("heading", { name: "Persetujuan Admin" })).toBeVisible();
});

test("admin can open nurses and cannot open food scan", async ({ context, page }) => {
  await loginAs(context, page, "admin");
  await mockCommonApi(page);

  await gotoApp(page, "/nurses");
  await expect(page.getByText("Daftar Perawat")).toBeVisible();

  await gotoApp(page, "/food-scan");
  await expect(page).toHaveURL(/\/dashboard/);
});

test("nurse can open patients", async ({ context, page }) => {
  await loginAs(context, page, "nurse");
  await mockCommonApi(page);

  await gotoApp(page, "/patients");

  await expect(page.getByText("Daftar Pasien")).toBeVisible();
  await expect(page.getByText("Budi Santoso").first()).toBeVisible();
});

test("patient can open food scan and is blocked from patients", async ({ context, page }) => {
  await loginAs(context, page, "patient");
  await mockCommonApi(page);

  await gotoApp(page, "/food-scan");
  await expect(page.getByText("Scan Makanan").first()).toBeVisible();

  await gotoApp(page, "/patients");
  await expect(page).toHaveURL(/\/dashboard/);
});
