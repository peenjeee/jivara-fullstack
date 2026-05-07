import { db } from "../db";
import { auditLogs, users } from "../db/schema";
import { and, count, desc, eq, gte, lt } from "drizzle-orm";
import { AuditLogListQuery } from "../types/audit-log.types";

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

const parsePagination = (query: AuditLogListQuery) => {
  const page = Math.max(Number(query.page || 1), 1);
  const limit = Math.min(Math.max(Number(query.limit || 20), 1), 100);
  return { page, limit, offset: (page - 1) * limit };
};

const getDateRange = (date?: string) => {
  if (!date) return null;

  const start = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime())) return null;

  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
};

export const listAuditLogs = async (query: AuditLogListQuery) => {
  const { page, limit, offset } = parsePagination(query);
  const userId = query.userId || query.user_id;
  const resourceType = query.resourceType || query.resource_type;
  const resourceId = query.resourceId || query.resource_id;
  const dateRange = getDateRange(query.date);
  const conditions = [];

  if (userId) conditions.push(eq(auditLogs.userId, userId));
  if (query.action) conditions.push(eq(auditLogs.action, query.action));
  if (resourceType) conditions.push(eq(auditLogs.resourceType, resourceType));
  if (resourceId) conditions.push(eq(auditLogs.resourceId, resourceId));
  if (dateRange) {
    conditions.push(gte(auditLogs.createdAt, dateRange.start));
    conditions.push(lt(auditLogs.createdAt, dateRange.end));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: auditLogs.id,
        userId: auditLogs.userId,
        userName: users.fullName,
        userEmail: users.email,
        action: auditLogs.action,
        resourceType: auditLogs.resourceType,
        resourceId: auditLogs.resourceId,
        changes: auditLogs.changes,
        ipAddress: auditLogs.ipAddress,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .where(where)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ total: count() })
      .from(auditLogs)
      .where(where),
  ]);

  return {
    data: rows,
    meta: {
      page,
      limit,
      total: totalRows[0]?.total || 0,
    },
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
