import api from "@/lib/axios";
import { activityLogs as fallbackActivityLogs, type ActivityCategory, type ActivityLogRecord, type ActivitySeverity } from "@/lib/mocks/activityLogs";

interface AuditLogResponse {
  id: string;
  userId?: string | null;
  userName?: string | null;
  userEmail?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  changes?: unknown;
  createdAt?: string | null;
}

interface PaginatedResponse<T> {
  data: T[];
}

const categoryByResource = (resourceType: string): ActivityCategory => {
  if (resourceType.includes("notification") || resourceType.includes("reminder")) return "Reminder";
  if (resourceType.includes("food") || resourceType.includes("scan") || resourceType.includes("interaction")) return "Scan Makanan";
  if (resourceType.includes("patient") || resourceType.includes("schedule") || resourceType.includes("alert")) return "Kepatuhan";
  return "Administrasi";
};

const severityByAction = (action: string): ActivitySeverity => {
  if (/failed|critical|missed|deactivated|deleted/i.test(action)) return "Kritis";
  if (/warning|updated|resolved|snoozed/i.test(action)) return "Peringatan";
  if (/created|delivered|confirmed/i.test(action)) return "Sukses";
  return "Info";
};

const formatAction = (action: string) => action
  .split(/[._-]/)
  .filter(Boolean)
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
  .join(" ");

const formatResource = (value: string) => value
  .split(/[._-]/)
  .filter(Boolean)
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
  .join(" ");

const getDescription = (log: AuditLogResponse) => {
  const actor = log.userName || log.userEmail || "Sistem";
  const resource = formatResource(log.resourceType);
  const resourceId = log.resourceId ? ` (${log.resourceId.slice(0, 8)})` : "";
  return `${actor} menjalankan ${formatAction(log.action)} pada ${resource}${resourceId}.`;
};

export const getAuditActivitiesFromApi = async (): Promise<ActivityLogRecord[]> => {
  const response = await api.get<PaginatedResponse<AuditLogResponse>>("/audit-logs", { params: { limit: 100 } });
  const activities = response.data.data.map((log) => ({
    id: log.id,
    title: formatAction(log.action),
    description: getDescription(log),
    category: categoryByResource(log.resourceType),
    severity: severityByAction(log.action),
    timestamp: log.createdAt || new Date().toISOString(),
    patientId: log.resourceType === "patient" ? log.resourceId ?? undefined : undefined,
    patientName: undefined,
    patientAvatar: undefined,
    scheduleId: log.resourceType === "medication_schedule" ? log.resourceId ?? undefined : undefined,
    medicineName: undefined,
    scanId: log.resourceType === "food_scan" ? log.resourceId ?? undefined : undefined,
    read: true,
  }));

  return activities.length > 0 ? activities : fallbackActivityLogs;
};

export { fallbackActivityLogs };
