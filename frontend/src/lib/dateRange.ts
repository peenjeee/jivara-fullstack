export interface DateRangeFilter {
  readonly startDate?: string;
  readonly endDate?: string;
}

export const parseDateRangeFilter = (value?: string): DateRangeFilter => {
  if (!value) return {};

  const [startDate, endDate] = value.split("..");
  return {
    ...(startDate && { startDate }),
    ...(endDate && { endDate }),
  };
};

export const getDateRangeParams = (value?: string) => {
  const range = parseDateRangeFilter(value);
  if (!range.startDate && !range.endDate) return {};
  if (range.startDate && !range.endDate) return { date: range.startDate };
  return {
    ...(range.startDate && { start_date: range.startDate }),
    ...(range.endDate && { end_date: range.endDate }),
  };
};

export const isDateInRange = (dateKey: string, value?: string) => {
  const range = parseDateRangeFilter(value);
  if (!range.startDate && !range.endDate) return true;
  if (range.startDate && dateKey < range.startDate) return false;
  if (range.endDate && dateKey > range.endDate) return false;
  return true;
};
