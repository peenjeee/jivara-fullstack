import { describe, expect, it } from "vitest";
import { addAppDays, getAppDateKey, getAppDateRangeFromQuery, getAppDateRangeUtc, getAppDateStartUtc } from "../../src/utils/app-timezone";

describe("app timezone date helpers", () => {
  it("converts an app date start to the matching UTC instant for Jakarta", () => {
    expect(getAppDateStartUtc("2026-06-01")?.toISOString()).toBe("2026-05-31T17:00:00.000Z");
  });

  it("formats UTC instants as Jakarta date keys", () => {
    expect(getAppDateKey(new Date("2026-05-31T18:00:00.000Z"))).toBe("2026-06-01");
  });

  it("builds an exclusive range for whole app dates", () => {
    const range = getAppDateRangeUtc("2026-06-01", "2026-06-30");

    expect(range?.start.toISOString()).toBe("2026-05-31T17:00:00.000Z");
    expect(range?.end.toISOString()).toBe("2026-06-30T17:00:00.000Z");
  });

  it("adds whole app days without changing the Jakarta midnight boundary", () => {
    expect(addAppDays(getAppDateStartUtc("2026-06-01")!, 1).toISOString()).toBe("2026-06-01T17:00:00.000Z");
  });

  it("reads date aliases from API query params", () => {
    const range = getAppDateRangeFromQuery({ start_date: "2026-06-01", end_date: "2026-06-01" });

    expect(range?.start.toISOString()).toBe("2026-05-31T17:00:00.000Z");
    expect(range?.end.toISOString()).toBe("2026-06-01T17:00:00.000Z");
  });
});
