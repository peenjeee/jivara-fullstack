import { Request, Response, NextFunction } from "express";

const isMissing = (value: unknown) =>
  value === undefined || value === null || (typeof value === "string" && !value.trim());

const isValidUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const resolvePatientId = (body: Record<string, unknown>) => body.patientId || body.patient_id;
const allowedUserPreferenceKeys = new Set(["admin_critical_activity", "super_admin_approval", "nurse_critical_alert"]);

const isHttpsUrl = (value: string) => {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
};

const getJsonSize = (value: unknown) => Buffer.byteLength(JSON.stringify(value || {}), "utf8");

export const validateSubscribe = (req: Request, res: Response, next: NextFunction) => {
  const patientId = resolvePatientId(req.body);
  const subscription = req.body.subscription as { endpoint?: string; keys?: { p256dh?: string; auth?: string } } | undefined;

  if (patientId !== undefined && (typeof patientId !== "string" || !isValidUuid(patientId))) {
    return res.status(400).json({ status: "gagal", message: "patientId wajib berupa UUID valid", error_code: "VALIDATION_ERROR" });
  }

  if (!subscription || isMissing(subscription.endpoint) || !subscription.keys || isMissing(subscription.keys.p256dh) || isMissing(subscription.keys.auth)) {
    return res.status(400).json({ status: "gagal", message: "subscription Web Push tidak lengkap", error_code: "VALIDATION_ERROR" });
  }

  if (typeof subscription.endpoint !== "string" || subscription.endpoint.length > 2048 || !isHttpsUrl(subscription.endpoint)) {
    return res.status(400).json({ status: "gagal", message: "endpoint subscription wajib berupa HTTPS URL valid", error_code: "VALIDATION_ERROR" });
  }

  if (subscription.keys.p256dh!.length > 512 || subscription.keys.auth!.length > 256) {
    return res.status(400).json({ status: "gagal", message: "key subscription terlalu panjang", error_code: "VALIDATION_ERROR" });
  }

  if (typeof patientId === "string") req.body.patientId = patientId;
  req.body.endpoint = subscription.endpoint;
  req.body.keys = subscription.keys;
  next();
};

export const validateUserSubscribe = (req: Request, res: Response, next: NextFunction) => {
  const subscription = req.body.subscription as { endpoint?: string; keys?: { p256dh?: string; auth?: string } } | undefined;

  if (!subscription || isMissing(subscription.endpoint) || !subscription.keys || isMissing(subscription.keys.p256dh) || isMissing(subscription.keys.auth)) {
    return res.status(400).json({ status: "gagal", message: "subscription Web Push tidak lengkap", error_code: "VALIDATION_ERROR" });
  }

  if (typeof subscription.endpoint !== "string" || subscription.endpoint.length > 2048 || !isHttpsUrl(subscription.endpoint)) {
    return res.status(400).json({ status: "gagal", message: "endpoint subscription wajib berupa HTTPS URL valid", error_code: "VALIDATION_ERROR" });
  }

  if (subscription.keys.p256dh!.length > 512 || subscription.keys.auth!.length > 256) {
    return res.status(400).json({ status: "gagal", message: "key subscription terlalu panjang", error_code: "VALIDATION_ERROR" });
  }

  req.body.endpoint = subscription.endpoint;
  req.body.keys = subscription.keys;
  next();
};

export const validatePreference = (req: Request, res: Response, next: NextFunction) => {
  const patientId = resolvePatientId(req.body);
  const enabled = req.body.enabled;

  if (patientId !== undefined && (typeof patientId !== "string" || !isValidUuid(patientId))) {
    return res.status(400).json({ status: "gagal", message: "patientId wajib berupa UUID valid", error_code: "VALIDATION_ERROR" });
  }

  if (typeof enabled !== "boolean") {
    return res.status(400).json({ status: "gagal", message: "enabled wajib boolean", error_code: "VALIDATION_ERROR" });
  }

  if (typeof patientId === "string") req.body.patientId = patientId;
  next();
};

export const validateUserNotificationPreference = (req: Request, res: Response, next: NextFunction) => {
  const key = req.body.key || req.body.preferenceKey || req.body.preference_key;
  const enabled = req.body.enabled;

  if (typeof key !== "string" || !allowedUserPreferenceKeys.has(key)) {
    return res.status(400).json({ status: "gagal", message: "key preferensi notifikasi tidak valid", error_code: "VALIDATION_ERROR" });
  }

  if (typeof enabled !== "boolean") {
    return res.status(400).json({ status: "gagal", message: "enabled wajib boolean", error_code: "VALIDATION_ERROR" });
  }

  req.body.key = key;
  next();
};

export const validateSendNotification = (req: Request, res: Response, next: NextFunction) => {
  const patientId = resolvePatientId(req.body);
  const { title, body, type, urgency, data } = req.body;

  if (typeof patientId !== "string" || !isValidUuid(patientId)) {
    return res.status(400).json({ status: "gagal", message: "patientId wajib berupa UUID valid", error_code: "VALIDATION_ERROR" });
  }

  if (isMissing(type) || isMissing(title) || isMissing(body)) {
    return res.status(400).json({ status: "gagal", message: "type, title, dan body wajib diisi", error_code: "VALIDATION_ERROR" });
  }

  if (typeof type !== "string" || !/^[a-z0-9_:-]{3,64}$/i.test(type)) {
    return res.status(400).json({ status: "gagal", message: "type notifikasi tidak valid", error_code: "VALIDATION_ERROR" });
  }

  if (typeof title !== "string" || title.length > 120) {
    return res.status(400).json({ status: "gagal", message: "title maksimal 120 karakter", error_code: "VALIDATION_ERROR" });
  }

  if (typeof body !== "string" || body.length > 500) {
    return res.status(400).json({ status: "gagal", message: "body maksimal 500 karakter", error_code: "VALIDATION_ERROR" });
  }

  if (urgency !== undefined && !["normal", "high", "urgent", "critical"].includes(urgency)) {
    return res.status(400).json({ status: "gagal", message: "urgency tidak valid", error_code: "VALIDATION_ERROR" });
  }

  if (getJsonSize(data) > 3000) {
    return res.status(400).json({ status: "gagal", message: "payload data notifikasi terlalu besar", error_code: "VALIDATION_ERROR" });
  }

  req.body.patientId = patientId;
  req.body.title = title.trim();
  req.body.body = body.trim();
  req.body.type = type.trim();
  next();
};

export const validateTrackNotificationEvent = (req: Request, res: Response, next: NextFunction) => {
  const notificationId = req.body.notificationId || req.body.notification_id;
  const eventType = req.body.eventType || req.body.event_type;

  if (typeof notificationId !== "string" || !isValidUuid(notificationId)) {
    return res.status(400).json({ status: "gagal", message: "notificationId wajib berupa UUID valid", error_code: "VALIDATION_ERROR" });
  }

  if (typeof eventType !== "string" || !["opened", "clicked"].includes(eventType)) {
    return res.status(400).json({ status: "gagal", message: "eventType wajib opened atau clicked", error_code: "VALIDATION_ERROR" });
  }

  req.body.notificationId = notificationId;
  req.body.eventType = eventType;
  next();
};
