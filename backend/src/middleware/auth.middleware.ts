import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { users } from "../db/schema";
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET as string;

if (!JWT_SECRET) {
  throw new Error("FATAL ERROR: JWT_SECRET is not defined in environment variables.");
}

const getCookieValue = (cookieHeader: string | undefined, name: string) => {
  if (!cookieHeader) return undefined;
  const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());
  const target = cookies.find((cookie) => cookie.startsWith(`${name}=`));
  return target ? decodeURIComponent(target.slice(name.length + 1)) : undefined;
};

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
export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers["authorization"];
  const bearerToken = authHeader
    ?.replace(/^Bearer\s+/i, "")
    .trim()
    .replace(/^['"]|['"]$/g, "");
  const token = bearerToken || getCookieValue(req.headers.cookie, "jivara-token");

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

    const userRows = await db
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
        isActive: users.isActive,
        accountStatus: users.accountStatus,
      })
      .from(users)
      .where(eq(users.id, decoded.id))
      .limit(1);

    const currentUser = userRows[0];
    if (!currentUser || !currentUser.isActive || currentUser.accountStatus !== "active") {
      return res.status(401).json({
        status: "gagal",
        message: "Akun tidak aktif atau tidak diizinkan",
        error_code: "ACCOUNT_INACTIVE",
      });
    }

    req.user = {
      id: currentUser.id,
      email: currentUser.email,
      role: currentUser.role,
    };
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

    const userRole = req.user.role === "superadmin" ? "super_admin" : req.user.role;

    if (!roles.includes(userRole)) {
      return res.status(403).json({
        status: "gagal",
        message: "Anda tidak memiliki izin untuk mengakses sumber daya ini",
        error_code: "FORBIDDEN",
      });
    }

    next();
  };
};
