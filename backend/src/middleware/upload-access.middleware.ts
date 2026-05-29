import { NextFunction, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { foodScans } from "../db/schema";
import { AuthRequest } from "./auth.middleware";
import { assertCanAccessPatient } from "../services/access-control.service";

const notFound = {
  status: "gagal",
  message: "File tidak ditemukan",
  error_code: "FILE_NOT_FOUND",
};

export const authorizeFoodScanUpload = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const imageUrl = `/uploads${req.path}`;
    const scanRows = await db
      .select({ patientId: foodScans.patientId })
      .from(foodScans)
      .where(eq(foodScans.imageUrl, imageUrl))
      .limit(1);

    const scan = scanRows[0];
    if (!scan) return res.status(404).json(notFound);

    await assertCanAccessPatient(req.user, scan.patientId);
    next();
  } catch (error) {
    const err = error as { status?: number; message?: string; code?: string };
    return res.status(err.status || 500).json({
      status: "gagal",
      message: err.status && err.status < 500 ? err.message : "Terjadi kesalahan pada server",
      ...(err.code && { error_code: err.code }),
    });
  }
};
