import webpush from "web-push";
import { and, count, desc, eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { notifications, pushSubscriptions } from "../db/schema";
import { NotificationPreferenceDTO, PushSubscriptionDTO, SendNotificationDTO } from "../types/notification.types";
import { AccessUser, assertCanAccessPatient, scopedPatientFilter } from "./access-control.service";
import { writeAuditLog } from "./audit-log.service";

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

export const sendPushNotification = async (dto: SendNotificationDTO, user?: AccessUser) => {
  if (user) await assertCanAccessPatient(user, dto.patientId);

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

  const subscriptions = await db
    .select()
    .from(pushSubscriptions)
    .where(and(
      eq(pushSubscriptions.patientId, dto.patientId),
      eq(pushSubscriptions.isEnabled, true),
    ));

  if (subscriptions.length === 0) {
    await db.update(notifications).set({ status: "skipped" }).where(eq(notifications.id, notification.id));
    await writeAuditLog({
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

  await writeAuditLog({
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
