import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import * as adminDashboardService from "../services/admin-dashboard.service";

const sendError = (res: Response, error: unknown) => {
  const err = error as { status?: number; message?: string; code?: string };
  const status = err.status || 500;

  return res.status(status).json({
    status: "gagal",
    message: status >= 500 ? "Terjadi kesalahan pada server" : (err.message || "Terjadi kesalahan"),
    ...(err.code && { error_code: err.code }),
  });
};

export const getAdminDashboard = async (req: AuthRequest, res: Response) => {
  try {
    const data = await adminDashboardService.getAdminDashboardData(req.user);
    res.status(200).json({ status: "berhasil", data });
  } catch (error) {
    sendError(res, error);
  }
};

export const getNurseDashboardSummary = async (req: AuthRequest, res: Response) => {
  try {
    const data = await adminDashboardService.getNurseDashboardSummary(req.user);
    res.status(200).json({ status: "berhasil", data });
  } catch (error) {
    sendError(res, error);
  }
};
