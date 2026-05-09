import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "@/lib/axios";
import { getAdminDashboardStats } from "@/lib/dashboardApi";

vi.mock("@/lib/axios", () => ({
  default: {
    get: vi.fn(),
  },
}));

const mockedGet = vi.mocked(api.get);

describe("dashboardApi", () => {
  beforeEach(() => {
    mockedGet.mockReset();
  });

  it("maps aggregate adherence response to admin summary cards", async () => {
    mockedGet.mockResolvedValueOnce({ data: { data: { totalActivePatients: 12, totalScheduled: 34, averageAdherenceRate: 88 } } });

    const result = await getAdminDashboardStats();

    expect(mockedGet).toHaveBeenCalledWith("/adherence/aggregate", { params: { period: "30d" } });
    expect(result.stats.map((stat) => [stat.label, stat.value])).toEqual([
      ["Total Perawat", "-"],
      ["Total Pasien", "12"],
      ["Jadwal Aktif", "34"],
    ]);
  });
});
