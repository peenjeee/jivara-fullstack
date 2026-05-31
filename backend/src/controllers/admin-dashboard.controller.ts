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

const setTimingHeaders = (res: Response, startedAt: number) => {
  const elapsedMs = Date.now() - startedAt;
  res.setHeader("Server-Timing", `jivara-backend;dur=${elapsedMs}`);
  res.setHeader("X-Jivara-Backend-Ms", String(elapsedMs));
};

export const getAdminDashboard = async (req: AuthRequest, res: Response) => {
  const startedAt = Date.now();
  try {
    const data = await adminDashboardService.getAdminDashboardData(req.user);
    setTimingHeaders(res, startedAt);
    res.status(200).json({ status: "berhasil", data });
  } catch (error) {
    setTimingHeaders(res, startedAt);
    sendError(res, error);
  }
};

export const getNurseDashboardSummary = async (req: AuthRequest, res: Response) => {
  const startedAt = Date.now();
  try {
    const data = await adminDashboardService.getNurseDashboardSummary(req.user);
    setTimingHeaders(res, startedAt);
    res.status(200).json({ status: "berhasil", data });
  } catch (error) {
    setTimingHeaders(res, startedAt);
    sendError(res, error);
  }
};
