import api from "@/lib/axios";
import { getDateRangeParams } from "@/lib/dateRange";
import type { ActivityLogRecord } from "@/lib/mocks/activityLogs";

interface AlertResponse {
  id: string;
  patientId: string;
  patientName: string;
  scheduleId: string;
  drugName: string;
  dosage: string;
  scheduledTime: string;
  status: string;
  severity: "warning" | "critical";
  message: string;
  updatedAt?: string | null;
  createdAt?: string | null;
}

interface PaginatedResponse<T> {
  data: T[];
  meta?: { page: number; limit: number; total: number };
}

const alertsCacheTtl = 10_000;
const alertsCache = new Map<string, { data: ActivityLogRecord[]; expiresAt: number }>();
const alertsRequests = new Map<string, Promise<ActivityLogRecord[]>>();

export const clearAlertsCache = () => {
  alertsCache.clear();
  alertsRequests.clear();
};

export const getAlertActivitiesFromApi = async (params: { page?: number; limit?: number; date?: string; severity?: "warning" | "critical" } = {}): Promise<ActivityLogRecord[]> => {
  const page = params.page || 1;
  const limit = params.limit || 100;
  const cacheKey = `${page}:${limit}:${params.date ?? ""}:${params.severity ?? ""}`;
  const now = Date.now();
  const cached = alertsCache.get(cacheKey);
  if (cached && cached.expiresAt > now) return cached.data;
  const activeRequest = alertsRequests.get(cacheKey);
  if (activeRequest) return activeRequest;

  const request = api.get<PaginatedResponse<AlertResponse>>("/alerts", { params: { page, limit, ...getDateRangeParams(params.date), ...(params.severity && { severity: params.severity }) } })
    .then((response) => {
      const activities = response.data.data.map((alert) => {
        const isCritical = alert.severity === "critical" || alert.status === "missed";

        return {
          id: `alert-${alert.id}`,
          title: isCritical ? "Dosis obat terlewat" : "Pengingat obat penting",
          description: alert.message,
          category: "Kepatuhan" as const,
          severity: isCritical ? "Kritis" as const : "Peringatan" as const,
          timestamp: alert.updatedAt || alert.createdAt || alert.scheduledTime,
          alertId: alert.id,
          patientId: alert.patientId,
          patientName: alert.patientName,
          scheduleId: alert.scheduleId,
          medicineName: `${alert.drugName} ${alert.dosage}`,
          read: false,
        };
      });
      alertsCache.set(cacheKey, { data: activities, expiresAt: Date.now() + alertsCacheTtl });
      return activities;
    })
    .finally(() => {
      alertsRequests.delete(cacheKey);
    });

  alertsRequests.set(cacheKey, request);
  return request;
};

export const resolveAlertViaApi = async (alertId: string) => {
  await api.patch(`/alerts/${encodeURIComponent(alertId)}/resolve`);
  clearAlertsCache();
  // Also clear dashboard cache since alerts affect nurse dashboard stats
  if (typeof window !== "undefined") {
    const { clearDashboardCache } = await import("./dashboardApi");
    clearDashboardCache();
  }
};
