import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "@/lib/axios";
import { clearDashboardCache, getAdminDashboardData, getAdminDashboardStats } from "@/lib/dashboardApi";
import { clearNursesCache } from "@/lib/nurseApi";

vi.mock("@/lib/axios", () => ({
  default: {
    get: vi.fn(),
  },
}));

const mockedGet = vi.mocked(api.get);

describe("dashboardApi", () => {
  beforeEach(() => {
    mockedGet.mockReset();
    clearDashboardCache();
    clearNursesCache();
  });

  it("maps aggregate adherence response to admin summary cards", async () => {
    mockedGet.mockResolvedValueOnce({ data: { data: { totalActivePatients: 12, totalScheduled: 34, averageAdherenceRate: 88 } } });
    mockedGet.mockResolvedValueOnce({ data: { data: [
      { id: "nurse-1", user: { fullName: "Nina", email: "nina@test.local", phone: "6281" }, gender: "female", isActive: true, createdAt: "2026-05-09T08:00:00.000Z" },
    ], meta: { total: 2 } } });
    mockedGet.mockResolvedValueOnce({ data: { data: [
      { id: "patient-1", fullName: "Pina", isActive: true },
    ], meta: { total: 14 } } });

    const result = await getAdminDashboardStats();

    expect(mockedGet).toHaveBeenCalledWith("/adherence/aggregate");
    expect(mockedGet).toHaveBeenCalledWith("/nurses", { params: { limit: 1, status: "all" } });
    expect(mockedGet).toHaveBeenCalledWith("/patients", { params: { limit: 1, status: "all" } });
    expect(result.stats.map((stat) => [stat.label, stat.value])).toEqual([
      ["Total Perawat Saya", "2"],
      ["Total Pasien Saya", "14"],
      ["Jadwal Pasien Aktif", "34"],
    ]);
  });

  it("counts inactive nurses in admin summary cards", async () => {
    mockedGet.mockResolvedValueOnce({ data: { data: { totalActivePatients: 12, totalScheduled: 34, averageAdherenceRate: 88 } } });
    mockedGet.mockResolvedValueOnce({ data: { data: [
      { id: "nurse-1", user: { fullName: "Nina", email: "nina@test.local", phone: "6281" }, gender: "female", isActive: true, createdAt: "2026-05-09T08:00:00.000Z" },
    ], meta: { total: 5 } } });
    mockedGet.mockResolvedValueOnce({ data: { data: [], meta: { total: 12 } } });

    const result = await getAdminDashboardStats();

    expect(result.stats.find((stat) => stat.label === "Total Perawat Saya")?.value).toBe("5");
  });

  it("counts inactive patients in admin summary cards while keeping active schedules", async () => {
    mockedGet.mockResolvedValueOnce({ data: { data: { totalActivePatients: 8, totalScheduled: 34, totalActiveSchedules: 6, averageAdherenceRate: 88 } } });
    mockedGet.mockResolvedValueOnce({ data: { data: [], meta: { total: 5 } } });
    mockedGet.mockResolvedValueOnce({ data: { data: [
      { id: "patient-1", fullName: "Pina", isActive: true },
    ], meta: { total: 11 } } });

    const result = await getAdminDashboardStats();

    expect(result.stats.map((stat) => [stat.label, stat.value])).toEqual([
      ["Total Perawat Saya", "5"],
      ["Total Pasien Saya", "11"],
      ["Jadwal Pasien Aktif", "6"],
    ]);
  });

  it("uses the admin dashboard response for inactive nurse reassign warnings without extra requests", async () => {
    mockedGet.mockResolvedValueOnce({ data: { data: {
      summary: { totalNurses: 5, totalPatients: 12, totalActiveSchedules: 0, inactiveNurseReassignCount: 1 },
      nurseFollowUps: [{
        nurse: {
          id: "nurse-1",
          fullName: "Ns. Luis Parisian V",
          email: "nurse1@jivara.test",
          phone: "6286056714045",
          gender: "Pria",
          status: "Nonaktif",
          joinedAt: "",
          temporaryPassword: false,
          assignedPatients: 2,
        },
        assignedPatientCount: 2,
        riskyPatientCount: 0,
      }],
      riskyPatients: [],
      priorityActivities: [],
    } } });

    const result = await getAdminDashboardData();

    expect(mockedGet).toHaveBeenCalledWith("/admin-dashboard");
    expect(mockedGet).toHaveBeenCalledTimes(1);
    expect(result.inactiveNurseReassignCount).toBe(1);
    expect(result.nurseFollowUps[0]).toMatchObject({
      nurse: { id: "nurse-1", status: "Nonaktif" },
      assignedPatientCount: 2,
    });
  });

});
