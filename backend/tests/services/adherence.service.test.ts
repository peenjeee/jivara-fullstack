import { describe, expect, it } from "vitest";
import { __test__ } from "../../src/services/adherence.service";

describe("adherence service", () => {
  it("stops scheduled occurrences after a medication schedule is completed", () => {
    const completedDay = new Date();
    completedDay.setUTCHours(12, 0, 0, 0);
    completedDay.setUTCDate(completedDay.getUTCDate() - 1);
    const completedDateKey = completedDay.toISOString().slice(0, 10);

    const occurrences = __test__.buildScheduledOccurrences(
      3,
      [{
        id: "schedule-1",
        createdAt: new Date(`${completedDateKey}T00:00:00.000Z`),
        completedAt: completedDay,
        scheduledTimes: ["08:00", "20:00"],
        frequency: 2,
      }],
      [],
    );

    expect(occurrences.map((occurrence) => occurrence.scheduledTime.toISOString().slice(0, 10))).toEqual([completedDateKey, completedDateKey]);
  });

  it("uses the latest medication log date when completedAt is later than the last dose date", () => {
    const today = new Date();
    today.setUTCHours(12, 0, 0, 0);
    today.setUTCDate(today.getUTCDate() - 1);
    const createdAt = new Date(today);
    createdAt.setUTCDate(createdAt.getUTCDate() - 4);
    createdAt.setUTCHours(0, 0, 0, 0);
    const lastDoseDate = new Date(createdAt);
    lastDoseDate.setUTCDate(createdAt.getUTCDate() + 2);
    lastDoseDate.setUTCHours(8, 0, 0, 0);

    const occurrences = __test__.buildScheduledOccurrences(
      6,
      [{
        id: "schedule-1",
        createdAt,
        completedAt: today,
        scheduledTimes: ["08:00"],
        frequency: 1,
      }],
      [{ scheduleId: "schedule-1", scheduledTime: lastDoseDate, status: "confirmed" }],
    );

    expect(occurrences.map((occurrence) => occurrence.scheduledTime.toISOString().slice(0, 10))).toEqual([
      createdAt.toISOString().slice(0, 10),
      new Date(createdAt.getTime() + 86_400_000).toISOString().slice(0, 10),
      lastDoseDate.toISOString().slice(0, 10),
    ]);
  });

  it("starts the schedule window from createdAt even when medication logs predate it", () => {
    const firstLogDate = new Date();
    firstLogDate.setUTCHours(8, 0, 0, 0);
    firstLogDate.setUTCDate(firstLogDate.getUTCDate() - 6);
    const createdAt = new Date(firstLogDate);
    createdAt.setUTCDate(firstLogDate.getUTCDate() + 2);
    const lastLogDate = new Date(firstLogDate);
    lastLogDate.setUTCDate(firstLogDate.getUTCDate() + 4);
    lastLogDate.setUTCHours(20, 0, 0, 0);

    const occurrences = __test__.buildScheduledOccurrences(
      5,
      [{
        id: "schedule-1",
        createdAt,
        completedAt: null,
        stock: 0,
        isActive: true,
        scheduledTimes: ["08:00", "20:00"],
        frequency: 2,
      }],
      [
        { scheduleId: "schedule-1", scheduledTime: firstLogDate, status: "confirmed" },
        { scheduleId: "schedule-1", scheduledTime: lastLogDate, status: "confirmed" },
      ],
    );

    expect(occurrences[0]?.scheduledTime.toISOString().slice(0, 10)).toBe(createdAt.toISOString().slice(0, 10));
    expect(occurrences.at(-1)?.scheduledTime.toISOString().slice(0, 10)).toBe(lastLogDate.toISOString().slice(0, 10));
    expect(occurrences).toHaveLength(6);
  });

  it("matches schedule calendar by capping occurrences at 30 days after creation", () => {
    const today = new Date();
    today.setUTCHours(12, 0, 0, 0);
    today.setUTCDate(today.getUTCDate() - 1);
    const createdAt = new Date(today);
    createdAt.setUTCDate(today.getUTCDate() - 31);
    createdAt.setUTCHours(0, 0, 0, 0);
    const lastVisibleDay = new Date(createdAt);
    lastVisibleDay.setUTCDate(lastVisibleDay.getUTCDate() + 30);
    const lastVisibleDateKey = lastVisibleDay.toISOString().slice(0, 10);

    const occurrences = __test__.buildScheduledOccurrences(
      35,
      [{
        id: "schedule-1",
        createdAt,
        completedAt: null,
        scheduledTimes: ["08:00"],
        frequency: 1,
      }],
      [],
    );

    expect(occurrences.at(-1)?.scheduledTime.toISOString().slice(0, 10)).toBe(lastVisibleDateKey);
    expect(occurrences).toHaveLength(31);
  });

  it("does not mark a newly-created schedule as missed before any due occurrence exists", () => {
    const createdAt = new Date();
    const earlierToday = new Date(createdAt);
    earlierToday.setUTCHours(Math.max(createdAt.getUTCHours() - 1, 0), createdAt.getUTCMinutes(), 0, 0);
    const laterToday = new Date(createdAt);
    laterToday.setUTCHours(Math.min(createdAt.getUTCHours() + 1, 23), createdAt.getUTCMinutes(), 0, 0);

    const occurrences = __test__.buildScheduledOccurrences(
      1,
      [{
        id: "schedule-1",
        createdAt,
        completedAt: null,
        scheduledTimes: [
          `${String(earlierToday.getUTCHours()).padStart(2, "0")}:${String(earlierToday.getUTCMinutes()).padStart(2, "0")}`,
          `${String(laterToday.getUTCHours()).padStart(2, "0")}:${String(laterToday.getUTCMinutes()).padStart(2, "0")}`,
        ],
        frequency: 2,
      }],
      [],
    );

    expect(occurrences).toHaveLength(0);
  });
});
