import api from "@/lib/axios";
import { applyKnownActivityReadState } from "@/lib/activityReadApi";
import { getDateRangeParams } from "@/lib/dateRange";
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
export type ApprovalLogStatus = "all" | "pending" | "active" | "rejected" | "suspended";
export type ApprovalLogSeverity = "all" | "success" | "info" | "warning" | "critical";

const approvalActionLabels: Record<ApprovalAction, { title: string; severity: ActivitySeverity }> = {
  "auth.register.pending": { title: "Pengajuan admin masuk", severity: "Info" },
  "admin.approved": { title: "Admin disetujui", severity: "Sukses" },
  "admin.rejected": { title: "Admin ditolak", severity: "Peringatan" },
  "admin.restored": { title: "Pengajuan admin dipulihkan", severity: "Info" },
  "admin.suspended": { title: "Admin disuspend", severity: "Kritis" },
  "admin.activated": { title: "Admin diaktifkan kembali", severity: "Sukses" },
};

const approvalActions = new Set<ApprovalAction>(Object.keys(approvalActionLabels) as ApprovalAction[]);
const approvalActionsByStatus: Record<Exclude<ApprovalLogStatus, "all">, ApprovalAction[]> = {
  pending: ["auth.register.pending", "admin.restored"],
  active: ["admin.approved", "admin.activated"],
  rejected: ["admin.rejected"],
  suspended: ["admin.suspended"],
};
const approvalActionsBySeverity: Record<Exclude<ApprovalLogSeverity, "all">, ApprovalAction[]> = {
  success: ["admin.approved", "admin.activated"],
  info: ["auth.register.pending", "admin.restored"],
  warning: ["admin.rejected"],
  critical: ["admin.suspended"],
};

interface PaginatedResponse<T> {
  data: T[];
  meta?: AuditLogMeta;
}

interface AuditLogMeta {
  page: number;
  limit: number;
  total: number;
  summary?: {
    warningCritical?: number;
    today?: number;
    pending?: number;
    processedToday?: number;
  };
}

interface AuditLogPage {
  data: AuditLogResponse[];
  meta: AuditLogMeta;
}

interface ActivityLogPage {
  activities: ActivityLogRecord[];
  meta: AuditLogMeta;
}

type AuditLogParams = {
  page?: number;
  limit?: number;
  action?: string;
  status?: string;
  severityFilter?: string;
  category?: ActivityCategory | "all";
  activityCategory?: AuditActivityCategory;
  date?: string;
  userRole?: string;
  nurseId?: string;
  severity?: "success" | "info" | "critical" | "warning";
  search?: string;
  forceRefresh?: boolean;
};

type AuditActivityCategory = "reminder" | "adherence" | "food_scan" | "administration";

const auditCache = new Map<string, { data: AuditLogPage }>();
const auditRequests = new Map<string, Promise<AuditLogPage>>();

const getAuditLogCacheKey = (params: AuditLogParams = {}) => {
  const page = params.page || 1;
  const limit = params.limit || 100;
  const activityCategory = params.activityCategory || getAuditCategoryParam(params.category);
  const search = params.search?.trim() || "";

  return `${page}:${limit}:${params.action ?? ""}:${params.status ?? ""}:${params.severityFilter ?? ""}:${activityCategory ?? ""}:${params.date ?? ""}:${params.userRole ?? ""}:${params.nurseId ?? ""}:${params.severity ?? ""}:${search}`;
};

export const clearAuditLogCache = () => {
  auditCache.clear();
  auditRequests.clear();
};

const getAuditLogs = async (params: AuditLogParams = {}) => {
  const page = params.page || 1;
  const limit = params.limit || 100;
  const activityCategory = params.activityCategory || getAuditCategoryParam(params.category);
  const search = params.search?.trim() || "";
  const cacheKey = getAuditLogCacheKey(params);
  if (params.forceRefresh) {
    auditCache.delete(cacheKey);
  }
  const activeRequest = auditRequests.get(cacheKey);
  if (activeRequest) return activeRequest;

  const request = api.get<PaginatedResponse<AuditLogResponse>>("/audit-logs", { params: { page, limit, ...(params.action && { action: params.action }), ...(params.status && { status: params.status }), ...(params.severityFilter && { severityFilter: params.severityFilter }), ...(activityCategory && { activity_category: activityCategory }), ...getDateRangeParams(params.date), ...(params.userRole && { user_role: params.userRole }), ...(params.nurseId && { nurse_id: params.nurseId }), ...(params.severity && { severity: params.severity }), ...(search && { search }) } })
    .then((response) => {
      const data = {
        data: response.data.data,
        meta: response.data.meta ?? { page, limit, total: response.data.data.length },
      };
      auditCache.set(cacheKey, { data });
      return data;
    })
    .finally(() => {
      auditRequests.delete(cacheKey);
    });

  auditRequests.set(cacheKey, request);
  return request;
};

const getCachedAuditLogs = (params: AuditLogParams = {}) => {
  return auditCache.get(getAuditLogCacheKey(params))?.data ?? null;
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

const getAuditCategoryParam = (category?: ActivityCategory | "all"): AuditActivityCategory | undefined => {
  if (!category || category === "all") return undefined;
  if (category === "Reminder") return "reminder";
  if (category === "Kepatuhan") return "adherence";
  if (category === "Scan Makanan") return "food_scan";
  return "administration";
};

const getAuditLogTimestamp = (createdAt?: string | null) => {
  if (!createdAt) return 0;
  const timestamp = new Date(createdAt).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const getAuditLogSemanticKey = (log: AuditLogResponse) => [
  log.userId ?? log.userName ?? log.userEmail ?? "system",
  log.action,
  log.resourceType,
  log.resourceId ?? "",
  JSON.stringify(log.changes ?? null),
].join("|");

const removeNearDuplicateAuditLogs = (logs: readonly AuditLogResponse[]) => {
  const lastSeenByKey = new Map<string, number>();

  return logs.filter((log) => {
    const key = getAuditLogSemanticKey(log);
    const timestamp = getAuditLogTimestamp(log.createdAt);
    const previousTimestamp = lastSeenByKey.get(key);
    lastSeenByKey.set(key, timestamp);

    return previousTimestamp === undefined || Math.abs(previousTimestamp - timestamp) > 2_000;
  });
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

const mapAuditActivityPage = ({ data: logs, meta }: AuditLogPage): ActivityLogPage => {
  const activities = removeNearDuplicateAuditLogs(logs).map((log) => ({
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

  return { activities: applyKnownActivityReadState(activities), meta };
};

export const getAuditActivityPageFromApi = async (params: { page?: number; limit?: number; status?: string; severityFilter?: string; category?: ActivityCategory | "all"; date?: string; userRole?: string; nurseId?: string; severity?: "success" | "info" | "critical" | "warning"; search?: string; forceRefresh?: boolean } = {}): Promise<ActivityLogPage> => {
  return mapAuditActivityPage(await getAuditLogs(params));
};

export const getCachedAuditActivityPageFromApi = (params: { page?: number; limit?: number; status?: string; severityFilter?: string; category?: ActivityCategory | "all"; date?: string; userRole?: string; nurseId?: string; severity?: "success" | "info" | "critical" | "warning"; search?: string } = {}): ActivityLogPage | null => {
  const cached = getCachedAuditLogs(params);
  return cached ? mapAuditActivityPage(cached) : null;
};

export const getAuditActivitiesFromApi = async (params: { page?: number; limit?: number; category?: ActivityCategory | "all"; date?: string; userRole?: string; nurseId?: string; severity?: "success" | "info" | "critical" | "warning"; search?: string; forceRefresh?: boolean } = {}): Promise<ActivityLogRecord[]> => {
  const response = await getAuditActivityPageFromApi(params);
  return response.activities;
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

export const getSuperAdminApprovalActivitiesFromApi = async (params: { page?: number; limit?: number; status?: ApprovalLogStatus; severity?: ApprovalLogSeverity; date?: string; search?: string; forceRefresh?: boolean } = {}): Promise<ActivityLogRecord[]> => {
  const response = await getSuperAdminApprovalActivityPageFromApi(params);
  return response.activities;
};

export const getSuperAdminApprovalActivityPageFromApi = async (params: { page?: number; limit?: number; status?: ApprovalLogStatus; severity?: ApprovalLogSeverity; date?: string; search?: string; forceRefresh?: boolean } = {}): Promise<ActivityLogPage> => {
  const status = params.status ?? "all";
  const severity = params.severity ?? "all";
  const statusActions = status === "all" ? Array.from(approvalActions) : approvalActionsByStatus[status];
  const severityActions = severity === "all" ? Array.from(approvalActions) : approvalActionsBySeverity[severity];
  const actions = statusActions.filter((action) => severityActions.includes(action));
  const page = params.page ?? 1;
  const limit = params.limit ?? 100;

  if (actions.length === 0) {
    return { activities: [], meta: { page, limit, total: 0, summary: { warningCritical: 0, today: 0 } } };
  }

  const { data: logs, meta } = await getAuditLogs({
    page,
    limit,
    status: status === "all" ? undefined : status,
    severityFilter: severity === "all" ? undefined : severity,
    date: params.date,
    search: params.search,
    forceRefresh: params.forceRefresh,
    userRole: "super_admin",
  });

  const activities = logs
    .flatMap((log) => {
      if (!actions.includes(log.action as ApprovalAction)) return [];
      const config = approvalActionLabels[log.action as ApprovalAction];
      return [{
        id: log.id,
        title: config.title,
        description: getApprovalDescription(log),
        category: "Administrasi" as const,
        severity: config.severity,
        timestamp: log.createdAt || new Date().toISOString(),
        read: false,
      }];
    });

  return { activities: applyKnownActivityReadState(activities), meta };
};

export const getCachedSuperAdminApprovalActivityPageFromApi = (params: { page?: number; limit?: number; status?: ApprovalLogStatus; severity?: ApprovalLogSeverity; date?: string; search?: string } = {}): ActivityLogPage | null => {
  const status = params.status ?? "all";
  const severity = params.severity ?? "all";
  const statusActions = status === "all" ? Array.from(approvalActions) : approvalActionsByStatus[status];
  const severityActions = severity === "all" ? Array.from(approvalActions) : approvalActionsBySeverity[severity];
  const actions = statusActions.filter((action) => severityActions.includes(action));
  const page = params.page ?? 1;
  const limit = params.limit ?? 100;

  if (actions.length === 0) {
    return { activities: [], meta: { page, limit, total: 0, summary: { warningCritical: 0, today: 0 } } };
  }

  const cached = getCachedAuditLogs({
    page,
    limit,
    status: status === "all" ? undefined : status,
    severityFilter: severity === "all" ? undefined : severity,
    date: params.date,
    search: params.search,
    userRole: "super_admin",
  });
  if (!cached) return null;

  const activities = cached.data.flatMap((log) => {
    if (!actions.includes(log.action as ApprovalAction)) return [];
    const config = approvalActionLabels[log.action as ApprovalAction];
    return [{
      id: log.id,
      title: config.title,
      description: getApprovalDescription(log),
      category: "Administrasi" as const,
      severity: config.severity,
      timestamp: log.createdAt || new Date().toISOString(),
      read: false,
    }];
  });

  return { activities: applyKnownActivityReadState(activities), meta: cached.meta };
};
