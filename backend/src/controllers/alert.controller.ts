import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import * as alertService from "../services/alert.service";

const sendError = (res: Response, error: unknown) => {
  const err = error as { status?: number; message?: string; code?: string };
  const status = err.status || 500;

  return res.status(status).json({
    status: "gagal",
    message: status >= 500 ? "Terjadi kesalahan pada server" : (err.message || "Terjadi kesalahan"),
    ...(err.code && { error_code: err.code }),
  });
};

const getParam = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value || "";

export const listAlerts = async (req: AuthRequest, res: Response) => {
  try {
    const result = await alertService.listAlerts(req.query, req.user);
    res.status(200).json({ status: "berhasil", data: result.data, meta: result.meta });
  } catch (error) {
    sendError(res, error);
  }
};

export const resolveAlert = async (req: AuthRequest, res: Response) => {
  try {
    const data = await alertService.resolveAlert(getParam(req.params.id), req.user);
    res.status(200).json({ status: "berhasil", data, message: "Alert berhasil diselesaikan" });
  } catch (error) {
    sendError(res, error);
  }
};
