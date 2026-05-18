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

export const getNotificationAnalyticsFromApi = async () => {
  const response = await api.get<{ data: NotificationAnalyticsData }>("/notifications/analytics");
  return response.data.data;
};
