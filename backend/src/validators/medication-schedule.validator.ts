import { Request, Response, NextFunction } from "express";

const isMissing = (value: unknown) =>
  value === undefined || value === null || (typeof value === "string" && !value.trim());

const isValidUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

const isValidTime = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
const isValidDate = (value: unknown) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00.000Z`).getTime());

const validateScheduledTimes = (scheduledTimes: unknown) => {
  return Array.isArray(scheduledTimes)
    && scheduledTimes.length > 0
    && scheduledTimes.every((time) => typeof time === "string" && isValidTime(time));
};

export const validateMedicationScheduleCreate = (req: Request, res: Response, next: NextFunction) => {
  const { patientId, drugName, dosage, stock, frequency, scheduledTimes, startDate, endDate } = req.body;

  if (isMissing(patientId) || !isValidUuid(patientId)) {
    return res.status(400).json({ status: "gagal", message: "patientId wajib berupa UUID valid", error_code: "VALIDATION_ERROR" });
  }

  if (isMissing(drugName)) {
    return res.status(400).json({ status: "gagal", message: "Nama obat wajib diisi", error_code: "VALIDATION_ERROR" });
  }

  if (isMissing(dosage)) {
    return res.status(400).json({ status: "gagal", message: "Dosis wajib diisi", error_code: "VALIDATION_ERROR" });
  }

  if (!Number.isInteger(frequency) || frequency < 1 || frequency > 3) {
    return res.status(400).json({ status: "gagal", message: "Frekuensi harus angka 1 sampai 3", error_code: "VALIDATION_ERROR" });
  }

  if (stock !== undefined && (!Number.isInteger(stock) || stock < 0)) {
    return res.status(400).json({ status: "gagal", message: "Stok obat harus angka 0 atau lebih", error_code: "VALIDATION_ERROR" });
  }

  if (!validateScheduledTimes(scheduledTimes)) {
    return res.status(400).json({ status: "gagal", message: "scheduledTimes wajib array jam format HH:mm", error_code: "VALIDATION_ERROR" });
  }

  if (startDate !== undefined && !isValidDate(startDate)) {
    return res.status(400).json({ status: "gagal", message: "startDate wajib format YYYY-MM-DD", error_code: "VALIDATION_ERROR" });
  }

  if (endDate !== undefined && endDate !== null && endDate !== "" && !isValidDate(endDate)) {
    return res.status(400).json({ status: "gagal", message: "endDate wajib format YYYY-MM-DD", error_code: "VALIDATION_ERROR" });
  }

  next();
};

export const validateMedicationScheduleBulkCreate = (req: Request, res: Response, next: NextFunction) => {
  const { schedules } = req.body;

  if (!Array.isArray(schedules) || schedules.length === 0) {
    return res.status(400).json({ status: "gagal", message: "schedules wajib berupa array", error_code: "VALIDATION_ERROR" });
  }

  if (schedules.length > 20) {
    return res.status(400).json({ status: "gagal", message: "Maksimal 20 jadwal obat per request", error_code: "VALIDATION_ERROR" });
  }

  for (const schedule of schedules) {
    const reqLike = { body: schedule } as Request;
    let rejected = false;
    validateMedicationScheduleCreate(reqLike, res, (() => { rejected = false; }) as NextFunction);
    if ((res.headersSent || rejected)) return;
  }

  next();
};

export const validateMedicationScheduleId = (req: Request, res: Response, next: NextFunction) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  if (!id || !isValidUuid(id)) {
    return res.status(400).json({ status: "gagal", message: "ID jadwal obat wajib berupa UUID valid", error_code: "VALIDATION_ERROR" });
  }

  next();
};

export const validateMedicationScheduleUpdate = (req: Request, res: Response, next: NextFunction) => {
  const { stock, frequency, scheduledTimes, startDate, endDate } = req.body;

  if (frequency !== undefined && (!Number.isInteger(frequency) || frequency < 1 || frequency > 3)) {
    return res.status(400).json({ status: "gagal", message: "Frekuensi harus angka 1 sampai 3", error_code: "VALIDATION_ERROR" });
  }

  if (stock !== undefined && (!Number.isInteger(stock) || stock < 0)) {
    return res.status(400).json({ status: "gagal", message: "Stok obat harus angka 0 atau lebih", error_code: "VALIDATION_ERROR" });
  }

  if (scheduledTimes !== undefined && !validateScheduledTimes(scheduledTimes)) {
    return res.status(400).json({ status: "gagal", message: "scheduledTimes wajib array jam format HH:mm", error_code: "VALIDATION_ERROR" });
  }

  if (startDate !== undefined && !isValidDate(startDate)) {
    return res.status(400).json({ status: "gagal", message: "startDate wajib format YYYY-MM-DD", error_code: "VALIDATION_ERROR" });
  }

  if (endDate !== undefined && endDate !== null && endDate !== "" && !isValidDate(endDate)) {
    return res.status(400).json({ status: "gagal", message: "endDate wajib format YYYY-MM-DD", error_code: "VALIDATION_ERROR" });
  }

  next();
};
