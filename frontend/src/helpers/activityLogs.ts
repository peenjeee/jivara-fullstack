import type { ActivityLogRecord } from "@/lib/mocks/activityLogs";
import { getAppDateKey, getTodayAppDateKey } from "@/lib/appTimezone";

export interface ActivityLogDateGroup {
  readonly label: string;
  readonly dateKey: string;
  readonly items: readonly ActivityLogRecord[];
}

export function getActivityDateKey(timestamp: string) {
  return getAppDateKey(timestamp);
}

export function getTodayDateKey() {
  return getTodayAppDateKey();
}

export function getActivityDateLabel(timestamp: string) {
  const date = new Date(timestamp);
  const todayKey = getTodayDateKey();
  const yesterdayKey = getAppDateKey(Date.now() - 86_400_000);

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
