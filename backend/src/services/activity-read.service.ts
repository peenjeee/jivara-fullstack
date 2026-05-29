import { db } from "../db";
import { activityReads, auditLogs, foodScans, medicationLogs, notifications } from "../db/schema";
import { and, count, eq, gte, inArray, isNotNull, lte, notInArray, sql } from "drizzle-orm";
import { AccessUser, getAssignedPatientIdsForNurse, getNurseIdForUser, getPatientIdForUser } from "./access-control.service";
import { deleteCachedByPrefix, getCached, setCached } from "./cache.service";
import { emitActivityChanged } from "./activity-event.service";

const ACTIVITY_READ_CACHE_TTL_MS = Number(process.env.ACTIVITY_READ_CACHE_TTL_MS || 30_000);
const hiddenActivityResourceTypes = ["notification", "push_subscription", "user_push_subscription"];

type ActivityReadPage = {
  data: Array<{ activityId: string; readAt: Date | null }>;
  meta: { page: number; limit: number; total: number };
};

const cleanActivityIds = (activityIds: unknown) => Array.isArray(activityIds)
  ? [...new Set(activityIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0).map((id) => id.slice(0, 128)))]
  : [];

const parseActivityIdsFilter = (activityIds: unknown) => {
  if (Array.isArray(activityIds)) return cleanActivityIds(activityIds);
  if (typeof activityIds !== "string") return [];

  return cleanActivityIds(activityIds.split(","));
};

const parseActivityReadPagination = (query: { page?: unknown; limit?: unknown }) => {
  const page = Math.max(Number(query.page || 1), 1);
  const limit = Math.min(Math.max(Number(query.limit || 100), 1), 100);
  return { page, limit, offset: (page - 1) * limit };
};

export const listActivityReads = async (userId: string, query: { page?: unknown; limit?: unknown; start_date?: unknown; end_date?: unknown; activity_ids?: unknown } = {}) => {
  const { page, limit, offset } = parseActivityReadPagination(query);
  const startDateStr = typeof query.start_date === "string" ? query.start_date : "";
  const endDateStr = typeof query.end_date === "string" ? query.end_date : "";
  const activityIds = parseActivityIdsFilter(query.activity_ids);

  const cacheKey = `activity-reads:${userId}:${page}:${limit}:${startDateStr || "any"}:${endDateStr || "any"}:${activityIds.join(",") || "any"}`;
  const cached = getCached<ActivityReadPage>(cacheKey);
  if (cached) return cached;

  const conditions = [eq(activityReads.userId, userId)];

  if (activityIds.length > 0) {
    conditions.push(inArray(activityReads.activityId, activityIds));
  }

  if (startDateStr) {
    const start = new Date(startDateStr);
    if (!isNaN(start.getTime())) conditions.push(gte(activityReads.readAt, start));
  }
  
  if (endDateStr) {
    const end = new Date(endDateStr);
    if (!isNaN(end.getTime())) {
      end.setHours(23, 59, 59, 999);
      conditions.push(lte(activityReads.readAt, end));
    }
  }

  const where = and(...conditions);

  const [rows, totalRows] = await Promise.all([
    db
      .select({ activityId: activityReads.activityId, readAt: activityReads.readAt })
      .from(activityReads)
      .where(where)
      .limit(limit)
      .offset(offset),
    db
      .select({ total: count() })
      .from(activityReads)
      .where(where),
  ]);

  const result: ActivityReadPage = { data: rows, meta: { page, limit, total: totalRows[0]?.total ?? 0 } };
  setCached(cacheKey, result, ACTIVITY_READ_CACHE_TTL_MS);
  return result;
};

const getCountValue = (rows: Array<{ total: number }>) => Number(rows[0]?.total ?? 0);

export const getUnreadActivityCount = async (user: AccessUser) => {
  if (user.role === "patient") {
    const patientId = await getPatientIdForUser(user.id);
    if (!patientId) return { count: 0 };

    const [medicationRows, foodScanRows] = await Promise.all([
      db
        .select({ total: count() })
        .from(medicationLogs)
        .where(and(
          eq(medicationLogs.patientId, patientId),
          sql`not exists (select 1 from ${activityReads} where ${activityReads.userId} = ${user.id} and ${activityReads.activityId} = ${medicationLogs.id}::text)`,
        )),
      db
        .select({ total: count() })
        .from(foodScans)
        .where(and(
          eq(foodScans.patientId, patientId),
          isNotNull(foodScans.overallRiskLevel),
          sql`not exists (select 1 from ${activityReads} where ${activityReads.userId} = ${user.id} and ${activityReads.activityId} = ('food-scan-' || ${foodScans.id}::text))`,
        )),
    ]);

    return { count: getCountValue(medicationRows) + getCountValue(foodScanRows) };
  }

  if (user.role === "nurse") {
    const nurseId = await getNurseIdForUser(user.id);
    const assignedPatientIds = nurseId ? await getAssignedPatientIdsForNurse(nurseId) : [];

    const [notificationRows, auditRows] = await Promise.all([
      assignedPatientIds.length === 0
        ? Promise.resolve([{ total: 0 }])
        : db
          .select({ total: count() })
          .from(notifications)
          .where(and(
            inArray(notifications.patientId, assignedPatientIds),
            eq(notifications.status, "delivered"),
            sql`not exists (select 1 from ${activityReads} where ${activityReads.userId} = ${user.id} and ${activityReads.activityId} = ('notification-' || ${notifications.id}::text))`,
          )),
      db
        .select({ total: count() })
        .from(auditLogs)
        .where(and(
          eq(auditLogs.userId, user.id),
          notInArray(auditLogs.resourceType, hiddenActivityResourceTypes),
          sql`not exists (select 1 from ${activityReads} where ${activityReads.userId} = ${user.id} and ${activityReads.activityId} = ${auditLogs.id}::text)`,
        )),
    ]);

    return { count: getCountValue(notificationRows) + getCountValue(auditRows) };
  }

  return { count: 0 };
};

export const markAllUnread = async (user: AccessUser) => {
  let unreadIds: string[] = [];

  if (user.role === "patient") {
    const patientId = await getPatientIdForUser(user.id);
    if (!patientId) return { count: 0 };

    const [medicationRows, foodScanRows] = await Promise.all([
      db
        .select({ id: medicationLogs.id })
        .from(medicationLogs)
        .where(and(
          eq(medicationLogs.patientId, patientId),
          sql`not exists (select 1 from ${activityReads} where ${activityReads.userId} = ${user.id} and ${activityReads.activityId} = ${medicationLogs.id}::text)`,
        )),
      db
        .select({ id: foodScans.id })
        .from(foodScans)
        .where(and(
          eq(foodScans.patientId, patientId),
          isNotNull(foodScans.overallRiskLevel),
          sql`not exists (select 1 from ${activityReads} where ${activityReads.userId} = ${user.id} and ${activityReads.activityId} = ('food-scan-' || ${foodScans.id}::text))`,
        )),
    ]);

    unreadIds = [
      ...medicationRows.map((r) => r.id),
      ...foodScanRows.map((r) => `food-scan-${r.id}`),
    ];
  } else if (user.role === "nurse") {
    const nurseId = await getNurseIdForUser(user.id);
    const assignedPatientIds = nurseId ? await getAssignedPatientIdsForNurse(nurseId) : [];

    const [notificationRows, auditRows] = await Promise.all([
      assignedPatientIds.length === 0
        ? Promise.resolve([] as Array<{ id: string }>)
        : db
          .select({ id: notifications.id })
          .from(notifications)
          .where(and(
            inArray(notifications.patientId, assignedPatientIds),
            eq(notifications.status, "delivered"),
            sql`not exists (select 1 from ${activityReads} where ${activityReads.userId} = ${user.id} and ${activityReads.activityId} = ('notification-' || ${notifications.id}::text))`,
          )),
      db
        .select({ id: auditLogs.id })
        .from(auditLogs)
        .where(and(
          eq(auditLogs.userId, user.id),
          notInArray(auditLogs.resourceType, hiddenActivityResourceTypes),
          sql`not exists (select 1 from ${activityReads} where ${activityReads.userId} = ${user.id} and ${activityReads.activityId} = ${auditLogs.id}::text)`,
        )),
    ]);

    unreadIds = [
      ...notificationRows.map((r) => `notification-${r.id}`),
      ...auditRows.map((r) => r.id),
    ];
  }

  if (unreadIds.length === 0) return { count: 0 };

  await db
    .insert(activityReads)
    .values(unreadIds.map((activityId) => ({ userId: user.id, activityId })))
    .onConflictDoNothing();

  deleteCachedByPrefix(`activity-reads:${user.id}`);
  emitActivityChanged({ reason: "activity-read-updated", targetUserId: user.id });

  return { count: unreadIds.length };
};

export const markActivitiesRead = async (userId: string, rawActivityIds: unknown) => {
  const activityIds = cleanActivityIds(rawActivityIds);
  if (activityIds.length === 0) return [];

  await db
    .insert(activityReads)
    .values(activityIds.map((activityId) => ({ userId, activityId })))
    .onConflictDoNothing();

  // Invalidate cache after marking read
  deleteCachedByPrefix(`activity-reads:${userId}`);
  emitActivityChanged({ reason: "activity-read-updated", targetUserId: userId });

  return db
    .select({ activityId: activityReads.activityId, readAt: activityReads.readAt })
    .from(activityReads)
    .where(and(eq(activityReads.userId, userId), inArray(activityReads.activityId, activityIds)));
};
