import type { Page, Route } from "@playwright/test";

const appOrigin = `http://localhost:${process.env.PLAYWRIGHT_PORT ?? 3100}`;

const corsHeaders = {
  "Access-Control-Allow-Origin": appOrigin,
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Allow-Headers": "accept, authorization, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
};

const fulfillJson = async (route: Route, json: unknown) => {
  if (route.request().method() === "OPTIONS") {
    await route.fulfill({ status: 204, headers: corsHeaders });
    return;
  }

  await route.fulfill({ headers: corsHeaders, json });
};

export async function mockCommonApi(page: Page) {
  await page.route(/\/api\/(?:v\d+\/)?adherence\/aggregate(?:\?.*)?$/, async (route) => {
    await fulfillJson(route, { data: { totalActivePatients: 2, averageAdherenceRate: 88, totalScheduled: 3 } });
  });

  await page.route(/\/api\/(?:v\d+\/)?adherence(?:\?.*)?$/, async (route) => {
    const url = new URL(route.request().url());
    const patientId = url.searchParams.get("patient_id") || url.searchParams.get("patientId");
    const adherenceRate = patientId === "JVR-02" ? 100 : 45;
    await fulfillJson(route, {
      data: {
        patientId,
        adherenceRate,
        totalScheduled: 2,
        totalConfirmed: patientId === "JVR-02" ? 2 : 1,
        totalMissed: patientId === "JVR-02" ? 0 : 1,
        dailyBreakdown: [{ date: "2026-05-09", scheduled: 2, confirmed: patientId === "JVR-02" ? 2 : 1, missed: patientId === "JVR-02" ? 0 : 1, snoozed: 0 }],
      },
    });
  });

  await page.route(/\/api\/(?:v\d+\/)?patients(?:\?.*)?$/, async (route) => {
    const url = new URL(route.request().url());
    const searchParam = url.searchParams.get("search")?.toLowerCase().trim() || "";
    const allPatients = [
      { id: "JVR-01", fullName: "Budi Santoso", email: "budi@test.local", phone: "6281", dateOfBirth: "1976-01-01", gender: "male", createdAt: "2026-05-09T08:00:00.000Z" },
      { id: "JVR-02", fullName: "Ayu Lestari", email: "ayu@test.local", phone: "6282", dateOfBirth: "1980-01-01", gender: "female", createdAt: "2026-05-09T08:00:00.000Z" },
    ];
    const filtered = searchParam
      ? allPatients.filter((p) => p.fullName.toLowerCase().includes(searchParam) || (p.email?.toLowerCase().includes(searchParam)))
      : allPatients;
    await fulfillJson(route, {
      data: filtered,
      meta: { total: filtered.length },
    });
  });

  await page.route(/\/api\/(?:v\d+\/)?alerts(?:\?.*)?$/, async (route) => {
    await fulfillJson(route, {
      data: [{ id: "alert-1", status: "missed", severity: "critical", patientId: "JVR-01", patientName: "Budi Santoso", scheduleId: "SCH-001", drugName: "Metformin", dosage: "500 mg", scheduledTime: "2026-05-09T08:00:00.000Z", message: "Budi belum minum obat." }],
    });
  });

  await page.route(/\/api\/(?:v\d+\/)?audit-logs(?:\?.*)?$/, async (route) => {
    await fulfillJson(route, {
      data: [{
        id: "audit-critical-1",
        userId: "JVR-01",
        userName: "Budi Santoso",
        userEmail: "budi@test.local",
        action: "medication.missed",
        resourceType: "medication_schedule",
        resourceId: "SCH-001",
        createdAt: "2026-05-09T08:00:00.000Z",
      }],
      meta: { page: 1, limit: 10, total: 1, summary: { warningCritical: 1, today: 1 } },
    });
  });

  await page.route(/\/api\/(?:v\d+\/)?notifications(?:\?.*)?$/, async (route) => {
    await fulfillJson(route, {
      data: [{ id: "1", patientId: "JVR-01", type: "adherence", title: "Alert", body: "Budi belum minum obat.", status: "delivered", urgency: "critical", createdAt: "2026-05-09T08:00:00.000Z" }],
      meta: { page: 1, limit: 100, total: 1 },
    });
  });

  await page.route(/\/api\/(?:v\d+\/)?medication-schedules(?:\/.*)?(?:\?.*)?$/, async (route) => {
    const url = new URL(route.request().url());
    const searchParam = url.searchParams.get("search")?.toLowerCase().trim() || "";
    // Return patient-groups format if the path includes /patient-groups
    if (url.pathname.includes("/patient-groups")) {
      const allPatients = [
        { id: "JVR-01", fullName: "Budi Santoso", email: "budi@test.local", phone: "6281", dateOfBirth: "1976-01-01", gender: "male", createdAt: "2026-05-09T08:00:00.000Z" },
        { id: "JVR-02", fullName: "Ayu Lestari", email: "ayu@test.local", phone: "6282", dateOfBirth: "1980-01-01", gender: "female", createdAt: "2026-05-09T08:00:00.000Z" },
      ];
      const filteredPatients = searchParam
        ? allPatients.filter((p) => p.fullName.toLowerCase().includes(searchParam))
        : allPatients;
      const filteredSchedules = searchParam
        ? [{ id: "SCH-001", patientId: "JVR-01", drugName: "Metformin", dosage: "500 mg", frequency: 2, scheduledTimes: ["08:00"], instructions: "Sesudah makan", isActive: true, createdAt: "2026-05-09T08:00:00.000Z" }].filter((s) => filteredPatients.some((p) => p.id === s.patientId))
        : [{ id: "SCH-001", patientId: "JVR-01", drugName: "Metformin", dosage: "500 mg", frequency: 2, scheduledTimes: ["08:00"], instructions: "Sesudah makan", isActive: true, createdAt: "2026-05-09T08:00:00.000Z" }];
      await fulfillJson(route, {
        data: {
          patients: filteredPatients,
          schedules: filteredSchedules,
        },
        meta: { page: 1, limit: 10, total: filteredSchedules.length },
      });
    } else {
      // Plain schedule list fallback
      await fulfillJson(route, {
        data: [{ id: "SCH-001", patientId: "JVR-01", drugName: "Metformin", dosage: "500 mg", frequency: 2, scheduledTimes: ["08:00"], instructions: "Sesudah makan", isActive: true, createdAt: "2026-05-09T08:00:00.000Z" }],
      });
    }
  });

  await page.route(/\/api\/(?:v\d+\/)?nurses(?:\?.*)?$/, async (route) => {
    await fulfillJson(route, {
      data: [{ id: "NRS-001", fullName: "Suster Nina", email: "nina@test.local", phone: "6283", gender: "female", isActive: true, createdAt: "2026-05-09T08:00:00.000Z" }],
    });
  });

  await page.route(/\/api\/(?:v\d+\/)?auth\/admin-approvals(?:\?.*)?$/, async (route) => {
    await fulfillJson(route, {
      data: {
        users: [{ id: "admin-new", fullName: "Admin Baru", email: "new@test.local", role: "admin", accountStatus: "pending", age: 30, createdAt: "2026-05-09T08:00:00.000Z" }],
        summary: { pending: 1, active: 0, rejected: 0, suspended: 0 },
      },
    });
  });
}
