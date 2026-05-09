import api from "@/lib/axios";
import type { ActivityCategory, ActivityLogRecord, ActivitySeverity } from "@/lib/mocks/activityLogs";

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

type ApprovalAction = "auth.register.pending" | "admin.approved" | "admin.rejected" | "admin.restored" | "admin.suspended" | "admin.activated";

const approvalActionLabels: Record<ApprovalAction, { title: string; severity: ActivitySeverity }> = {
  "auth.register.pending": { title: "Pengajuan admin masuk", severity: "Info" },
  "admin.approved": { title: "Admin disetujui", severity: "Sukses" },
  "admin.rejected": { title: "Admin ditolak", severity: "Peringatan" },
  "admin.restored": { title: "Pengajuan admin dipulihkan", severity: "Info" },
  "admin.suspended": { title: "Admin disuspend", severity: "Kritis" },
  "admin.activated": { title: "Admin diaktifkan kembali", severity: "Sukses" },
};

const approvalActions = new Set<ApprovalAction>(Object.keys(approvalActionLabels) as ApprovalAction[]);

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

  return activities;
};

const getChangeRecord = (changes: unknown) => changes && typeof changes === "object" ? changes as Record<string, unknown> : {};

const getNestedString = (record: Record<string, unknown>, key: string) => {
  const after = record.after && typeof record.after === "object" ? record.after as Record<string, unknown> : record;
  const value = after[key];
  return typeof value === "string" ? value : undefined;
};

const getApprovalDescription = (log: AuditLogResponse) => {
  const action = log.action as ApprovalAction;
  const changes = getChangeRecord(log.changes);
  const adminName = getNestedString(changes, "fullName") || "Admin";
  const adminEmail = getNestedString(changes, "email");
  const actor = log.userName || log.userEmail || "Super admin";
  const target = `${adminName}${adminEmail ? ` (${adminEmail})` : ""}`;

  if (action === "auth.register.pending") return `${target} mengajukan pendaftaran admin baru.`;
  if (action === "admin.approved") return `${actor} menyetujui akun ${target}.`;
  if (action === "admin.rejected") return `${actor} menolak pengajuan ${target}.`;
  if (action === "admin.restored") return `${actor} memulihkan pengajuan ${target} ke status menunggu.`;
  if (action === "admin.suspended") return `${actor} mensuspend akun ${target}.`;
  return `${actor} mengaktifkan kembali akun ${target}.`;
};

export const getSuperAdminApprovalActivitiesFromApi = async (): Promise<ActivityLogRecord[]> => {
  const response = await api.get<PaginatedResponse<AuditLogResponse>>("/audit-logs", { params: { limit: 100 } });

  return response.data.data
    .filter((log) => approvalActions.has(log.action as ApprovalAction))
    .map((log) => {
      const config = approvalActionLabels[log.action as ApprovalAction];
      return {
        id: log.id,
        title: config.title,
        description: getApprovalDescription(log),
        category: "Administrasi" as const,
        severity: config.severity,
        timestamp: log.createdAt || new Date().toISOString(),
        read: true,
      };
    });
};
