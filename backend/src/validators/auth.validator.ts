import { Request, Response, NextFunction } from "express";

interface ValidationRule {
  field: string;
  label: string;
  required?: boolean;
  minLength?: number;
  pattern?: RegExp;
  patternMessage?: string;
}

const validate = (rules: ValidationRule[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    for (const rule of rules) {
      const value = req.body[rule.field];

      // Cek wajib diisi
      if (rule.required && (!value || (typeof value === "string" && !value.trim()))) {
        return res.status(400).json({
          status: "error",
          message: `${rule.label} wajib diisi`,
          error_code: "VALIDATION_ERROR",
        });
      }

      // Lewati field opsional yang kosong
      if (!value) continue;

      // Cek panjang minimum
      if (rule.minLength && typeof value === "string" && value.length < rule.minLength) {
        return res.status(400).json({
          status: "error",
          message: `${rule.label} minimal harus ${rule.minLength} karakter`,
          error_code: "VALIDATION_ERROR",
        });
      }

      // Cek pola
      if (rule.pattern && typeof value === "string" && !rule.pattern.test(value)) {
        return res.status(400).json({
          status: "error",
          message: rule.patternMessage || `Format ${rule.label} tidak valid`,
          error_code: "VALIDATION_ERROR",
        });
      }
    }
    next();
  };
};

// ─── Validator yang Sudah Dibuat ────────────────────

export const validateRegister = validate([
  { field: "fullName", label: "Nama lengkap", required: true },
  {
    field: "email",
    label: "Email",
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    patternMessage: "Format email tidak valid",
  },
  { field: "password", label: "Kata sandi", required: true, minLength: 8 },
]);

export const validateLogin = validate([
  { field: "password", label: "Kata sandi", required: true },
]);

export const validateRefreshToken = validate([
  { field: "refresh_token", label: "Token refresh", required: true },
]);
