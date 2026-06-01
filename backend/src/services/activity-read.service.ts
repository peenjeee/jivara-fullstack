import { db } from "../db";
import { activityReads, auditLogs, foodScans, medicationLogs } from "../db/schema";
import { and, count, eq, gte, inArray, isNotNull, lt, notInArray, sql } from "drizzle-orm";
import { AccessUser, getPatientIdForUser } from "./access-control.service";
import { deleteCachedByPrefix, getCached, setCached } from "./cache.service";
import { emitActivityChanged } from "./activity-event.service";
import { getAppDateRangeFromQuery } from "../utils/app-timezone";
import { hiddenActivityActions, hiddenActivityResourceTypes } from "./activity-visibility.service";

const ACTIVITY_READ_CACHE_TTL_MS = Number(process.env.ACTIVITY_READ_CACHE_TTL_MS || 30_000);

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
  const dateRange = getAppDateRangeFromQuery({ start_date: startDateStr, end_date: endDateStr });

  if (activityIds.length > 0) {
    conditions.push(inArray(activityReads.activityId, activityIds));
  }

  if (dateRange) {
    conditions.push(gte(activityReads.readAt, dateRange.start));
    conditions.push(lt(activityReads.readAt, dateRange.end));
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
    const auditRows = await db
      .select({ total: count() })
      .from(auditLogs)
      .where(and(
        eq(auditLogs.userId, user.id),
        notInArray(auditLogs.resourceType, hiddenActivityResourceTypes),
        notInArray(auditLogs.action, hiddenActivityActions),
        sql`not exists (select 1 from ${activityReads} where ${activityReads.userId} = ${user.id} and ${activityReads.activityId} = ${auditLogs.id}::text)`,
      ));

    return { count: getCountValue(auditRows) };
  }

  return { count: 0 };
};

export const markAllUnread = async (user: AccessUser, rawActivityIds: unknown = []) => {
  let unreadIds: string[] = [];
  const explicitActivityIds = cleanActivityIds(rawActivityIds);

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
    const auditRows = await db
      .select({ id: auditLogs.id })
      .from(auditLogs)
      .where(and(
        eq(auditLogs.userId, user.id),
        notInArray(auditLogs.resourceType, hiddenActivityResourceTypes),
        notInArray(auditLogs.action, hiddenActivityActions),
        sql`not exists (select 1 from ${activityReads} where ${activityReads.userId} = ${user.id} and ${activityReads.activityId} = ${auditLogs.id}::text)`,
      ));

    unreadIds = auditRows.map((r) => r.id);
  }

  unreadIds = [...new Set([...unreadIds, ...explicitActivityIds])];

  if (unreadIds.length === 0) return { count: 0, activityIds: [] };

  await db
    .insert(activityReads)
    .values(unreadIds.map((activityId) => ({ userId: user.id, activityId })))
    .onConflictDoNothing();

  deleteCachedByPrefix(`activity-reads:${user.id}`);
  emitActivityChanged({ reason: "activity-read-updated", targetUserId: user.id });

  return { count: unreadIds.length, activityIds: unreadIds };
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
