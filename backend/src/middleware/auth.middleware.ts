import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET as string;

if (!JWT_SECRET) {
  throw new Error("FATAL ERROR: JWT_SECRET is not defined in environment variables.");
}

// Perluas Express Request untuk menyertakan info pengguna
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

/**
 * Middleware: Verifikasi JWT access token dari header Authorization
 */
export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader
    ?.replace(/^Bearer\s+/i, "")
    .trim()
    .replace(/^['"]|['"]$/g, "");

  if (!token) {
    return res.status(401).json({
      status: "gagal",
      message: "Token akses diperlukan",
      error_code: "MISSING_TOKEN",
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      email: string;
      role: string;
    };
    req.user = decoded;
    next();
  } catch (error: unknown) {
    const err = error as { name?: string };
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        status: "gagal",
        message: "Token akses telah kedaluwarsa",
        error_code: "TOKEN_EXPIRED",
      });
    }
    return res.status(401).json({
      status: "gagal",
      message: "Token akses tidak valid",
      error_code: "INVALID_TOKEN",
    });
  }
};

/**
 * Middleware: Kontrol Akses (RBAC)
 * Penggunaan: authorizeRoles("nurse")
 */
export const authorizeRoles = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        status: "gagal",
        message: "Autentikasi diperlukan",
        error_code: "MISSING_TOKEN",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: "gagal",
        message: "Anda tidak memiliki izin untuk mengakses sumber daya ini",
        error_code: "FORBIDDEN",
      });
    }

    next();
  };
};
