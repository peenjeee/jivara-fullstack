import { db } from "../db";
import { auditLogs } from "../db/schema";

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
