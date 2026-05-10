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

export interface InteractionAnalyticsData {
  readonly totalScans: number;
  readonly totalInteractions: number;
  readonly scansWithInteractions: number;
  readonly interactionRate: number;
  readonly severityDistribution: Array<{ label: string; total: number }>;
  readonly topFoods: Array<{ label: string; total: number }>;
  readonly topMedications: Array<{ label: string; total: number }>;
}

export const getNotificationAnalyticsFromApi = async () => {
  const response = await api.get<{ data: NotificationAnalyticsData }>("/notifications/analytics");
  return response.data.data;
};

export const getInteractionAnalyticsFromApi = async () => {
  const response = await api.get<{ data: InteractionAnalyticsData }>("/food-scans/analytics/interactions");
  return response.data.data;
};
