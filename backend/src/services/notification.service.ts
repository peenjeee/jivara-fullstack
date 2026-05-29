import webpush from "web-push";
import { and, count, desc, eq, gte, ilike, inArray, lt, or, sql } from "drizzle-orm";
import { db } from "../db";
import { notifications, nurses, patientNurseAssignments, patients, pushSubscriptions, userNotificationPreferences, userPushSubscriptions, users } from "../db/schema";
import { NotificationPreferenceDTO, PushSubscriptionDTO, SendNotificationDTO, UserNotificationPreferenceDTO, UserPushSubscriptionDTO } from "../types/notification.types";
import { AccessUser, assertCanAccessPatient, getAssignedPatientIdsForNurse, getPatientIdForUser, scopedPatientFilter } from "./access-control.service";
import { deleteCachedByPrefix, getCached, setCached } from "./cache.service";
import { writeAuditLogAsync } from "./audit-log.service";

const NOTIF_CACHE_TTL_MS = Number(process.env.NOTIF_CACHE_TTL_MS || 15_000);
const NOTIF_CACHE_PREFIX = "notif:";

const getNotifListCacheKey = (query: Record<string, unknown>, user?: AccessUser) => {
  const normalizedQuery = Object.entries(query)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${String(value)}`)
    .join("&");
  return `${NOTIF_CACHE_PREFIX}list:${user?.id || "anon"}:${normalizedQuery}`;
};

const getNotifPrefCacheKey = (patientId: string) => `${NOTIF_CACHE_PREFIX}pref:${patientId}`;
const getUserNotifPrefCacheKey = (key: string, userId: string) => `${NOTIF_CACHE_PREFIX}user-pref:${userId}:${key}`;
const getNotifAnalyticsCacheKey = (query: Record<string, unknown>, user?: AccessUser) => {
  const normalizedQuery = Object.entries(query)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${String(value)}`)
    .join("&");
  return `${NOTIF_CACHE_PREFIX}analytics:${user?.id || "anon"}:${normalizedQuery}`;
};

const invalidateNotifCache = () => deleteCachedByPrefix(NOTIF_CACHE_PREFIX);

type NotifListResult = {
  data: unknown[];
  meta: { page: number; limit: number; total: number; summary?: { warningCritical: number; today: number } };
};

type NotifPrefResult = {
  patientId: string;
  enabled: boolean;
  subscriptionCount: number;
  activeSubscriptions: number;
};

type UserNotifPrefResult = {
  key: string;
  enabled: boolean;
};

type NotifAnalyticsResult = {
  total: number;
  delivered: number;
  opened: number;
  clicked: number;
  openRate: number;
  clickThroughRate?: number;
  averageTimeToOpenMs: number | null;
  byType?: Array<{ type: string; total: number; delivered: number; opened: number }>;
};

const configureWebPush = () => {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@jivara.app";

  if (!publicKey || !privateKey) return false;

  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
};

const parsePagination = (query: Record<string, unknown>) => {
  const page = Math.max(Number(query.page || 1), 1);
  const limit = Math.min(Math.max(Number(query.limit || 20), 1), 100);
  return { page, limit, offset: (page - 1) * limit };
};

const appTimezoneOffset = "+07:00";
const appTimezone = "Asia/Jakarta";

const getDateRange = (query: Record<string, unknown>) => {
  const startValue = typeof query.startDate === "string"
    ? query.startDate
    : typeof query.start_date === "string"
      ? query.start_date
      : typeof query.date === "string"
        ? query.date
        : undefined;
  const endValue = typeof query.endDate === "string"
    ? query.endDate
    : typeof query.end_date === "string"
      ? query.end_date
      : startValue;
  if (!startValue || !endValue) return null;

  const start = new Date(`${startValue}T00:00:00.000${appTimezoneOffset}`);
  const end = new Date(`${endValue}T00:00:00.000${appTimezoneOffset}`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;

  const normalizedStart = start <= end ? start : end;
  const normalizedEnd = start <= end ? end : start;
  normalizedEnd.setDate(normalizedEnd.getDate() + 1);
  return { start: normalizedStart, end: normalizedEnd };
};

const getNotificationCategoryCondition = (category?: string) => {
  if (category === "food_scan") return ilike(notifications.type, "%food%");
  if (category === "adherence") {
    return or(
      ilike(notifications.type, "%adherence%"),
      ilike(notifications.type, "%escalation%"),
      ilike(notifications.type, "%missed%"),
      ilike(notifications.type, "%critical%"),
    );
  }
  if (category === "administration") {
    return or(
      ilike(notifications.type, "%admin%"),
      ilike(notifications.type, "%approval%"),
      ilike(notifications.type, "%system%"),
    );
  }
  if (category === "reminder") {
    return sql`not (${notifications.type} ilike any(array['%food%', '%adherence%', '%escalation%', '%missed%', '%critical%', '%admin%', '%approval%', '%system%']))`;
  }
  return undefined;
};

const getNotificationSeverityCondition = (severity?: string) => {
  if (severity === "critical") return eq(notifications.urgency, "critical");
  if (severity === "warning") return inArray(notifications.urgency, ["urgent", "high"]);
  if (severity === "success") return sql`${notifications.urgency} not in ('urgent', 'high', 'critical')`;
  return undefined;
};

const getPayloadSize = (value: unknown) => Buffer.byteLength(JSON.stringify(value), "utf8");

const isInvalidSubscriptionError = (result: PromiseSettledResult<unknown>) => {
  if (result.status !== "rejected") return false;

  const error = result.reason as { statusCode?: number };
  return error.statusCode === 404 || error.statusCode === 410;
};

type UserPushNotificationDTO = {
  userIds?: string[];
  roles?: string[];
  organizationId?: string | null;
  preferenceKey: string;
  type: string;
  title: string;
  body: string;
  urgency?: "normal" | "urgent" | "critical";
  data?: Record<string, unknown>;
};

const unique = (values: string[]) => Array.from(new Set(values.filter(Boolean)));

const resolveRoleUserIds = async (dto: Pick<UserPushNotificationDTO, "roles" | "organizationId">) => {
  if (!dto.roles || dto.roles.length === 0) return [];

  const conditions = [
    inArray(users.role, dto.roles),
    eq(users.isActive, true),
    eq(users.accountStatus, "active"),
  ];

  if (dto.organizationId) conditions.push(eq(users.organizationId, dto.organizationId));

  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(and(...conditions));

  return rows.map((row) => row.id);
};

const resolveCareTeamTargets = async (patientId: string) => {
  const patientRows = await db
    .select({ organizationId: patients.organizationId, patientName: users.fullName })
    .from(patients)
    .innerJoin(users, eq(users.id, patients.userId))
    .where(eq(patients.id, patientId))
    .limit(1);

  const patient = patientRows[0];
  if (!patient) return { adminUserIds: [], nurseUserIds: [], patientName: "Pasien" };

  const adminRows = patient.organizationId
    ? await db
      .select({ id: users.id })
      .from(users)
      .where(and(
        eq(users.organizationId, patient.organizationId),
        eq(users.role, "admin"),
        eq(users.isActive, true),
        eq(users.accountStatus, "active"),
      ))
    : [];

  const assignmentRows = await db
    .select({ nurseId: patientNurseAssignments.nurseId })
    .from(patientNurseAssignments)
    .where(and(
      eq(patientNurseAssignments.patientId, patientId),
      eq(patientNurseAssignments.isActive, true),
    ));

  const nurseIds = unique(assignmentRows.map((assignment) => assignment.nurseId));
  const nurseRows = nurseIds.length > 0
    ? await db
      .select({ userId: nurses.userId })
      .from(nurses)
      .where(and(
        inArray(nurses.id, nurseIds),
        eq(nurses.isActive, true),
      ))
    : [];

  return {
    adminUserIds: unique(adminRows.map((row) => row.id)),
    nurseUserIds: unique(nurseRows.map((row) => row.userId)),
    patientName: patient.patientName,
  };
};

const resolvePatientIdForCurrentUser = async (user: AccessUser | undefined, patientId?: string) => {
  if (patientId) {
    await assertCanAccessPatient(user, patientId);
    return patientId;
  }

  if (!user) {
    throw { status: 401, message: "Autentikasi diperlukan", code: "MISSING_TOKEN" };
  }

  if (user.role !== "patient") {
    throw { status: 400, message: "patientId wajib diisi", code: "VALIDATION_ERROR" };
  }

  const resolvedPatientId = await getPatientIdForUser(user.id);
  if (!resolvedPatientId) {
    throw { status: 404, message: "Data pasien tidak ditemukan", code: "PATIENT_NOT_FOUND" };
  }

  return resolvedPatientId;
};

const filterUsersByPreference = async (userIds: string[], preferenceKey: string) => {
  if (userIds.length === 0) return [];

  const disabledRows = await db
    .select({ userId: userNotificationPreferences.userId })
    .from(userNotificationPreferences)
    .where(and(
      inArray(userNotificationPreferences.userId, userIds),
      eq(userNotificationPreferences.preferenceKey, preferenceKey),
      eq(userNotificationPreferences.isEnabled, false),
    ));

  const disabledIds = new Set(disabledRows.map((row) => row.userId));
  return userIds.filter((userId) => !disabledIds.has(userId));
};

export const getVapidPublicKey = () => {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  if (!publicKey) {
    throw { status: 500, message: "VAPID public key belum dikonfigurasi", code: "VAPID_NOT_CONFIGURED" };
  }

  return { publicKey };
};

export const subscribeDevice = async (dto: PushSubscriptionDTO, user: AccessUser | undefined) => {
  const patientId = await resolvePatientIdForCurrentUser(user, dto.patientId);

  const existing = await db
    .select({ id: pushSubscriptions.id })
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, dto.endpoint))
    .limit(1);

  if (existing.length > 0) {
    const [subscription] = await db
      .update(pushSubscriptions)
      .set({
        patientId,
        userId: user!.id,
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
        userAgent: dto.userAgent || null,
        isEnabled: true,
        updatedAt: new Date(),
      })
      .where(eq(pushSubscriptions.id, existing[0].id))
    .returning();

  invalidateNotifCache();

  writeAuditLogAsync({
    userId: user?.id || null,
    action: "push_subscription.updated",
      resourceType: "push_subscription",
      resourceId: subscription.id,
      changes: { patientId, enabled: true },
    });

    return subscription;
  }

  const [subscription] = await db
    .insert(pushSubscriptions)
    .values({
      patientId,
      userId: user!.id,
      endpoint: dto.endpoint,
      p256dh: dto.keys.p256dh,
      auth: dto.keys.auth,
      userAgent: dto.userAgent || null,
      isEnabled: true,
    })
    .returning();

  invalidateNotifCache();

  writeAuditLogAsync({
    userId: user?.id || null,
    action: "push_subscription.created",
    resourceType: "push_subscription",
    resourceId: subscription.id,
    changes: { patientId, enabled: true },
  });

  return subscription;
};

export const subscribeUserDevice = async (dto: UserPushSubscriptionDTO, user: AccessUser | undefined) => {
  if (!user) {
    throw { status: 401, message: "Autentikasi diperlukan", code: "MISSING_TOKEN" };
  }

  const existing = await db
    .select({ id: userPushSubscriptions.id })
    .from(userPushSubscriptions)
    .where(eq(userPushSubscriptions.endpoint, dto.endpoint))
    .limit(1);

  if (existing.length > 0) {
    const [subscription] = await db
      .update(userPushSubscriptions)
      .set({
        userId: user.id,
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
        userAgent: dto.userAgent || null,
        isEnabled: true,
        updatedAt: new Date(),
      })
      .where(eq(userPushSubscriptions.id, existing[0].id))
      .returning();

  invalidateNotifCache();

  writeAuditLogAsync({
    userId: user.id,
    action: "user_push_subscription.updated",
      resourceType: "user_push_subscription",
      resourceId: subscription.id,
      changes: { enabled: true },
    });

    return subscription;
  }

  const [subscription] = await db
    .insert(userPushSubscriptions)
    .values({
      userId: user.id,
      endpoint: dto.endpoint,
      p256dh: dto.keys.p256dh,
      auth: dto.keys.auth,
      userAgent: dto.userAgent || null,
      isEnabled: true,
    })
    .returning();

  invalidateNotifCache();

  writeAuditLogAsync({
    userId: user.id,
    action: "user_push_subscription.created",
    resourceType: "user_push_subscription",
    resourceId: subscription.id,
    changes: { enabled: true },
  });

  return subscription;
};

export const setNotificationPreference = async (dto: NotificationPreferenceDTO, user: AccessUser | undefined) => {
  const patientId = await resolvePatientIdForCurrentUser(user, dto.patientId);

  const rows = await db
    .update(pushSubscriptions)
    .set({ isEnabled: dto.enabled, updatedAt: new Date() })
    .where(and(
      eq(pushSubscriptions.patientId, patientId),
      eq(pushSubscriptions.userId, user!.id),
    ))
    .returning();

  invalidateNotifCache();

  writeAuditLogAsync({
    userId: user?.id || null,
    action: "notification.preference.updated",
    resourceType: "patient",
    resourceId: patientId,
    changes: { enabled: dto.enabled, updatedSubscriptions: rows.length },
  });

  return {
    patientId,
    enabled: dto.enabled,
    subscriptionCount: rows.length,
    activeSubscriptions: rows.filter((subscription) => subscription.isEnabled).length,
  };
};

export const getNotificationPreference = async (patientId: string | undefined, user: AccessUser | undefined): Promise<NotifPrefResult> => {
  patientId = await resolvePatientIdForCurrentUser(user, patientId);
  const cacheKey = getNotifPrefCacheKey(patientId);
  const cached = getCached<NotifPrefResult>(cacheKey);
  if (cached) return cached;

  const subscriptions = await db
    .select({ isEnabled: pushSubscriptions.isEnabled })
    .from(pushSubscriptions)
    .where(and(
      eq(pushSubscriptions.patientId, patientId),
      eq(pushSubscriptions.userId, user!.id),
    ));

  const activeSubscriptions = subscriptions.filter((subscription) => subscription.isEnabled).length;

  const result = {
    patientId,
    enabled: activeSubscriptions > 0,
    subscriptionCount: subscriptions.length,
    activeSubscriptions,
  };
  setCached(cacheKey, result, NOTIF_CACHE_TTL_MS);
  return result;
};

export const getUserNotificationPreference = async (key: string, user: AccessUser | undefined): Promise<UserNotifPrefResult> => {
  if (!user) {
    throw { status: 401, message: "Autentikasi diperlukan", code: "MISSING_TOKEN" };
  }

  const cacheKey = getUserNotifPrefCacheKey(key, user.id);
  const cached = getCached<UserNotifPrefResult>(cacheKey);
  if (cached) return cached;

  const rows = await db
    .select()
    .from(userNotificationPreferences)
    .where(and(
      eq(userNotificationPreferences.userId, user.id),
      eq(userNotificationPreferences.preferenceKey, key),
    ))
    .limit(1);

  const result = {
    key,
    enabled: rows[0]?.isEnabled ?? true,
  };
  setCached(cacheKey, result, NOTIF_CACHE_TTL_MS);
  return result;
};

export const setUserNotificationPreference = async (dto: UserNotificationPreferenceDTO, user: AccessUser | undefined) => {
  if (!user) {
    throw { status: 401, message: "Autentikasi diperlukan", code: "MISSING_TOKEN" };
  }

  const existing = await db
    .select()
    .from(userNotificationPreferences)
    .where(and(
      eq(userNotificationPreferences.userId, user.id),
      eq(userNotificationPreferences.preferenceKey, dto.key),
    ))
    .limit(1);

  const currentValue = existing[0]?.isEnabled ?? true;
  const hasChanged = currentValue !== dto.enabled;

  const [preference] = await db
    .insert(userNotificationPreferences)
    .values({
      userId: user.id,
      preferenceKey: dto.key,
      isEnabled: dto.enabled,
    })
    .onConflictDoUpdate({
      target: [userNotificationPreferences.userId, userNotificationPreferences.preferenceKey],
      set: { isEnabled: dto.enabled, updatedAt: new Date() },
    })
    .returning();

  invalidateNotifCache();

  if (hasChanged) {
    writeAuditLogAsync({
      userId: user.id,
      action: "user_notification_preference.updated",
      resourceType: "user",
      resourceId: user.id,
      changes: { key: dto.key, enabled: dto.enabled, previousValue: currentValue },
    });
  }

  return {
    key: preference.preferenceKey,
    enabled: preference.isEnabled ?? true,
  };
};

export const listNotifications = async (query: Record<string, unknown>, user: AccessUser | undefined): Promise<NotifListResult> => {
  const cacheKey = getNotifListCacheKey(query, user);
  const cached = getCached<NotifListResult>(cacheKey);
  if (cached) return cached;

  const patientId = typeof query.patient_id === "string" ? query.patient_id : typeof query.patientId === "string" ? query.patientId : undefined;
  const nurseId = typeof query.nurse_id === "string" ? query.nurse_id : typeof query.nurseId === "string" ? query.nurseId : undefined;
  const type = typeof query.type === "string" ? query.type : undefined;
  const status = typeof query.status === "string" ? query.status : undefined;
  const activityCategory = typeof query.activity_category === "string" ? query.activity_category : typeof query.activityCategory === "string" ? query.activityCategory : undefined;
  const severity = typeof query.severity === "string" ? query.severity : undefined;
  const search = typeof query.search === "string" ? query.search.trim() : "";
  const dateRange = getDateRange(query);
  const conditions = [];
  const { page, limit, offset } = parsePagination(query);
  const scopedFilter = await scopedPatientFilter(notifications.patientId, user, patientId);

  if (!scopedFilter.scope.allowed) {
    const emptyResult = { data: [], meta: { page, limit, total: 0 } };
    setCached(cacheKey, emptyResult, NOTIF_CACHE_TTL_MS);
    return emptyResult;
  }
  if (scopedFilter.condition) conditions.push(scopedFilter.condition);
  if (nurseId) {
    const assignedPatientIds = await getAssignedPatientIdsForNurse(nurseId);
    if (assignedPatientIds.length === 0) {
      const emptyResult = {
        data: [],
        meta: { page, limit, total: 0, summary: { warningCritical: 0, today: 0 } },
      };
      setCached(cacheKey, emptyResult, NOTIF_CACHE_TTL_MS);
      return emptyResult;
    }
    conditions.push(inArray(notifications.patientId, assignedPatientIds));
  }
  if (type) conditions.push(eq(notifications.type, type));
  if (status) conditions.push(eq(notifications.status, status));
  const categoryCondition = getNotificationCategoryCondition(activityCategory);
  if (categoryCondition) conditions.push(categoryCondition);
  const severityCondition = getNotificationSeverityCondition(severity);
  if (severityCondition) conditions.push(severityCondition);
  if (search) {
    const searchPattern = `%${search}%`;
    conditions.push(or(
      ilike(notifications.title, searchPattern),
      ilike(notifications.body, searchPattern),
      ilike(notifications.type, searchPattern),
      ilike(sql`${notifications.patientId}::text`, searchPattern),
    ));
  }
  if (dateRange) {
    conditions.push(gte(notifications.createdAt, dateRange.start));
    conditions.push(lt(notifications.createdAt, dateRange.end));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, totalRows, summaryRows, todayRows] = await Promise.all([
    db
      .select()
      .from(notifications)
      .where(where)
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ total: count() })
      .from(notifications)
      .where(where),
    db
      .select({ total: count() })
      .from(notifications)
      .where(conditions.length > 0 ? and(...conditions, inArray(notifications.urgency, ["high", "urgent", "critical"])) : inArray(notifications.urgency, ["high", "urgent", "critical"])),
    db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(notifications)
      .where(conditions.length > 0
        ? and(...conditions, sql`(${notifications.createdAt} AT TIME ZONE 'UTC' AT TIME ZONE ${appTimezone})::date = (CURRENT_TIMESTAMP AT TIME ZONE ${appTimezone})::date`)
        : sql`(${notifications.createdAt} AT TIME ZONE 'UTC' AT TIME ZONE ${appTimezone})::date = (CURRENT_TIMESTAMP AT TIME ZONE ${appTimezone})::date`),
  ]);

  const result = {
    data: rows,
    meta: {
      page,
      limit,
      total: totalRows[0]?.total || 0,
      summary: {
        warningCritical: summaryRows[0]?.total || 0,
        today: Number(todayRows[0]?.count ?? 0),
      },
    },
  };
  setCached(cacheKey, result, NOTIF_CACHE_TTL_MS);
  return result;
};

export const trackNotificationEvent = async (notificationId: string, eventType: "opened" | "clicked", user?: AccessUser) => {
  const notificationRows = await db.select().from(notifications).where(eq(notifications.id, notificationId)).limit(1);
  const notification = notificationRows[0];

  if (!notification) {
    throw { status: 404, message: "Notifikasi tidak ditemukan", code: "NOTIFICATION_NOT_FOUND" };
  }

  await assertCanAccessPatient(user, notification.patientId);

  const readAt = notification.readAt || new Date();
  await db.update(notifications).set({ readAt }).where(eq(notifications.id, notificationId));

  invalidateNotifCache();

  writeAuditLogAsync({
    userId: user?.id || null,
    action: `notification.${eventType}`,
    resourceType: "notification",
    resourceId: notificationId,
    changes: { patientId: notification.patientId, eventType },
  });

  return {
    notificationId,
    eventType,
    readAt,
    timeToOpenMs: notification.deliveredAt ? readAt.getTime() - notification.deliveredAt.getTime() : null,
  };
};

export const getNotificationAnalytics = async (query: Record<string, unknown>, user: AccessUser | undefined): Promise<NotifAnalyticsResult> => {
  const cacheKey = getNotifAnalyticsCacheKey(query, user);
  const cached = getCached<NotifAnalyticsResult>(cacheKey);
  if (cached) return cached;

  const patientId = typeof query.patient_id === "string" ? query.patient_id : typeof query.patientId === "string" ? query.patientId : undefined;
  const conditions = [];
  const scopedFilter = await scopedPatientFilter(notifications.patientId, user, patientId);

  if (!scopedFilter.scope.allowed) {
    const emptyResult = { total: 0, delivered: 0, opened: 0, clicked: 0, openRate: 0, averageTimeToOpenMs: null };
    setCached(cacheKey, emptyResult, NOTIF_CACHE_TTL_MS);
    return emptyResult;
  }
  if (scopedFilter.condition) conditions.push(scopedFilter.condition);

  const rows = await db.select().from(notifications).where(conditions.length > 0 ? and(...conditions) : undefined);
  const deliveredRows = rows.filter((notification) => notification.deliveredAt);
  const openedRows = rows.filter((notification) => notification.readAt);
  const timeToOpenValues = openedRows
    .map((notification) => notification.deliveredAt && notification.readAt ? notification.readAt.getTime() - notification.deliveredAt.getTime() : null)
    .filter((value): value is number => typeof value === "number" && value >= 0);
  const averageTimeToOpenMs = timeToOpenValues.length > 0
    ? Math.round(timeToOpenValues.reduce((total, value) => total + value, 0) / timeToOpenValues.length)
    : null;

  const result = {
    total: rows.length,
    delivered: deliveredRows.length,
    opened: openedRows.length,
    clicked: openedRows.length,
    openRate: deliveredRows.length > 0 ? Math.round((openedRows.length / deliveredRows.length) * 10000) / 100 : 0,
    clickThroughRate: deliveredRows.length > 0 ? Math.round((openedRows.length / deliveredRows.length) * 10000) / 100 : 0,
    averageTimeToOpenMs,
    byType: Object.values(rows.reduce<Record<string, { type: string; total: number; delivered: number; opened: number }>>((summary, notification) => {
      const type = notification.type;
      summary[type] ??= { type, total: 0, delivered: 0, opened: 0 };
      summary[type].total += 1;
      if (notification.deliveredAt) summary[type].delivered += 1;
      if (notification.readAt) summary[type].opened += 1;
      return summary;
    }, {})),
  };

  setCached(cacheKey, result, NOTIF_CACHE_TTL_MS);
  return result;
};

export const sendUserPushNotification = async (dto: UserPushNotificationDTO) => {
  const roleUserIds = await resolveRoleUserIds(dto);
  const targetUserIds = await filterUsersByPreference(unique([...(dto.userIds || []), ...roleUserIds]), dto.preferenceKey);

  if (targetUserIds.length === 0) {
    return { sent: 0, failed: 0, skipped: true, targetUsers: 0 };
  }

  const payload = {
    title: dto.title,
    body: dto.body,
    type: dto.type,
    urgency: dto.urgency || "normal",
    data: dto.data || {},
  };

  if (getPayloadSize(payload) > 3500) {
    throw { status: 400, message: "Payload push notification terlalu besar", code: "PAYLOAD_TOO_LARGE" };
  }

  const subscriptions = await db
    .select()
    .from(userPushSubscriptions)
    .where(and(
      inArray(userPushSubscriptions.userId, targetUserIds),
      eq(userPushSubscriptions.isEnabled, true),
    ));

  if (subscriptions.length === 0) {
    writeAuditLogAsync({
      userId: null,
      action: "user_notification.skipped",
      resourceType: "user_push_subscription",
      resourceId: targetUserIds[0] || null,
      changes: { type: dto.type, preferenceKey: dto.preferenceKey, reason: "no_active_subscription", targetUsers: targetUserIds.length },
    });

    return { sent: 0, failed: 0, skipped: true, targetUsers: targetUserIds.length };
  }

  if (!configureWebPush()) {
    writeAuditLogAsync({
      userId: null,
      action: "user_notification.failed",
      resourceType: "user_push_subscription",
      resourceId: subscriptions[0]?.id || null,
      changes: { type: dto.type, preferenceKey: dto.preferenceKey, reason: "vapid_not_configured", targetUsers: targetUserIds.length },
    });

    return { sent: 0, failed: subscriptions.length, skipped: false, targetUsers: targetUserIds.length };
  }

  const serializedPayload = JSON.stringify(payload);
  const results = await Promise.allSettled(subscriptions.map((subscription) => webpush.sendNotification({
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    },
  }, serializedPayload)));

  const sent = results.filter((result) => result.status === "fulfilled").length;
  const failed = results.length - sent;

  if (failed > 0) {
    const failedEndpoints = subscriptions
      .filter((_, index) => isInvalidSubscriptionError(results[index]))
      .map((subscription) => subscription.endpoint);

    if (failedEndpoints.length > 0) {
      await db
        .update(userPushSubscriptions)
        .set({ isEnabled: false, updatedAt: new Date() })
        .where(inArray(userPushSubscriptions.endpoint, failedEndpoints));
    }
  }

  writeAuditLogAsync({
    userId: null,
    action: sent > 0 ? "user_notification.delivered" : "user_notification.failed",
    resourceType: "user_push_subscription",
    resourceId: subscriptions[0]?.id || null,
    changes: { type: dto.type, preferenceKey: dto.preferenceKey, sent, failed, targetUsers: targetUserIds.length },
  });

  return { sent, failed, skipped: false, targetUsers: targetUserIds.length };
};

export const sendCareTeamPushNotification = async (patientId: string, dto: Omit<UserPushNotificationDTO, "userIds" | "roles" | "organizationId">) => {
  const targets = await resolveCareTeamTargets(patientId);
  const userIds = unique([...targets.adminUserIds, ...targets.nurseUserIds]);
  return sendUserPushNotification({ ...dto, userIds });
};

export const sendCareTeamCriticalPushNotification = async (patientId: string, dto: Omit<UserPushNotificationDTO, "userIds" | "roles" | "organizationId" | "preferenceKey">) => {
  const targets = await resolveCareTeamTargets(patientId);
  const body = `Pasien ${targets.patientName}: ${dto.body}`;
  const [adminResult, nurseResult] = await Promise.all([
    sendUserPushNotification({ ...dto, body, userIds: targets.adminUserIds, preferenceKey: "admin_critical_activity" }),
    sendUserPushNotification({ ...dto, body, userIds: targets.nurseUserIds, preferenceKey: "nurse_critical_alert" }),
  ]);

  return {
    sent: adminResult.sent + nurseResult.sent,
    failed: adminResult.failed + nurseResult.failed,
    skipped: adminResult.skipped && nurseResult.skipped,
    targetUsers: adminResult.targetUsers + nurseResult.targetUsers,
  };
};

export const sendPushNotification = async (dto: SendNotificationDTO, user?: AccessUser) => {
  if (user) await assertCanAccessPatient(user, dto.patientId);

  const [notification] = await db
    .insert(notifications)
    .values({
      patientId: dto.patientId,
      type: dto.type,
      title: dto.title,
      body: dto.body,
      data: dto.data || null,
      urgency: dto.urgency || "normal",
      scheduledAt: new Date(),
    })
    .returning();

  invalidateNotifCache();

  const trackingUrl = "/api/v1/notifications/events";
  const payload = {
    title: dto.title,
    body: dto.body,
    type: dto.type,
    urgency: dto.urgency || "normal",
    data: { ...(dto.data || {}), notification_id: notification.id, tracking_url: trackingUrl },
  };

  if (getPayloadSize(payload) > 3500) {
    throw { status: 400, message: "Payload push notification terlalu besar", code: "PAYLOAD_TOO_LARGE" };
  }

  const subscriptions = await db
    .select()
    .from(pushSubscriptions)
    .where(and(
      eq(pushSubscriptions.patientId, dto.patientId),
      eq(pushSubscriptions.isEnabled, true),
    ));

  if (subscriptions.length === 0) {
    await db.update(notifications).set({ status: "skipped" }).where(eq(notifications.id, notification.id));
    writeAuditLogAsync({
      userId: user?.id || null,
      action: "notification.skipped",
      resourceType: "notification",
      resourceId: notification.id,
      changes: { patientId: dto.patientId, type: dto.type, reason: "no_active_subscription" },
    });
    return { notificationId: notification.id, sent: 0, failed: 0, skipped: true };
  }

  if (!configureWebPush()) {
    await db.update(notifications).set({ status: "failed" }).where(eq(notifications.id, notification.id));
    throw { status: 500, message: "VAPID key belum dikonfigurasi", code: "VAPID_NOT_CONFIGURED" };
  }

  const serializedPayload = JSON.stringify(payload);

  const results = await Promise.allSettled(subscriptions.map((subscription) => webpush.sendNotification({
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    },
  }, serializedPayload)));

  const sent = results.filter((result) => result.status === "fulfilled").length;
  const failed = results.length - sent;

  await db
    .update(notifications)
    .set({ status: sent > 0 ? "delivered" : "failed", deliveredAt: sent > 0 ? new Date() : null })
    .where(eq(notifications.id, notification.id));

  writeAuditLogAsync({
    userId: user?.id || null,
    action: sent > 0 ? "notification.delivered" : "notification.failed",
    resourceType: "notification",
    resourceId: notification.id,
    changes: { patientId: dto.patientId, type: dto.type, sent, failed },
  });

  if (failed > 0) {
    const failedEndpoints = subscriptions
      .filter((_, index) => isInvalidSubscriptionError(results[index]))
      .map((subscription) => subscription.endpoint);

    if (failedEndpoints.length > 0) {
      await db
        .update(pushSubscriptions)
        .set({ isEnabled: false, updatedAt: new Date() })
        .where(inArray(pushSubscriptions.endpoint, failedEndpoints));
    }
  }

  return { notificationId: notification.id, sent, failed, skipped: false };
};
