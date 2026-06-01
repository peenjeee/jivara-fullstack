import api from "@/lib/axios";

export interface NotificationAnalyticsData {
  readonly total: number;
  readonly delivered: number;
  readonly opened: number;
  readonly clicked: number;
  readonly openRate: number;
  readonly clickThroughRate: number;
  readonly averageTimeToOpenMs: number | null;
  readonly byType: Array<{ type: string; total: number; delivered: number; opened: number }>;
}

let analyticsCache: { data: NotificationAnalyticsData } | null = null;
let analyticsRequest: Promise<NotificationAnalyticsData> | null = null;

export const clearAnalyticsCache = () => {
  analyticsCache = null;
  analyticsRequest = null;
};

export const getNotificationAnalyticsFromApi = async () => {
  if (analyticsCache) return analyticsCache.data;
  if (analyticsRequest) return analyticsRequest;

  analyticsRequest = api.get<{ data: NotificationAnalyticsData }>("/notifications/analytics")
    .then((response) => {
      const data = response.data.data;
      analyticsCache = { data };
      return data;
    })
    .finally(() => {
      analyticsRequest = null;
    });

  return analyticsRequest;
};
