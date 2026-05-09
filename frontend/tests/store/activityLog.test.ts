import { beforeEach, describe, expect, it } from "vitest";
import { useActivityLogStore } from "@/store/activityLog";
import type { ActivityLogRecord } from "@/lib/mocks/activityLogs";

const activity: ActivityLogRecord = {
  id: "act-1",
  title: "Reminder obat",
  description: "Obat dikirim",
  category: "Reminder",
  severity: "Info",
  timestamp: "2026-05-09T08:00:00.000Z",
  read: false,
};

describe("activity log store", () => {
  beforeEach(() => {
    useActivityLogStore.setState({ activities: [] });
  });

  it("sets and prepends activities", () => {
    useActivityLogStore.getState().setActivities([activity]);
    useActivityLogStore.getState().addActivity({ ...activity, id: "act-2", title: "Aktivitas baru" });

    expect(useActivityLogStore.getState().activities.map((item) => item.id)).toEqual(["act-2", "act-1"]);
  });

  it("marks one or all activities as read", () => {
    useActivityLogStore.getState().setActivities([activity, { ...activity, id: "act-2" }]);

    useActivityLogStore.getState().markAsRead("act-1");
    expect(useActivityLogStore.getState().activities).toEqual([
      expect.objectContaining({ id: "act-1", read: true }),
      expect.objectContaining({ id: "act-2", read: false }),
    ]);

    useActivityLogStore.getState().markAllAsRead();
    expect(useActivityLogStore.getState().activities.every((item) => item.read)).toBe(true);
  });
});
