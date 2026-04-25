import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "jivara-secret-key";

// Extend Express Request to include user info
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

/**
 * Middleware: Verify JWT access token from Authorization header
 */
export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({
      status: "error",
      message: "Access token required",
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
  } catch (error: any) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        status: "error",
        message: "Access token expired",
        error_code: "TOKEN_EXPIRED",
      });
    }
    return res.status(401).json({
      status: "error",
      message: "Invalid access token",
      error_code: "INVALID_TOKEN",
    });
  }
};

/**
 * Middleware: Role-Based Access Control (RBAC)
 * Usage: authorizeRoles("nurse", "admin")
 */
export const authorizeRoles = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        status: "error",
        message: "Authentication required",
        error_code: "MISSING_TOKEN",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: "error",
        message: "You do not have permission to access this resource",
        error_code: "FORBIDDEN",
      });
    }

    next();
  };
};
