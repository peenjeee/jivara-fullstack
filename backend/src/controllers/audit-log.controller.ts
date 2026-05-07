import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import * as auditLogService from "../services/audit-log.service";

const sendError = (res: Response, error: unknown) => {
  const err = error as { status?: number; message?: string; code?: string };
  const status = err.status || 500;

  return res.status(status).json({
    status: "gagal",
    message: status >= 500 ? "Terjadi kesalahan pada server" : (err.message || "Terjadi kesalahan"),
    ...(err.code && { error_code: err.code }),
  });
};

export const listAuditLogs = async (req: AuthRequest, res: Response) => {
  try {
    const result = await auditLogService.listAuditLogs(req.query);
    res.status(200).json({ status: "berhasil", data: result.data, meta: result.meta });
  } catch (error) {
    sendError(res, error);
  }
};
