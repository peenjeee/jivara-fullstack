import { Request, Response, NextFunction } from "express";

const isMissing = (value: unknown) =>
  value === undefined || value === null || (typeof value === "string" && !value.trim());

const isValidUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const isValidDateTime = (value: string) => !Number.isNaN(Date.parse(value));

export const validateMedicationLogCreate = (req: Request, res: Response, next: NextFunction) => {
  const { scheduleId, schedule_id: scheduleIdSnake, status, scheduledTime, scheduled_time: scheduledTimeSnake, confirmedAt, confirmed_at: confirmedAtSnake, snoozeCount, snooze_count: snoozeCountSnake, reminderJobId, reminder_job_id: reminderJobIdSnake } = req.body;
  const resolvedScheduleId = scheduleId || scheduleIdSnake;
  const resolvedScheduledTime = scheduledTime || scheduledTimeSnake;
  const resolvedConfirmedAt = confirmedAt || confirmedAtSnake;
  const resolvedSnoozeCount = snoozeCount ?? snoozeCountSnake;
  const resolvedReminderJobId = reminderJobId || reminderJobIdSnake;

  if (isMissing(resolvedScheduleId) || !isValidUuid(resolvedScheduleId)) {
    return res.status(400).json({ status: "gagal", message: "scheduleId wajib berupa UUID valid", error_code: "VALIDATION_ERROR" });
  }

  if (!status || !["confirmed", "missed", "snoozed"].includes(status)) {
    return res.status(400).json({ status: "gagal", message: "Status harus dikonfirmasi, terlewat, atau ditunda", error_code: "VALIDATION_ERROR" });
  }

  if (resolvedScheduledTime && !isValidDateTime(resolvedScheduledTime)) {
    return res.status(400).json({ status: "gagal", message: "scheduledTime harus format tanggal valid", error_code: "VALIDATION_ERROR" });
  }

  if (resolvedConfirmedAt && !isValidDateTime(resolvedConfirmedAt)) {
    return res.status(400).json({ status: "gagal", message: "confirmedAt harus format tanggal valid", error_code: "VALIDATION_ERROR" });
  }

  if (resolvedSnoozeCount !== undefined && (!Number.isInteger(resolvedSnoozeCount) || resolvedSnoozeCount < 0)) {
    return res.status(400).json({ status: "gagal", message: "snoozeCount harus angka positif", error_code: "VALIDATION_ERROR" });
  }

  if (resolvedReminderJobId && !isValidUuid(resolvedReminderJobId)) {
    return res.status(400).json({ status: "gagal", message: "reminderJobId wajib berupa UUID valid", error_code: "VALIDATION_ERROR" });
  }

  req.body.scheduleId = resolvedScheduleId;
  req.body.scheduledTime = resolvedScheduledTime;
  req.body.confirmedAt = resolvedConfirmedAt;
  req.body.snoozeCount = resolvedSnoozeCount;
  req.body.reminderJobId = resolvedReminderJobId;
  next();
};

export const validateMedicationSnooze = (req: Request, res: Response, next: NextFunction) => {
  const reminderJobId = req.body.reminderJobId || req.body.reminder_job_id;
  const minutes = Number(req.body.minutes);

  if (isMissing(reminderJobId) || !isValidUuid(reminderJobId)) {
    return res.status(400).json({ status: "gagal", message: "reminderJobId wajib berupa UUID valid", error_code: "VALIDATION_ERROR" });
  }

  if (![10, 20, 30].includes(minutes)) {
    return res.status(400).json({ status: "gagal", message: "Snooze hanya boleh 10, 20, atau 30 menit", error_code: "VALIDATION_ERROR" });
  }

  req.body.reminderJobId = reminderJobId;
  req.body.minutes = minutes;
  next();
};
