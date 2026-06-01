import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "@/lib/axios";
import { clearActivityReadCache, getActivityReadIdsFromApi, getActivityUnreadCountFromApi, markAllUnreadViaApi } from "@/lib/activityReadApi";

vi.mock("@/lib/axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const mockedGet = vi.mocked(api.get);
const mockedPost = vi.mocked(api.post);

describe("activityReadApi", () => {
  beforeEach(() => {
    mockedGet.mockReset();
    mockedPost.mockReset();
    clearActivityReadCache({ clearKnownReadIds: true });
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

  it("paginates read lookups when the displayed activity id list is longer than one page", async () => {
    mockedGet
      .mockResolvedValueOnce({ data: { data: [{ activityId: "activity-1" }], meta: { page: 1, limit: 1, total: 2 } } })
      .mockResolvedValueOnce({ data: { data: [{ activityId: "activity-2" }], meta: { page: 2, limit: 1, total: 2 } } });

    const readIds = await getActivityReadIdsFromApi({ activityIds: ["activity-1", "activity-2"], limit: 1, paginateAll: true });

    expect(readIds).toEqual(new Set(["activity-1", "activity-2"]));
    expect(mockedGet).toHaveBeenNthCalledWith(1, "/activity-reads", { params: { page: 1, limit: 1, activity_ids: "activity-1,activity-2" } });
    expect(mockedGet).toHaveBeenNthCalledWith(2, "/activity-reads", { params: { page: 2, limit: 1, activity_ids: "activity-1,activity-2" } });
  });

  it("sends displayed activity ids when marking every unread item as read", async () => {
    mockedPost.mockResolvedValueOnce({ data: { data: { count: 2 } } });

    await markAllUnreadViaApi([" activity-1 ", "activity-1", "activity-2"]);

    expect(mockedPost).toHaveBeenCalledWith("/activity-reads/mark-all-unread", { activityIds: ["activity-1", "activity-2"] });
  });

  it("keeps server-returned mark-all ids as known read state for cached activity pages", async () => {
    mockedPost.mockResolvedValueOnce({ data: { data: { count: 2, activityIds: ["server-1", "server-2"] } } });
    mockedGet.mockResolvedValueOnce({ data: { data: [], meta: { page: 1, limit: 1, total: 0 } } });

    await markAllUnreadViaApi(["activity-1"]);
    const readIds = await getActivityReadIdsFromApi({ activityIds: ["server-2"], limit: 1 });

    expect(readIds.has("activity-1")).toBe(true);
    expect(readIds.has("server-1")).toBe(true);
    expect(readIds.has("server-2")).toBe(true);
  });

  it("keeps unread count cache scoped per dashboard user role", async () => {
    mockedGet
      .mockResolvedValueOnce({ data: { data: { count: 2 } } })
      .mockResolvedValueOnce({ data: { data: { count: 0 } } });

    await expect(getActivityUnreadCountFromApi({ scopeKey: "nurse:nurse-1" })).resolves.toBe(2);
    await expect(getActivityUnreadCountFromApi({ scopeKey: "patient:patient-1" })).resolves.toBe(0);
    await expect(getActivityUnreadCountFromApi({ scopeKey: "nurse:nurse-1" })).resolves.toBe(2);

    expect(mockedGet).toHaveBeenCalledTimes(2);
    expect(mockedGet).toHaveBeenNthCalledWith(1, "/activity-reads/unread-count");
    expect(mockedGet).toHaveBeenNthCalledWith(2, "/activity-reads/unread-count");
  });
});
