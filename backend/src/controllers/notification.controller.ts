import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import * as notificationService from "../services/notification.service";

const sendError = (res: Response, error: unknown) => {
  const err = error as { status?: number; message?: string; code?: string };
  const status = err.status || 500;

  return res.status(status).json({
    status: "gagal",
    message: status >= 500 ? "Terjadi kesalahan pada server" : (err.message || "Terjadi kesalahan"),
    ...(err.code && { error_code: err.code }),
  });
};

export const subscribe = async (req: AuthRequest, res: Response) => {
  try {
    const data = await notificationService.subscribeDevice({
      patientId: req.body.patientId,
      endpoint: req.body.endpoint,
      keys: req.body.keys,
      userAgent: req.get("user-agent"),
    }, req.user);

    res.status(201).json({ status: "berhasil", data, message: "Push notification aktif untuk device ini" });
  } catch (error) {
    sendError(res, error);
  }
};

export const updatePreference = async (req: AuthRequest, res: Response) => {
  try {
    const data = await notificationService.setNotificationPreference(req.body, req.user);
    res.status(200).json({ status: "berhasil", data, message: "Preferensi notifikasi diperbarui" });
  } catch (error) {
    sendError(res, error);
  }
};

export const listNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const result = await notificationService.listNotifications(req.query, req.user);
    res.status(200).json({ status: "berhasil", data: result.data, meta: result.meta });
  } catch (error) {
    sendError(res, error);
  }
};

export const getPublicKey = async (_req: AuthRequest, res: Response) => {
  try {
    const data = notificationService.getVapidPublicKey();
    res.status(200).json({ status: "berhasil", data });
  } catch (error) {
    sendError(res, error);
  }
};

export const sendNotification = async (req: AuthRequest, res: Response) => {
  try {
    const data = await notificationService.sendPushNotification(req.body, req.user);
    res.status(200).json({ status: "berhasil", data, message: "Push notification diproses" });
  } catch (error) {
    sendError(res, error);
  }
};
