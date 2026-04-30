import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import * as medicationLogService from "../services/medication-log.service";

const sendError = (res: Response, error: unknown) => {
  const err = error as { status?: number; message?: string; code?: string };
  const status = err.status || 500;

  return res.status(status).json({
    status: "error",
    message: status >= 500 ? "Terjadi kesalahan pada server" : (err.message || "Terjadi kesalahan"),
    ...(err.code && { error_code: err.code }),
  });
};

export const createMedicationLog = async (req: AuthRequest, res: Response) => {
  try {
    const log = await medicationLogService.createMedicationLog(req.body);
    const message = req.body.status === "confirmed"
      ? "Obat dikonfirmasi. Terima kasih! [DONE]"
      : "Riwayat obat berhasil dicatat";

    res.status(201).json({ status: "success", data: log, message });
  } catch (error) {
    sendError(res, error);
  }
};

export const listMedicationLogs = async (req: AuthRequest, res: Response) => {
  try {
    const result = await medicationLogService.listMedicationLogs(req.query);
    res.status(200).json({ status: "success", data: result.data, meta: result.meta });
  } catch (error) {
    sendError(res, error);
  }
};
