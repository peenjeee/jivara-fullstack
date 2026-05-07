import { Request, Response, NextFunction } from "express";

const isMissing = (value: unknown) =>
  value === undefined || value === null || (typeof value === "string" && !value.trim());

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const isValidUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(value);

export const validateNurseId = (req: Request, res: Response, next: NextFunction) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!isValidUuid(id)) {
    return res.status(400).json({ status: "gagal", message: "ID perawat tidak valid", error_code: "VALIDATION_ERROR" });
  }

  next();
};

export const validateNurseCreate = (req: Request, res: Response, next: NextFunction) => {
  const { fullName, email, password, gender, age } = req.body;

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

  if (age !== undefined && (!Number.isInteger(age) || age < 0)) {
    return res.status(400).json({ status: "gagal", message: "Umur harus angka positif", error_code: "VALIDATION_ERROR" });
  }

  next();
};

export const validateNurseUpdate = (req: Request, res: Response, next: NextFunction) => {
  const { email, gender, age, isActive } = req.body;

  if (email && !isValidEmail(email)) {
    return res.status(400).json({ status: "gagal", message: "Email wajib valid", error_code: "VALIDATION_ERROR" });
  }

  if (gender && !["male", "female"].includes(gender)) {
    return res.status(400).json({ status: "gagal", message: "Gender harus laki-laki atau perempuan", error_code: "VALIDATION_ERROR" });
  }

  if (age !== undefined && (!Number.isInteger(age) || age < 0)) {
    return res.status(400).json({ status: "gagal", message: "Umur harus angka positif", error_code: "VALIDATION_ERROR" });
  }

  if (isActive !== undefined && typeof isActive !== "boolean") {
    return res.status(400).json({ status: "gagal", message: "isActive harus boolean", error_code: "VALIDATION_ERROR" });
  }

  next();
};
