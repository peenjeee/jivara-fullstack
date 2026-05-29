import { expect, test } from "@playwright/test";
import { gotoApp, loginAs } from "./helpers/auth";
import { mockCommonApi } from "./helpers/api";

test("admin patient list search flow", async ({ context, page }) => {
  await loginAs(context, page, "admin");
  await mockCommonApi(page);

  await gotoApp(page, "/patients");
  await page.getByPlaceholder("Cari nama pasien ...").fill("Ayu");

  await expect(page.getByText("Ayu Lestari").first()).toBeVisible();
  await expect(page.getByText("Budi Santoso")).toHaveCount(0);
});

test("admin schedule list search flow", async ({ context, page }) => {
  await loginAs(context, page, "admin");
  await mockCommonApi(page);

  await gotoApp(page, "/schedule");

  await expect(page.getByRole("heading", { name: "Jadwal Obat" })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("row", { name: /Budi Santoso/ })).toBeVisible({ timeout: 15_000 });
  await page.getByPlaceholder("Cari nama pasien ...").fill("zzz");
  await expect(page.getByText("Tidak ada data jadwal.").first()).toBeVisible();
});

test("activity log critical filter flow", async ({ context, page }) => {
  await loginAs(context, page, "admin");
  await mockCommonApi(page);

  await gotoApp(page, "/activity-log");
  await page.getByRole("button", { name: "Kritis" }).click();

  await expect(page.getByText("Budi Santoso menjalankan Medication Missed pada Medication Schedule (SCH-001).")).toBeVisible();
});
