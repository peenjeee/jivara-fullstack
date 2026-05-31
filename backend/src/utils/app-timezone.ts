export const APP_TIMEZONE = "Asia/Jakarta";
export const APP_TIMEZONE_OFFSET = "+07:00";

const APP_TIMEZONE_OFFSET_MINUTES = 7 * 60;
const APP_TIMEZONE_OFFSET_MS = APP_TIMEZONE_OFFSET_MINUTES * 60_000;
const DAY_MS = 86_400_000;
const dateKeyPattern = /^\d{4}-\d{2}-\d{2}$/;

type DateRangeQuery = {
  date?: unknown;
  start_date?: unknown;
  startDate?: unknown;
  end_date?: unknown;
  endDate?: unknown;
};

const getDateString = (value: unknown) => (typeof value === "string" && dateKeyPattern.test(value) ? value : null);

export const getAppDateKey = (date: Date) => new Date(date.getTime() + APP_TIMEZONE_OFFSET_MS).toISOString().slice(0, 10);

export const addAppDays = (date: Date, days: number) => new Date(date.getTime() + days * DAY_MS);

export const getAppDateStartUtc = (value: unknown) => {
  const dateString = getDateString(value);
  if (!dateString) return null;

  const [year, month, day] = dateString.split("-").map(Number);
  const dateAtUtcMidnight = new Date(Date.UTC(year, month - 1, day));
  if (
    dateAtUtcMidnight.getUTCFullYear() !== year
    || dateAtUtcMidnight.getUTCMonth() !== month - 1
    || dateAtUtcMidnight.getUTCDate() !== day
  ) {
    return null;
  }

  return new Date(dateAtUtcMidnight.getTime() - APP_TIMEZONE_OFFSET_MS);
};

export const getTodayAppDateStartUtc = (now = new Date()) => {
  const todayStart = getAppDateStartUtc(getAppDateKey(now));
  if (!todayStart) throw new Error("Invalid application date key");
  return todayStart;
};

export const getAppDateRangeUtc = (startValue: unknown, endValue: unknown = startValue) => {
  const start = getAppDateStartUtc(startValue);
  const end = getAppDateStartUtc(endValue);
  if (!start || !end) return null;

  const normalizedStart = start <= end ? start : end;
  const normalizedEnd = addAppDays(start <= end ? end : start, 1);

  return { start: normalizedStart, end: normalizedEnd };
};

export const getAppDateRangeFromQuery = (query: DateRangeQuery) => {
  const startValue = query.startDate || query.start_date || query.date;
  const endValue = query.endDate || query.end_date || startValue;

  return startValue && endValue ? getAppDateRangeUtc(startValue, endValue) : null;
};
