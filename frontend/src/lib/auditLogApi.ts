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
  meta?: { page: number; limit: number; total: number };
}

const auditCacheTtl = 10_000;
let auditCache: { data: AuditLogResponse[]; expiresAt: number } | null = null;
let auditRequest: Promise<AuditLogResponse[]> | null = null;

export const clearAuditLogCache = () => {
  auditCache = null;
  auditRequest = null;
};

const getAuditLogs = async (params: { page?: number; limit?: number; forceRefresh?: boolean } = {}) => {
  const page = params.page || 1;
  const limit = params.limit || 100;
  const useCache = page === 1 && limit === 100;
  const now = Date.now();
  if (params.forceRefresh) clearAuditLogCache();
  if (useCache && auditCache && auditCache.expiresAt > now) return auditCache.data;
  if (useCache && auditRequest) return auditRequest;

  const request = api.get<PaginatedResponse<AuditLogResponse>>("/audit-logs", { params: { page, limit } })
    .then((response) => {
      if (useCache) auditCache = { data: response.data.data, expiresAt: Date.now() + auditCacheTtl };
      return response.data.data;
    })
    .finally(() => {
      if (useCache) auditRequest = null;
    });

  if (useCache) auditRequest = request;
  return request;
};

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

const getChangeRecord = (changes: unknown) => {
  if (!changes) return {};
  if (typeof changes === "string") {
    try {
      const parsed = JSON.parse(changes);
      return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : {};
    } catch {
      return {};
    }
  }
  return typeof changes === "object" ? changes as Record<string, unknown> : {};
};

const getDiffString = (value: unknown) => {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  return typeof record.to === "string" ? record.to : undefined;
};

const getNestedString = (record: Record<string, unknown>, key: string) => {
  const after = record.after && typeof record.after === "object" ? record.after as Record<string, unknown> : record;
  const requested = record.requested && typeof record.requested === "object" ? record.requested as Record<string, unknown> : record;
  const value = after[key] ?? requested[key] ?? record[key];
  return typeof value === "string" ? value : getDiffString(value);
};

const getRelatedNurseId = (log: AuditLogResponse) => {
  if (log.resourceType === "nurse") return log.resourceId ?? undefined;

  const changes = getChangeRecord(log.changes);
  return getNestedString(changes, "nurseId")
    || getNestedString(changes, "assignedNurseId")
    || getNestedString(changes, "targetNurseId")
    || getNestedString(changes, "sourceNurseId");
};

export const getAuditActivitiesFromApi = async (params: { page?: number; limit?: number; forceRefresh?: boolean } = {}): Promise<ActivityLogRecord[]> => {
  const logs = await getAuditLogs(params);
  const activities = logs.map((log) => ({
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
    targetNurseId: getRelatedNurseId(log),
    read: false,
  }));

  return activities;
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

export const getSuperAdminApprovalActivitiesFromApi = async (params: { forceRefresh?: boolean } = {}): Promise<ActivityLogRecord[]> => {
  const logs = await getAuditLogs({ forceRefresh: params.forceRefresh });

  return logs
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
        read: false,
      };
    });
};
