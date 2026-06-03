export const APP_TIMEZONE = "Asia/Jakarta";

const APP_TIMEZONE_OFFSET_MS = 7 * 60 * 60_000;
const dateKeyPattern = /^\d{4}-\d{2}-\d{2}$/;
const appDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export const getAppDateKey = (value: Date | string | number = new Date()) => {
  if (typeof value === "string" && dateKeyPattern.test(value)) return value;

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const parts = appDateFormatter.formatToParts(date).reduce<Record<string, string>>((accumulator, part) => {
    if (part.type !== "literal") accumulator[part.type] = part.value;
    return accumulator;
  }, {});

  return `${parts.year}-${parts.month}-${parts.day}`;
};

export const getTodayAppDateKey = () => getAppDateKey(new Date());

export const getApiDateKey = (value?: string | null, fallback = getTodayAppDateKey()) => {
  if (!value) return fallback;
  const dateOnly = value.slice(0, 10);
  if (dateKeyPattern.test(dateOnly) && !value.includes("T")) return dateOnly;
  return getAppDateKey(value) || fallback;
};

const getSafeTimeParts = (time?: string | null) => {
  const [hours, minutes] = (time || "00:00").split(":").map(Number);
  return {
    hours: Number.isFinite(hours) ? hours : 0,
    minutes: Number.isFinite(minutes) ? minutes : 0,
  };
};

export const getAppScheduledDateTime = (date: Date | string | number, time?: string | null) => {
  const dateKey = getAppDateKey(date);
  if (!dateKey) return new Date(Number.NaN);

  const [year, month, day] = dateKey.split("-").map(Number);
  const { hours, minutes } = getSafeTimeParts(time);

  return new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0) - APP_TIMEZONE_OFFSET_MS);
};
