import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { registerActivityEventClient } from "../services/activity-event.service";

export const streamActivityEvents = (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      status: "gagal",
      message: "Autentikasi diperlukan",
      error_code: "MISSING_TOKEN",
    });
  }

  registerActivityEventClient(req.user, res);
};
