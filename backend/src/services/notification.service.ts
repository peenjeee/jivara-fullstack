import webpush from "web-push";
import { and, count, desc, eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { notifications, pushSubscriptions, userNotificationPreferences, userPushSubscriptions } from "../db/schema";
import { NotificationPreferenceDTO, PushSubscriptionDTO, SendNotificationDTO, UserNotificationPreferenceDTO, UserPushSubscriptionDTO } from "../types/notification.types";
import { AccessUser, assertCanAccessPatient, scopedPatientFilter } from "./access-control.service";
import { writeAuditLogAsync } from "./audit-log.service";

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

const getPayloadSize = (value: unknown) => Buffer.byteLength(JSON.stringify(value), "utf8");

const isInvalidSubscriptionError = (result: PromiseSettledResult<unknown>) => {
  if (result.status !== "rejected") return false;

  const error = result.reason as { statusCode?: number };
  return error.statusCode === 404 || error.statusCode === 410;
};

export const getVapidPublicKey = () => {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  if (!publicKey) {
    throw { status: 500, message: "VAPID public key belum dikonfigurasi", code: "VAPID_NOT_CONFIGURED" };
  }

  return { publicKey };
};

export const subscribeDevice = async (dto: PushSubscriptionDTO, user: AccessUser | undefined) => {
  await assertCanAccessPatient(user, dto.patientId);

  const existing = await db
    .select({ id: pushSubscriptions.id })
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, dto.endpoint))
    .limit(1);

  if (existing.length > 0) {
    const [subscription] = await db
      .update(pushSubscriptions)
      .set({
        patientId: dto.patientId,
        userId: user!.id,
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
        userAgent: dto.userAgent || null,
        isEnabled: true,
        updatedAt: new Date(),
      })
      .where(eq(pushSubscriptions.id, existing[0].id))
      .returning();

    writeAuditLogAsync({
      userId: user?.id || null,
      action: "push_subscription.updated",
      resourceType: "push_subscription",
      resourceId: subscription.id,
      changes: { patientId: dto.patientId, enabled: true },
    });

    return subscription;
  }

  const [subscription] = await db
    .insert(pushSubscriptions)
    .values({
      patientId: dto.patientId,
      userId: user!.id,
      endpoint: dto.endpoint,
      p256dh: dto.keys.p256dh,
      auth: dto.keys.auth,
      userAgent: dto.userAgent || null,
      isEnabled: true,
    })
    .returning();

  writeAuditLogAsync({
    userId: user?.id || null,
    action: "push_subscription.created",
    resourceType: "push_subscription",
    resourceId: subscription.id,
    changes: { patientId: dto.patientId, enabled: true },
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

    await writeAuditLog({
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

  await writeAuditLog({
    userId: user.id,
    action: "user_push_subscription.created",
    resourceType: "user_push_subscription",
    resourceId: subscription.id,
    changes: { enabled: true },
  });

  return subscription;
};

export const setNotificationPreference = async (dto: NotificationPreferenceDTO, user: AccessUser | undefined) => {
  await assertCanAccessPatient(user, dto.patientId);

  const rows = await db
    .update(pushSubscriptions)
    .set({ isEnabled: dto.enabled, updatedAt: new Date() })
    .where(and(
      eq(pushSubscriptions.patientId, dto.patientId),
      eq(pushSubscriptions.userId, user!.id),
    ))
    .returning();

  writeAuditLogAsync({
    userId: user?.id || null,
    action: "notification.preference.updated",
    resourceType: "patient",
    resourceId: dto.patientId,
    changes: { enabled: dto.enabled, updatedSubscriptions: rows.length },
  });

  return { enabled: dto.enabled, updatedSubscriptions: rows.length };
};

export const getNotificationPreference = async (patientId: string, user: AccessUser | undefined) => {
  await assertCanAccessPatient(user, patientId);

  const subscriptions = await db
    .select({ isEnabled: pushSubscriptions.isEnabled })
    .from(pushSubscriptions)
    .where(and(
      eq(pushSubscriptions.patientId, patientId),
      eq(pushSubscriptions.userId, user!.id),
    ));

  const activeSubscriptions = subscriptions.filter((subscription) => subscription.isEnabled).length;

  return {
    patientId,
    enabled: activeSubscriptions > 0,
    subscriptionCount: subscriptions.length,
    activeSubscriptions,
  };
};

export const getUserNotificationPreference = async (key: string, user: AccessUser | undefined) => {
  if (!user) {
    throw { status: 401, message: "Autentikasi diperlukan", code: "MISSING_TOKEN" };
  }

  const rows = await db
    .select()
    .from(userNotificationPreferences)
    .where(and(
      eq(userNotificationPreferences.userId, user.id),
      eq(userNotificationPreferences.preferenceKey, key),
    ))
    .limit(1);

  return {
    key,
    enabled: rows[0]?.isEnabled ?? true,
  };
};

export const setUserNotificationPreference = async (dto: UserNotificationPreferenceDTO, user: AccessUser | undefined) => {
  if (!user) {
    throw { status: 401, message: "Autentikasi diperlukan", code: "MISSING_TOKEN" };
  }

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

  writeAuditLogAsync({
    userId: user.id,
    action: "user_notification_preference.updated",
    resourceType: "user",
    resourceId: user.id,
    changes: { key: dto.key, enabled: dto.enabled },
  });

  return {
    key: preference.preferenceKey,
    enabled: preference.isEnabled ?? true,
  };
};

export const listNotifications = async (query: Record<string, unknown>, user: AccessUser | undefined) => {
  const patientId = typeof query.patient_id === "string" ? query.patient_id : typeof query.patientId === "string" ? query.patientId : undefined;
  const type = typeof query.type === "string" ? query.type : undefined;
  const conditions = [];
  const { page, limit, offset } = parsePagination(query);
  const scopedFilter = await scopedPatientFilter(notifications.patientId, user, patientId);

  if (!scopedFilter.scope.allowed) return { data: [], meta: { page, limit, total: 0 } };
  if (scopedFilter.condition) conditions.push(scopedFilter.condition);
  if (type) conditions.push(eq(notifications.type, type));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, totalRows] = await Promise.all([
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
  ]);

  return { data: rows, meta: { page, limit, total: totalRows[0]?.total || 0 } };
};

export const trackNotificationEvent = async (notificationId: string, eventType: "opened" | "clicked") => {
  const notificationRows = await db.select().from(notifications).where(eq(notifications.id, notificationId)).limit(1);
  const notification = notificationRows[0];

  if (!notification) {
    throw { status: 404, message: "Notifikasi tidak ditemukan", code: "NOTIFICATION_NOT_FOUND" };
  }

  const readAt = notification.readAt || new Date();
  await db.update(notifications).set({ readAt }).where(eq(notifications.id, notificationId));

  writeAuditLogAsync({
    userId: null,
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

export const getNotificationAnalytics = async (query: Record<string, unknown>, user: AccessUser | undefined) => {
  const patientId = typeof query.patient_id === "string" ? query.patient_id : typeof query.patientId === "string" ? query.patientId : undefined;
  const conditions = [];
  const scopedFilter = await scopedPatientFilter(notifications.patientId, user, patientId);

  if (!scopedFilter.scope.allowed) return { total: 0, delivered: 0, opened: 0, clicked: 0, openRate: 0, averageTimeToOpenMs: null };
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

  return {
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
