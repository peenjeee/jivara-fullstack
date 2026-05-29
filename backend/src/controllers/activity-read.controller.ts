import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import * as activityReadService from "../services/activity-read.service";

const sendError = (res: Response, error: unknown) => {
  const err = error as { status?: number; message?: string; code?: string };
  const status = err.status || 500;
  return res.status(status).json({
    status: "gagal",
    message: status >= 500 ? "Terjadi kesalahan pada server" : (err.message || "Terjadi kesalahan"),
    ...(err.code && { error_code: err.code }),
  });
};

export const listActivityReads = async (req: AuthRequest, res: Response) => {
  try {
    const result = await activityReadService.listActivityReads(req.user!.id, req.query);
    res.status(200).json({ status: "berhasil", data: result.data, meta: result.meta });
  } catch (error) {
    sendError(res, error);
  }
};

export const getUnreadActivityCount = async (req: AuthRequest, res: Response) => {
  try {
    const data = await activityReadService.getUnreadActivityCount(req.user!);
    res.status(200).json({ status: "berhasil", data });
  } catch (error) {
    sendError(res, error);
  }
};

export const markAllUnread = async (req: AuthRequest, res: Response) => {
  try {
    const result = await activityReadService.markAllUnread(req.user!);
    res.status(200).json({
      status: "berhasil",
      data: result,
      message: result.count > 0 ? `${result.count} aktivitas ditandai sudah dibaca` : "Tidak ada aktivitas yang perlu ditandai",
    });
  } catch (error) {
    sendError(res, error);
  }
};

export const markActivitiesRead = async (req: AuthRequest, res: Response) => {
  try {
    const reads = await activityReadService.markActivitiesRead(req.user!.id, req.body.activityIds);
    res.status(200).json({ status: "berhasil", data: reads, message: "Aktivitas ditandai sudah dibaca" });
  } catch (error) {
    sendError(res, error);
  }
};
