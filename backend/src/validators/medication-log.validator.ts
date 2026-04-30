import { Request, Response, NextFunction } from "express";

const isMissing = (value: unknown) =>
  value === undefined || value === null || (typeof value === "string" && !value.trim());

const isValidUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const isValidDateTime = (value: string) => !Number.isNaN(Date.parse(value));

export const validateMedicationLogCreate = (req: Request, res: Response, next: NextFunction) => {
  const { scheduleId, status, scheduledTime, confirmedAt, snoozeCount } = req.body;

  if (isMissing(scheduleId) || !isValidUuid(scheduleId)) {
    return res.status(400).json({ status: "error", message: "scheduleId wajib berupa UUID valid", error_code: "VALIDATION_ERROR" });
  }

  if (!status || !["confirmed", "missed", "snoozed"].includes(status)) {
    return res.status(400).json({ status: "error", message: "Status harus confirmed, missed, atau snoozed", error_code: "VALIDATION_ERROR" });
  }

  if (scheduledTime && !isValidDateTime(scheduledTime)) {
    return res.status(400).json({ status: "error", message: "scheduledTime harus format tanggal valid", error_code: "VALIDATION_ERROR" });
  }

  if (confirmedAt && !isValidDateTime(confirmedAt)) {
    return res.status(400).json({ status: "error", message: "confirmedAt harus format tanggal valid", error_code: "VALIDATION_ERROR" });
  }

  if (snoozeCount !== undefined && (!Number.isInteger(snoozeCount) || snoozeCount < 0)) {
    return res.status(400).json({ status: "error", message: "snoozeCount harus angka positif", error_code: "VALIDATION_ERROR" });
  }

  next();
};
