import { Request, Response, NextFunction } from "express";

const isMissing = (value: unknown) =>
  value === undefined || value === null || (typeof value === "string" && !value.trim());

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const isValidUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export const validatePatientCreate = (req: Request, res: Response, next: NextFunction) => {
  const { fullName, email, password, gender, assignedNurseId } = req.body;

  if (isMissing(fullName)) {
    return res.status(400).json({ status: "gagal", message: "Nama lengkap wajib diisi", error_code: "VALIDATION_ERROR" });
  }

  if (isMissing(email) || !isValidEmail(email)) {
    return res.status(400).json({ status: "gagal", message: "Email wajib valid", error_code: "VALIDATION_ERROR" });
  }

  if (isMissing(password) || String(password).length < 8) {
    return res.status(400).json({ status: "gagal", message: "Kata sandi minimal harus 8 karakter", error_code: "VALIDATION_ERROR" });
  }

  if (gender && !["male", "female"].includes(gender)) {
    return res.status(400).json({ status: "gagal", message: "Gender harus laki-laki atau perempuan", error_code: "VALIDATION_ERROR" });
  }

  if (assignedNurseId && !isValidUuid(assignedNurseId)) {
    return res.status(400).json({ status: "gagal", message: "assignedNurseId tidak valid", error_code: "VALIDATION_ERROR" });
  }

  next();
};

export const validatePatientUpdate = (req: Request, res: Response, next: NextFunction) => {
  const { email, gender } = req.body;

  if (email && !isValidEmail(email)) {
    return res.status(400).json({ status: "gagal", message: "Email wajib valid", error_code: "VALIDATION_ERROR" });
  }

  if (gender && !["male", "female"].includes(gender)) {
    return res.status(400).json({ status: "gagal", message: "Gender harus laki-laki atau perempuan", error_code: "VALIDATION_ERROR" });
  }

  next();
};

export const validateAssignPatient = (req: Request, res: Response, next: NextFunction) => {
  const { nurseId, nurseIds } = req.body;

  if (Array.isArray(nurseIds)) {
    if (nurseIds.length === 0 || nurseIds.some((id) => typeof id !== "string" || !isValidUuid(id))) {
      return res.status(400).json({ status: "gagal", message: "nurseIds wajib berisi UUID valid", error_code: "VALIDATION_ERROR" });
    }
    return next();
  }

  if (isMissing(nurseId) || !isValidUuid(nurseId)) {
    return res.status(400).json({ status: "gagal", message: "nurseId wajib berupa UUID valid", error_code: "VALIDATION_ERROR" });
  }

  next();
};
