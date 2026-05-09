import type { Page } from "@playwright/test";

export async function mockCommonApi(page: Page) {
  await page.route("**/api/adherence/aggregate**", async (route) => {
    await route.fulfill({ json: { data: { totalActivePatients: 2, averageAdherenceRate: 88, totalScheduled: 3 } } });
  });

  await page.route("**/api/patients**", async (route) => {
    await route.fulfill({
      json: {
        data: [
          { id: "JVR-01", fullName: "Budi Santoso", email: "budi@test.local", phone: "6281", dateOfBirth: "1976-01-01", gender: "male", createdAt: "2026-05-09T08:00:00.000Z" },
          { id: "JVR-02", fullName: "Ayu Lestari", email: "ayu@test.local", phone: "6282", dateOfBirth: "1980-01-01", gender: "female", createdAt: "2026-05-09T08:00:00.000Z" },
        ],
        meta: { total: 2 },
      },
    });
  });

  await page.route("**/api/alerts**", async (route) => {
    await route.fulfill({
      json: {
        data: [{ id: "alert-1", status: "missed", severity: "critical", patientId: "JVR-01", patientName: "Budi Santoso", scheduleId: "SCH-001", drugName: "Metformin", dosage: "500 mg", scheduledTime: "2026-05-09T08:00:00.000Z", message: "Budi belum minum obat." }],
      },
    });
  });

  await page.route("**/api/medication-schedules**", async (route) => {
    await route.fulfill({
      json: {
        data: [{ id: "SCH-001", patientId: "JVR-01", drugName: "Metformin", dosage: "500 mg", frequency: 2, scheduledTimes: ["08:00"], instructions: "Sesudah makan", isActive: true, createdAt: "2026-05-09T08:00:00.000Z" }],
      },
    });
  });

  await page.route("**/api/nurses**", async (route) => {
    await route.fulfill({
      json: {
        data: [{ id: "NRS-001", fullName: "Suster Nina", email: "nina@test.local", phone: "6283", gender: "female", isActive: true, createdAt: "2026-05-09T08:00:00.000Z" }],
      },
    });
  });

  await page.route("**/api/auth/admin-approvals**", async (route) => {
    await route.fulfill({
      json: {
        data: {
          users: [{ id: "admin-new", fullName: "Admin Baru", email: "new@test.local", role: "admin", accountStatus: "pending", age: 30, createdAt: "2026-05-09T08:00:00.000Z" }],
          summary: { pending: 1, active: 0, rejected: 0, suspended: 0 },
        },
      },
    });
  });
}
