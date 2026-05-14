import { Request, Response } from "express";
import * as publicStatsService from "../services/public-stats.service";

export const getPublicStats = async (_req: Request, res: Response) => {
  try {
    const data = await publicStatsService.getPublicStats();
    res.status(200).json({ status: "berhasil", data });
  } catch {
    res.status(500).json({ status: "gagal", message: "Terjadi kesalahan pada server" });
  }
};
