import api from "@/lib/axios";
import { getDateRangeParams } from "@/lib/dateRange";
import type { ActivityCategory, ActivityLogRecord } from "@/lib/mocks/activityLogs";

interface NotificationResponse {
  id: string;
  patientId: string;
  type: string;
  title: string;
  body: string;
  status: string;
  urgency: string;
  scheduledAt?: string | null;
  deliveredAt?: string | null;
  readAt?: string | null;
  createdAt?: string | null;
}

interface PaginatedResponse<T> {
  data: T[];
  meta?: { page: number; limit: number; total: number; summary?: { warningCritical?: number; today?: number } };
}

export interface NotificationActivityPage {
  activities: ActivityLogRecord[];
  meta: { page: number; limit: number; total: number; summary?: { warningCritical?: number; today?: number } };
}

type NotificationActivityParams = {
  page?: number;
  limit?: number;
  nurseId?: string;
  category?: ActivityCategory | "all";
  date?: string;
  severity?: "success" | "warning" | "critical";
  search?: string;
};

const notificationActivityCacheTtl = 10_000;
const notificationActivityCache = new Map<string, { data: NotificationActivityPage; expiresAt: number }>();
const notificationActivityRequests = new Map<string, Promise<NotificationActivityPage>>();

const getNotificationCategory = (type: string): ActivityCategory => {
  if (/food/i.test(type)) return "Scan Makanan";
  if (/adherence|escalation|missed|critical/i.test(type)) return "Kepatuhan";
  if (/admin|approval|system/i.test(type)) return "Administrasi";
  return "Reminder";
};

const getNotificationSeverity = (urgency: string): ActivityLogRecord["severity"] => {
  if (urgency === "critical") return "Kritis";
  if (urgency === "urgent" || urgency === "high") return "Peringatan";
  return "Sukses";
};

const getNotificationCategoryParam = (category?: ActivityCategory | "all") => {
  if (!category || category === "all") return undefined;
  if (category === "Reminder") return "reminder";
  if (category === "Kepatuhan") return "adherence";
  if (category === "Scan Makanan") return "food_scan";
  return "administration";
};

export const getNotificationActivityPageFromApi = async (params: NotificationActivityParams = {}): Promise<NotificationActivityPage> => {
  const page = params.page || 1;
  const limit = params.limit || 100;
  const nurseId = params.nurseId;
  const category = getNotificationCategoryParam(params.category);
  const search = params.search?.trim() || "";
  const cacheKey = `${page}:${limit}:${nurseId || "all"}:${category || "all"}:${params.date || ""}:${params.severity || ""}:${search}`;
  const now = Date.now();
  const cached = notificationActivityCache.get(cacheKey);
  if (cached && cached.expiresAt > now) return cached.data;
  const activeRequest = notificationActivityRequests.get(cacheKey);
  if (activeRequest) return activeRequest;

  const request = api.get<PaginatedResponse<NotificationResponse>>("/notifications", {
    params: {
      page,
      limit,
      status: "delivered",
      nurse_id: nurseId,
      activity_category: category,
      severity: params.severity,
      ...getDateRangeParams(params.date),
      ...(search && { search }),
    },
  })
    .then((response) => {
      const activities = response.data.data.map((notification): ActivityLogRecord => ({
        id: `notification-${notification.id}`,
        title: notification.title,
        description: notification.body,
        category: getNotificationCategory(notification.type),
        severity: getNotificationSeverity(notification.urgency),
        timestamp: notification.deliveredAt || notification.createdAt || notification.scheduledAt || new Date().toISOString(),
        patientId: notification.patientId,
        read: Boolean(notification.readAt),
      }));
      const data = {
        activities,
        meta: response.data.meta ?? { page, limit, total: activities.length },
      };
      notificationActivityCache.set(cacheKey, { data, expiresAt: Date.now() + notificationActivityCacheTtl });
      return data;
    })
    .finally(() => {
      notificationActivityRequests.delete(cacheKey);
    });

  notificationActivityRequests.set(cacheKey, request);
  return request;
};
