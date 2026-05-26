import { db } from "../db";
import { auditLogs, users } from "../db/schema";
import { and, count, desc, eq, gte, ilike, inArray, lt, notInArray, or, sql } from "drizzle-orm";
import { AuditLogListQuery } from "../types/audit-log.types";
import { AccessUser, getAssignedPatientIdsForNurse, getOrganizationIdForUser } from "./access-control.service";

type AuditChange = Record<string, unknown>;

interface AuditLogInput {
  userId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  changes?: AuditChange | null;
  ipAddress?: string | null;
}

const sanitizeChanges = (changes?: AuditChange | null) => {
  if (!changes) return null;

  const sanitized = { ...changes };
  for (const key of Object.keys(sanitized)) {
    if (/password|token|secret/i.test(key)) sanitized[key] = "[REDACTED]";
  }

  return sanitized;
};

export const writeAuditLog = async ({ userId, action, resourceType, resourceId, changes, ipAddress }: AuditLogInput) => {
  await db.insert(auditLogs).values({
    userId: userId || null,
    action,
    resourceType,
    resourceId: resourceId || null,
    changes: sanitizeChanges(changes),
    ipAddress: ipAddress || null,
  });
};

export const writeAuditLogAsync = (input: AuditLogInput) => {
  void writeAuditLog(input).catch((_error) => {
    // console.error("Failed to write audit log", error);
  });
};

const parsePagination = (query: AuditLogListQuery) => {
  const page = Math.max(Number(query.page || 1), 1);
  const limit = Math.min(Math.max(Number(query.limit || 20), 1), 100);
  return { page, limit, offset: (page - 1) * limit };
};

const appTimezoneOffset = "+07:00";
const appTimezone = "Asia/Jakarta";

const getDateRange = (query: AuditLogListQuery) => {
  const startValue = query.startDate || query.start_date || query.date;
  const endValue = query.endDate || query.end_date || startValue;
  if (!startValue || !endValue) return null;

  const start = new Date(`${startValue}T00:00:00.000${appTimezoneOffset}`);
  const end = new Date(`${endValue}T00:00:00.000${appTimezoneOffset}`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;

  const normalizedStart = start <= end ? start : end;
  const normalizedEnd = start <= end ? end : start;
  normalizedEnd.setDate(normalizedEnd.getDate() + 1);
  return { start: normalizedStart, end: normalizedEnd };
};

const getLegacyDateRange = (date?: string) => {
  if (!date) return null;

  const start = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime())) return null;

  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
};

const parseCsvFilter = (value?: string) => value
  ?.split(",")
  .map((item) => item.trim())
  .filter(Boolean) ?? [];

const activityCategoryResourceTypes: Record<NonNullable<AuditLogListQuery["activity_category"]>, string[]> = {
  reminder: ["medication_reminder_job"],
  adherence: ["patient", "medication_schedule", "medication_log", "alert"],
  food_scan: ["food_scan", "interaction_result"],
  administration: ["user", "admin_approval", "nurse", "prescription"],
};

const hiddenActivityResourceTypes = ["notification", "push_subscription", "user_push_subscription"];

const isWarningOrCriticalAction = (action: string) => /failed|critical|missed|deactivated|deleted|warning|updated|resolved|snoozed/i.test(action);

const getSeverityCondition = (severity?: AuditLogListQuery["severity"]) => {
  if (severity === "success") {
    return or(
      ilike(auditLogs.action, "%created%"),
      ilike(auditLogs.action, "%delivered%"),
      ilike(auditLogs.action, "%confirmed%"),
    );
  }

  if (severity === "info") {
    return and(
      sql`not (${auditLogs.action} ilike any(array['%created%', '%delivered%', '%confirmed%', '%warning%', '%updated%', '%resolved%', '%snoozed%', '%failed%', '%critical%', '%missed%', '%deactivated%', '%deleted%']))`,
    );
  }

  if (severity === "critical") {
    return or(
      ilike(auditLogs.action, "%failed%"),
      ilike(auditLogs.action, "%critical%"),
      ilike(auditLogs.action, "%missed%"),
      ilike(auditLogs.action, "%deactivated%"),
      ilike(auditLogs.action, "%deleted%"),
    );
  }

  if (severity === "warning") {
    return or(
      ilike(auditLogs.action, "%warning%"),
      ilike(auditLogs.action, "%updated%"),
      ilike(auditLogs.action, "%resolved%"),
      ilike(auditLogs.action, "%snoozed%"),
    );
  }

  return undefined;
};

const getLocalDateKey = (date: Date) => new Intl.DateTimeFormat("en-CA", {
  timeZone: appTimezone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(date);

const adminApprovalActionList = ["auth.register.pending", "admin.approved", "admin.rejected", "admin.restored", "admin.suspended", "admin.activated"];

export const listAuditLogs = async (query: AuditLogListQuery, user?: AccessUser) => {
  const { page, limit, offset } = parsePagination(query);
  const userId = query.userId || query.user_id;
  const userRole = query.userRole || query.user_role;
  const nurseId = query.nurseId || query.nurse_id;
  const activityCategory = query.activityCategory || query.activity_category;
  const resourceType = query.resourceType || query.resource_type;
  const resourceId = query.resourceId || query.resource_id;
  const dateRange = getDateRange(query) || getLegacyDateRange(query.date);
  const baseConditions = [];

  if (userRole !== "super_admin") {
    baseConditions.push(notInArray(auditLogs.resourceType, hiddenActivityResourceTypes));
  }

  if (user?.role === "nurse") {
    baseConditions.push(eq(auditLogs.userId, user.id));
  } else if (user?.role === "admin") {
    const organizationId = await getOrganizationIdForUser(user.id);
    if (organizationId) {
      const orgUserIds = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.organizationId, organizationId));
      const userIds = orgUserIds.map((row) => row.id);
      if (userIds.length > 0) {
        baseConditions.push(inArray(auditLogs.userId, userIds));
      } else {
        baseConditions.push(eq(auditLogs.userId, user.id));
      }
    } else {
      baseConditions.push(eq(auditLogs.userId, user.id));
    }
  } else if (userId) {
    baseConditions.push(eq(auditLogs.userId, userId));
  }
  if (userRole === "super_admin") {
    baseConditions.push(inArray(auditLogs.action, ["auth.register.pending", "admin.approved", "admin.rejected", "admin.restored", "admin.suspended", "admin.activated"]));
  } else if (userRole) {
    baseConditions.push(eq(users.role, userRole));
  }

  const conditions = [...baseConditions];

  if (nurseId) {
    const assignedPatientIds = await getAssignedPatientIdsForNurse(nurseId);
    const nurseConditions = [
      and(eq(auditLogs.resourceType, "nurse"), eq(auditLogs.resourceId, nurseId)),
      ...(assignedPatientIds.length > 0 ? [and(eq(auditLogs.resourceType, "patient"), inArray(auditLogs.resourceId, assignedPatientIds))] : []),
    ];
    const nurseScopeCondition = or(...nurseConditions);
        if (nurseScopeCondition) conditions.push(nurseScopeCondition);
  }
  const actions = parseCsvFilter(query.action);
  if (actions.length === 1) conditions.push(eq(auditLogs.action, actions[0]));
  if (actions.length > 1) conditions.push(inArray(auditLogs.action, actions));
  const statusActionMap: Record<string, string[]> = {
    pending: ["auth.register.pending", "admin.restored"],
    active: ["admin.approved", "admin.activated"],
    rejected: ["admin.rejected"],
    suspended: ["admin.suspended"],
  };
  const statusActions = query.status ? statusActionMap[query.status] : undefined;
  const severityActionMap: Record<string, string[]> = {
    success: ["admin.approved", "admin.activated"],
    info: ["auth.register.pending", "admin.restored"],
    warning: ["admin.rejected"],
    critical: ["admin.suspended"],
  };
  const severityFilterActions = query.severityFilter ? severityActionMap[query.severityFilter] : undefined;
  let approvalFilterActions: string[] | undefined;
  if (statusActions && severityFilterActions) {
    approvalFilterActions = statusActions.filter((a) => severityFilterActions.includes(a));
  } else {
    approvalFilterActions = statusActions ?? severityFilterActions;
  }
  if (approvalFilterActions?.length === 1) conditions.push(eq(auditLogs.action, approvalFilterActions[0]));
  if (approvalFilterActions && approvalFilterActions.length > 1) conditions.push(inArray(auditLogs.action, approvalFilterActions));
  const severityCondition = getSeverityCondition(query.severity);
  if (severityCondition) conditions.push(severityCondition);
  const resourceTypes = activityCategory ? activityCategoryResourceTypes[activityCategory] ?? [] : parseCsvFilter(resourceType);
  if (resourceTypes.length === 1) conditions.push(eq(auditLogs.resourceType, resourceTypes[0]));
  if (resourceTypes.length > 1) conditions.push(inArray(auditLogs.resourceType, resourceTypes));
  if (resourceId) conditions.push(eq(auditLogs.resourceId, resourceId));
  if (query.search) {
    const search = `%${query.search}%`;
    const searchCondition = or(
          ilike(users.fullName, search),
          ilike(users.email, search),
          ilike(auditLogs.action, search),
          ilike(auditLogs.resourceType, search),
          ilike(sql`${auditLogs.resourceId}::text`, search),
          ilike(sql`${auditLogs.changes}::text`, search),
        );
        if (searchCondition) conditions.push(searchCondition);
  }
  if (dateRange) {
    conditions.push(gte(auditLogs.createdAt, dateRange.start));
    conditions.push(lt(auditLogs.createdAt, dateRange.end));
  }

  const filteredWhere = conditions.length > 0 ? and(...conditions) : undefined;
  const summaryWhere = baseConditions.length > 0 ? and(...baseConditions) : undefined;

  const [rows, totalRows, summaryRows, processedTodayResult] = await Promise.all([
    db
      .select({
        id: auditLogs.id,
        userId: auditLogs.userId,
        userName: users.fullName,
        action: auditLogs.action,
        resourceType: auditLogs.resourceType,
        resourceId: auditLogs.resourceId,
        changes: auditLogs.changes,
        ipAddress: auditLogs.ipAddress,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .where(filteredWhere)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ total: count() })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .where(filteredWhere),
    db
      .select({
        action: auditLogs.action,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .where(summaryWhere),
    db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(auditLogs)
      .where(and(
        sql`(${auditLogs.createdAt} AT TIME ZONE 'UTC' AT TIME ZONE ${appTimezone})::date = (CURRENT_TIMESTAMP AT TIME ZONE ${appTimezone})::date`,
        inArray(auditLogs.action, adminApprovalActionList),
      )),
  ]);
  const todayKey = getLocalDateKey(new Date());
  const warningCritical = summaryRows.filter((row) => isWarningOrCriticalAction(row.action)).length;
  const today = summaryRows.filter((row) => row.createdAt && getLocalDateKey(row.createdAt) === todayKey).length;
  const pending = summaryRows.filter((row) => row.action === "auth.register.pending").length;
  const processedToday = Number(processedTodayResult[0]?.count ?? 0);

  return {
    data: rows,
    meta: { page, limit, total: totalRows[0]?.total || 0, summary: { warningCritical, today, pending, processedToday } },
  };
};

export const diffChanges = <T extends Record<string, unknown>>(before: T, after: Partial<T>, fields: Array<keyof T>) => {
  const changes: AuditChange = {};

  for (const field of fields) {
    if (!(field in after)) continue;
    const beforeValue = before[field];
    const afterValue = after[field];

    if (JSON.stringify(beforeValue) !== JSON.stringify(afterValue)) {
      changes[String(field)] = { from: beforeValue ?? null, to: afterValue ?? null };
    }
  }

  return changes;
};
