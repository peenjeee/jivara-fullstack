import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "@/lib/axios";
import { getAdminDashboardStats } from "@/lib/dashboardApi";
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
    clearNursesCache();
  });

  it("maps aggregate adherence response to admin summary cards", async () => {
    mockedGet.mockResolvedValueOnce({ data: { data: { totalActivePatients: 12, totalScheduled: 34, averageAdherenceRate: 88 } } });
    mockedGet.mockResolvedValueOnce({ data: { data: [
      { id: "nurse-1", user: { fullName: "Nina", email: "nina@test.local", phone: "6281" }, gender: "female", isActive: true, createdAt: "2026-05-09T08:00:00.000Z" },
      { id: "nurse-2", user: { fullName: "Rani", email: "rani@test.local", phone: "6282" }, gender: "female", isActive: true, createdAt: "2026-05-09T08:00:00.000Z" },
    ] } });

    const result = await getAdminDashboardStats();

    expect(mockedGet).toHaveBeenCalledWith("/adherence/aggregate");
    expect(mockedGet).toHaveBeenCalledWith("/nurses", { params: { limit: 100 } });
    expect(result.stats.map((stat) => [stat.label, stat.value])).toEqual([
      ["Total Perawat Saya", "2"],
      ["Total Pasien Saya", "12"],
      ["Jadwal Pasien Aktif", "34"],
    ]);
  });
});
