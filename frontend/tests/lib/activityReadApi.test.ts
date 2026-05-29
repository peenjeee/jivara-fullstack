import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "@/lib/axios";
import { clearActivityReadCache, getActivityReadIdsFromApi } from "@/lib/activityReadApi";

vi.mock("@/lib/axios", () => ({
  default: {
    get: vi.fn(),
  },
}));

const mockedGet = vi.mocked(api.get);

describe("activityReadApi", () => {
  beforeEach(() => {
    mockedGet.mockReset();
    clearActivityReadCache();
  });

  it("keeps the patient calendar default as a full 100-item paginated read lookup", async () => {
    mockedGet
      .mockResolvedValueOnce({ data: { data: [{ activityId: "activity-1" }], meta: { page: 1, limit: 100, total: 2 } } })
      .mockResolvedValueOnce({ data: { data: [{ activityId: "activity-2" }], meta: { page: 2, limit: 100, total: 2 } } });

    const readIds = await getActivityReadIdsFromApi();

    expect(readIds).toEqual(new Set(["activity-1", "activity-2"]));
    expect(mockedGet).toHaveBeenNthCalledWith(1, "/activity-reads", { params: { page: 1, limit: 100 } });
    expect(mockedGet).toHaveBeenNthCalledWith(2, "/activity-reads", { params: { page: 2, limit: 100 } });
  });

  it("loads one 10-item page for nurse activity log read status", async () => {
    mockedGet.mockResolvedValueOnce({ data: { data: [{ activityId: "activity-11" }], meta: { page: 2, limit: 10, total: 99 } } });

    const readIds = await getActivityReadIdsFromApi({ page: 2, limit: 10, paginateAll: false });

    expect(readIds).toEqual(new Set(["activity-11"]));
    expect(mockedGet).toHaveBeenCalledOnce();
    expect(mockedGet).toHaveBeenCalledWith("/activity-reads", { params: { page: 2, limit: 10 } });
  });

  it("can check read status for the activity ids currently displayed", async () => {
    mockedGet.mockResolvedValueOnce({ data: { data: [{ activityId: "audit-1" }], meta: { page: 1, limit: 2, total: 1 } } });

    const readIds = await getActivityReadIdsFromApi({ activityIds: ["audit-1", "notification-1"], limit: 2 });

    expect(readIds).toEqual(new Set(["audit-1"]));
    expect(mockedGet).toHaveBeenCalledWith("/activity-reads", { params: { page: 1, limit: 2, activity_ids: "audit-1,notification-1" } });
  });
});
