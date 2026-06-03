import { describe, expect, it } from "vitest";
import { __test__, buildAdherenceStatsByPatientId } from "../../src/services/adherence.service";
import { addAppDays, getAppDateKey, getAppDateStartUtc, getTodayAppDateStartUtc } from "../../src/utils/app-timezone";

describe("adherence service", () => {
  it("stops scheduled occurrences after a medication schedule is completed", () => {
    const completedDay = new Date();
    completedDay.setUTCHours(12, 0, 0, 0);
    completedDay.setUTCDate(completedDay.getUTCDate() - 1);
    const completedDateKey = getAppDateKey(completedDay);

    const occurrences = __test__.buildScheduledOccurrences(
      3,
      [{
        id: "schedule-1",
        createdAt: getAppDateStartUtc(completedDateKey),
        completedAt: completedDay,
        scheduledTimes: ["08:00", "20:00"],
        frequency: 2,
      }],
      [],
    );

    expect(occurrences.map((occurrence) => getAppDateKey(occurrence.scheduledTime))).toEqual([completedDateKey, completedDateKey]);
  });

  it("uses the latest medication log date when completedAt is later than the last dose date", () => {
    const today = getTodayAppDateStartUtc();
    const completedAt = addAppDays(today, -1);
    const createdAt = addAppDays(today, -4);
    const lastDoseDate = new Date(addAppDays(createdAt, 2).getTime() + 8 * 60 * 60_000);

    const occurrences = __test__.buildScheduledOccurrences(
      6,
      [{
        id: "schedule-1",
        createdAt,
        completedAt,
        scheduledTimes: ["08:00"],
        frequency: 1,
      }],
      [{ scheduleId: "schedule-1", scheduledTime: lastDoseDate, status: "confirmed" }],
    );

    expect(occurrences.map((occurrence) => getAppDateKey(occurrence.scheduledTime))).toEqual([
      getAppDateKey(createdAt),
      getAppDateKey(addAppDays(createdAt, 1)),
      getAppDateKey(lastDoseDate),
    ]);
  });

  it("starts the schedule window from createdAt even when medication logs predate it", () => {
    const today = getTodayAppDateStartUtc();
    const firstLogDate = new Date(addAppDays(today, -6).getTime() + 8 * 60 * 60_000);
    const createdAt = new Date(addAppDays(today, -4).getTime() + 8 * 60 * 60_000);
    const lastLogDate = new Date(addAppDays(today, -2).getTime() + 20 * 60 * 60_000);

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

    expect(occurrences[0] ? getAppDateKey(occurrences[0].scheduledTime) : undefined).toBe(getAppDateKey(createdAt));
    expect(occurrences.at(-1) ? getAppDateKey(occurrences.at(-1)!.scheduledTime) : undefined).toBe(getAppDateKey(lastLogDate));
    expect(occurrences).toHaveLength(6);
  });

  it("matches schedule calendar by capping occurrences at 30 days after creation", () => {
    const today = new Date();
    today.setUTCHours(12, 0, 0, 0);
    today.setUTCDate(today.getUTCDate() - 1);
    const createdAt = new Date(today);
    createdAt.setUTCDate(today.getUTCDate() - 31);
    createdAt.setUTCHours(0, 0, 0, 0);
    const lastVisibleDateKey = getAppDateKey(addAppDays(createdAt, 30));

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

    expect(occurrences.at(-1) ? getAppDateKey(occurrences.at(-1)!.scheduledTime) : undefined).toBe(lastVisibleDateKey);
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

  it("does not backfill missed doses before a schedule was created when startDate is set", () => {
    const yesterday = addAppDays(getTodayAppDateStartUtc(), -1);
    const createdAt = new Date(yesterday.getTime() + 12 * 60 * 60_000);
    const dateKey = getAppDateKey(createdAt);

    const occurrences = __test__.buildScheduledOccurrences(
      2,
      [{
        id: "schedule-1",
        createdAt,
        completedAt: null,
        startDate: dateKey,
        endDate: dateKey,
        scheduledTimes: ["08:00"],
        frequency: 1,
      }],
      [],
    );

    expect(occurrences).toHaveLength(0);
  });

  it("builds adherence stats for multiple patients from grouped schedule and log rows", () => {
    const doseDay = new Date();
    doseDay.setUTCHours(0, 0, 0, 0);
    doseDay.setUTCDate(doseDay.getUTCDate() - 1);
    const doseDateKey = getAppDateKey(doseDay);
    const scheduledTime = new Date(`${doseDateKey}T08:00:00.000Z`);

    const statsByPatientId = buildAdherenceStatsByPatientId(
      ["patient-1", "patient-2"],
      "all",
      [
        {
          id: "schedule-1",
          patientId: "patient-1",
          createdAt: doseDay,
          completedAt: doseDay,
          startDate: doseDateKey,
          endDate: doseDateKey,
          stock: 0,
          isActive: false,
          scheduledTimes: ["08:00"],
          frequency: 1,
        },
        {
          id: "schedule-2",
          patientId: "patient-2",
          createdAt: doseDay,
          completedAt: doseDay,
          startDate: doseDateKey,
          endDate: doseDateKey,
          stock: 0,
          isActive: false,
          scheduledTimes: ["08:00"],
          frequency: 1,
        },
      ],
      [
        {
          scheduleId: "schedule-1",
          patientId: "patient-1",
          scheduledTime,
          status: "confirmed",
        },
      ],
    );

    expect(statsByPatientId.get("patient-1")).toMatchObject({ adherenceRate: 100, totalScheduled: 1 });
    expect(statsByPatientId.get("patient-2")).toMatchObject({ adherenceRate: 0, totalScheduled: 1 });
  });
});
