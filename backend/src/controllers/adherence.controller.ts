import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import * as adherenceService from "../services/adherence.service";

const sendError = (res: Response, error: unknown) => {
  const err = error as { status?: number; message?: string; code?: string };
  const status = err.status || 500;

  return res.status(status).json({
    status: "error",
    message: status >= 500 ? "Terjadi kesalahan pada server" : (err.message || "Terjadi kesalahan"),
    ...(err.code && { error_code: err.code }),
  });
};

export const getAdherence = async (req: AuthRequest, res: Response) => {
  try {
    const data = await adherenceService.getAdherenceStats(req.query);
    res.status(200).json({ status: "success", data });
  } catch (error) {
    sendError(res, error);
  }
};
