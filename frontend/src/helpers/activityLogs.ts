import type { ActivityLogRecord } from "@/lib/mocks/activityLogs";

export interface ActivityLogDateGroup {
  readonly label: string;
  readonly dateKey: string;
  readonly items: readonly ActivityLogRecord[];
}

export function getActivityDateKey(timestamp: string) {
  return new Date(timestamp).toISOString().slice(0, 10);
}

export function getActivityDateLabel(timestamp: string) {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (getActivityDateKey(timestamp) === today.toISOString().slice(0, 10)) return "Hari Ini";
  if (getActivityDateKey(timestamp) === yesterday.toISOString().slice(0, 10)) return "Kemarin";

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function formatActivityTime(timestamp: string) {
  return new Date(timestamp).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function groupActivityLogsByDate(logs: readonly ActivityLogRecord[]): ActivityLogDateGroup[] {
  const grouped = logs.reduce<Record<string, ActivityLogRecord[]>>((accumulator, log) => {
    const key = getActivityDateKey(log.timestamp);
    accumulator[key] = [...(accumulator[key] ?? []), log];
    return accumulator;
  }, {});

  return Object.entries(grouped)
    .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
    .map(([dateKey, items]) => ({
      dateKey,
      label: getActivityDateLabel(items[0]?.timestamp ?? dateKey),
      items: [...items].sort((first, second) => new Date(second.timestamp).getTime() - new Date(first.timestamp).getTime()),
    }));
}
