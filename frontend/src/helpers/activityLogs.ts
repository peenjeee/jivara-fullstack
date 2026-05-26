import type { ActivityLogRecord } from "@/lib/mocks/activityLogs";

export interface ActivityLogDateGroup {
  readonly label: string;
  readonly dateKey: string;
  readonly items: readonly ActivityLogRecord[];
}

export function getActivityDateKey(timestamp: string) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getTodayDateKey() {
  return getActivityDateKey(new Date().toISOString());
}

export function getActivityDateLabel(timestamp: string) {
  const date = new Date(timestamp);
  const todayKey = getTodayDateKey();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = getActivityDateKey(yesterday.toISOString());

  if (getActivityDateKey(timestamp) === todayKey) return "Hari Ini";
  if (getActivityDateKey(timestamp) === yesterdayKey) return "Kemarin";

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
      items: items.toSorted((first, second) => new Date(second.timestamp).getTime() - new Date(first.timestamp).getTime()),
    }));
}

export function getUnreadActivityCount(logs: readonly ActivityLogRecord[], patientId?: string) {
  return logs.filter((activity) => !activity.read && (!patientId || activity.patientId === patientId)).length;
}
