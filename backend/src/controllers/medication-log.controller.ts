import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import * as medicationLogService from "../services/medication-log.service";

const sendError = (res: Response, error: unknown) => {
  const err = error as { status?: number; message?: string; code?: string };
  const status = err.status || 500;

  return res.status(status).json({
    status: "gagal",
    message: status >= 500 ? "Terjadi kesalahan pada server" : (err.message || "Terjadi kesalahan"),
    ...(err.code && { error_code: err.code }),
  });
};

export const createMedicationLog = async (req: AuthRequest, res: Response) => {
  try {
    const log = await medicationLogService.createMedicationLog(req.body, req.user);
    const message = req.body.status === "confirmed"
      ? "Obat dikonfirmasi. Terima kasih! [DONE]"
      : "Riwayat obat berhasil dicatat";

    res.status(201).json({ status: "berhasil", data: log, message });
  } catch (error) {
    sendError(res, error);
  }
};

export const listMedicationLogs = async (req: AuthRequest, res: Response) => {
  try {
    const result = await medicationLogService.listMedicationLogs(req.query, req.user);
    res.status(200).json({ status: "berhasil", data: result.data, meta: result.meta });
  } catch (error) {
    sendError(res, error);
  }
};
