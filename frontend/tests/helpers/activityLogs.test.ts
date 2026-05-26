import { describe, expect, it, vi } from "vitest";
import { formatActivityTime, getActivityDateKey, getActivityDateLabel, getUnreadActivityCount, groupActivityLogsByDate } from "@/helpers/activityLogs";
import type { ActivityLogRecord } from "@/lib/mocks/activityLogs";

const makeLog = (id: string, timestamp: string, read = false, patientId = "P-1"): ActivityLogRecord => ({
  id,
  title: id,
  description: id,
  category: "Reminder",
  severity: "Info",
  timestamp,
  patientId,
  read,
});

describe("activity log helpers", () => {
  it("formats date key and time", () => {
    expect(getActivityDateKey("2026-05-09T08:30:00.000Z")).toBe("2026-05-09");
    expect(formatActivityTime("2026-05-09T08:30:00.000Z")).toMatch(/\d{2}\.\d{2}/);
  });

  it("labels today and yesterday relative to current date", () => {
    vi.setSystemTime(new Date("2026-05-09T12:00:00.000Z"));
    expect(getActivityDateLabel("2026-05-09T08:00:00.000Z")).toBe("Hari Ini");
    expect(getActivityDateLabel("2026-05-08T08:00:00.000Z")).toBe("Kemarin");
    vi.useRealTimers();
  });

  it("groups logs by date descending and sorts items by time descending", () => {
    const groups = groupActivityLogsByDate([
      makeLog("old-morning", "2026-05-08T08:00:00.000Z"),
      makeLog("new-evening", "2026-05-09T10:00:00.000Z"),
      makeLog("new-morning", "2026-05-09T07:00:00.000Z"),
    ]);

    expect(groups.map((group) => group.dateKey)).toEqual(["2026-05-09", "2026-05-08"]);
    expect(groups[0]?.items.map((item) => item.id)).toEqual(["new-evening", "new-morning"]);
  });

  it("counts unread logs globally or by patient", () => {
    const logs = [makeLog("a", "2026-05-09T08:00:00.000Z", false, "P-1"), makeLog("b", "2026-05-09T09:00:00.000Z", false, "P-2"), makeLog("c", "2026-05-09T10:00:00.000Z", true, "P-1")];
    expect(getUnreadActivityCount(logs)).toBe(2);
    expect(getUnreadActivityCount(logs, "P-1")).toBe(1);
  });
});
