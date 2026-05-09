import { expect, test } from "@playwright/test";
import { loginAs } from "./helpers/auth";
import { mockCommonApi } from "./helpers/api";

test("admin patient list search flow", async ({ context, page }) => {
  await loginAs(context, page, "admin");
  await mockCommonApi(page);

  await page.goto("/patients");
  await page.getByPlaceholder("Cari nama pasien ...").fill("Ayu");

  await expect(page.getByText("Ayu Lestari").first()).toBeVisible();
  await expect(page.getByText("Budi Santoso")).toHaveCount(0);
});

test("admin schedule list search flow", async ({ context, page }) => {
  await loginAs(context, page, "admin");
  await mockCommonApi(page);

  await page.goto("/schedule");

  await expect(page.getByText("Budi Santoso").first()).toBeVisible();
  await page.getByPlaceholder("Cari nama pasien ...").fill("zzz");
  await expect(page.getByText("Tidak ada data jadwal.").first()).toBeVisible();
});

test("activity log critical filter flow", async ({ context, page }) => {
  await loginAs(context, page, "admin");
  await mockCommonApi(page);

  await page.goto("/activity-log");
  await page.getByRole("button", { name: "Kritis" }).click();

  await expect(page.getByText("Budi belum minum obat.")).toBeVisible();
});
