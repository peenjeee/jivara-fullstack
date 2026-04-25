import { Response } from "express";
import { db } from "../db";
import { users, refreshTokens } from "../db/schema";
import { eq, or } from "drizzle-orm";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { AuthRequest } from "../middleware/auth.middleware";

const JWT_SECRET = process.env.JWT_SECRET || "jivara-secret-key";
const ACCESS_TOKEN_EXPIRY = "1h";
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

/**
 * Generate access token (JWT)
 */
const generateAccessToken = (user: {
  id: string;
  email: string;
  role: string;
}) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
};

/**
 * Generate refresh token (random string) and store in DB
 */
const generateRefreshToken = async (userId: string): Promise<string> => {
  const token = crypto.randomBytes(64).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

  await db.insert(refreshTokens).values({
    userId,
    token,
    expiresAt,
  });

  return token;
};

/**
 * POST /api/auth/register
 * Register a new user. Creates patient profile if role=patient.
 */
export const register = async (req: AuthRequest, res: Response) => {
  try {
    const {
      fullName,
      email,
      password,
      role,
      phone,
      dateOfBirth,
      gender,
      address,
      emergencyContact,
      diagnosis,
    } = req.body;

    // Validate required fields
    if (!fullName || !email || !password) {
      return res.status(400).json({
        status: "error",
        message: "Nama lengkap, email, dan kata sandi wajib diisi",
      });
    }

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(or(eq(users.email, email), phone ? eq(users.phone, phone) : undefined))
      .limit(1);

    if (existingUser.length > 0) {
      return res.status(409).json({
        status: "error",
        message: "Nomor telepon atau email sudah terdaftar",
        error_code: "USER_EXISTS",
      });
    }

    // Hash password (bcrypt cost factor 12 per PRD security spec)
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user - Public registration is only for Nurses
    const [newUser] = await db
      .insert(users)
      .values({
        fullName,
        email,
        password: hashedPassword,
        role: "nurse", // Force role to nurse for public registration
        phone: phone || null,
        dateOfBirth: dateOfBirth || null,
        gender: gender || null,
        address: address || null,
      })
      .returning({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
      });

    // Registration successful

    res.status(201).json({
      status: "success",
      data: {
        user_id: newUser.id,
        fullName: newUser.fullName,
        role: newUser.role,
        created_at: newUser.createdAt,
      },
      message: "Pendaftaran berhasil",
    });
  } catch (error: any) {
    console.error("Register Error:", error);
    res.status(500).json({
      status: "error",
      message: "Terjadi kesalahan pada server",
      error: error.message,
    });
  }
};

/**
 * POST /api/auth/login
 * Login with email or phone + password. Returns access + refresh tokens.
 */
export const login = async (req: AuthRequest, res: Response) => {
  try {
    const { identifier, email, password } = req.body;

    // Support both 'identifier' (PRD spec) and 'email' (backward compat)
    const loginId = identifier || email;

    if (!loginId || !password) {
      return res.status(400).json({
        status: "error",
        message: "Email/nomor telepon dan kata sandi wajib diisi",
      });
    }

    // Find user by email or phone
    const user = await db
      .select()
      .from(users)
      .where(or(eq(users.email, loginId), eq(users.phone, loginId)))
      .limit(1);

    if (user.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "Email/nomor telepon atau kata sandi salah",
        error_code: "INVALID_CREDENTIALS",
      });
    }

    const foundUser = user[0];

    // Check if user is active
    if (!foundUser.isActive) {
      return res.status(403).json({
        status: "error",
        message: "Akun telah dinonaktifkan",
        error_code: "ACCOUNT_DEACTIVATED",
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, foundUser.password);
    if (!isPasswordValid) {
      return res.status(400).json({
        status: "error",
        message: "Email/nomor telepon atau kata sandi salah",
        error_code: "INVALID_CREDENTIALS",
      });
    }

    // Generate tokens
    const accessToken = generateAccessToken({
      id: foundUser.id,
      email: foundUser.email,
      role: foundUser.role,
    });
    const refreshToken = await generateRefreshToken(foundUser.id);

    res.status(200).json({
      status: "success",
      data: {
        access_token: accessToken,
        refresh_token: refreshToken,
        token_type: "Bearer",
        expires_in: 3600,
        user: {
          id: foundUser.id,
          fullName: foundUser.fullName,
          email: foundUser.email,
          phone: foundUser.phone,
          role: foundUser.role,
        },
      },
    });
  } catch (error: any) {
    console.error("Login Error:", error);
    res.status(500).json({
      status: "error",
      message: "Terjadi kesalahan pada server",
      error: error.message,
    });
  }
};

/**
 * POST /api/auth/refresh
 * Refresh access token using a valid refresh token.
 */
export const refresh = async (req: AuthRequest, res: Response) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({
        status: "error",
        message: "Token refresh wajib disertakan",
      });
    }

    // Find refresh token in DB
    const storedToken = await db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.token, refresh_token))
      .limit(1);

    if (storedToken.length === 0) {
      return res.status(401).json({
        status: "error",
        message: "Token refresh tidak valid",
        error_code: "INVALID_TOKEN",
      });
    }

    // Check if token is expired
    if (new Date() > storedToken[0].expiresAt) {
      // Delete expired token
      await db
        .delete(refreshTokens)
        .where(eq(refreshTokens.id, storedToken[0].id));
      return res.status(401).json({
        status: "error",
        message: "Token refresh telah kedaluwarsa",
        error_code: "TOKEN_EXPIRED",
      });
    }

    // Find user
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, storedToken[0].userId))
      .limit(1);

    if (user.length === 0) {
      return res.status(401).json({
        status: "error",
        message: "Pengguna tidak ditemukan",
        error_code: "INVALID_TOKEN",
      });
    }

    // Generate new access token
    const accessToken = generateAccessToken({
      id: user[0].id,
      email: user[0].email,
      role: user[0].role,
    });

    res.status(200).json({
      status: "success",
      data: {
        access_token: accessToken,
        expires_in: 3600,
      },
    });
  } catch (error: any) {
    console.error("Refresh Error:", error);
    res.status(500).json({
      status: "error",
      message: "Terjadi kesalahan pada server",
      error: error.message,
    });
  }
};

/**
 * POST /api/auth/logout
 * Invalidate refresh token.
 */
export const logout = async (req: AuthRequest, res: Response) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({
        status: "error",
        message: "Token refresh wajib disertakan",
      });
    }

    // Delete the refresh token from DB
    await db
      .delete(refreshTokens)
      .where(eq(refreshTokens.token, refresh_token));

    res.status(200).json({
      status: "success",
      message: "Berhasil keluar dari akun",
    });
  } catch (error: any) {
    console.error("Logout Error:", error);
    res.status(500).json({
      status: "error",
      message: "Terjadi kesalahan pada server",
      error: error.message,
    });
  }
};

/**
 * PUT /api/auth/change-password
 * Change user's password. Requires authentication.
 */
export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({
        status: "error",
        message: "Kata sandi saat ini dan kata sandi baru wajib diisi",
      });
    }

    if (new_password.length < 8) {
      return res.status(400).json({
        status: "error",
        message: "Kata sandi baru minimal harus 8 karakter",
      });
    }

    // Find user
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, req.user!.id))
      .limit(1);

    if (user.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Pengguna tidak ditemukan",
      });
    }

    // Verify current password
    const isValid = await bcrypt.compare(current_password, user[0].password);
    if (!isValid) {
      return res.status(400).json({
        status: "error",
        message: "Kata sandi saat ini salah",
        error_code: "INVALID_CREDENTIALS",
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(new_password, 12);

    // Update password
    await db
      .update(users)
      .set({ password: hashedPassword, updatedAt: new Date() })
      .where(eq(users.id, req.user!.id));

    res.status(200).json({
      status: "success",
      message: "Kata sandi berhasil diubah",
    });
  } catch (error: any) {
    console.error("Change Password Error:", error);
    res.status(500).json({
      status: "error",
      message: "Terjadi kesalahan pada server",
      error: error.message,
    });
  }
};

/**
 * GET /api/auth/me
 * Get current user profile. Requires authentication.
 */
export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    const user = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        phone: users.phone,
        role: users.role,
        dateOfBirth: users.dateOfBirth,
        gender: users.gender,
        address: users.address,
        isActive: users.isActive,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, req.user!.id))
      .limit(1);

    if (user.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Pengguna tidak ditemukan",
      });
    }

    res.status(200).json({
      status: "success",
      data: user[0],
    });
  } catch (error: any) {
    console.error("GetMe Error:", error);
    res.status(500).json({
      status: "error",
      message: "Terjadi kesalahan pada server",
      error: error.message,
    });
  }
};

/**
 * POST /api/auth/create-patient
 * Create a new patient account. Only accessible by Nurses.
 */
export const createPatient = async (req: AuthRequest, res: Response) => {
  try {
    const { fullName, email, password, phone, dateOfBirth, gender, address } =
      req.body;

    // Validate required fields
    if (!fullName || !email || !password) {
      return res.status(400).json({
        status: "error",
        message: "Nama lengkap, email, dan kata sandi wajib diisi",
      });
    }

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(
        or(eq(users.email, email), phone ? eq(users.phone, phone) : undefined)
      )
      .limit(1);

    if (existingUser.length > 0) {
      return res.status(409).json({
        status: "error",
        message: "Nomor telepon atau email sudah terdaftar",
        error_code: "USER_EXISTS",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create patient user
    const [newPatient] = await db
      .insert(users)
      .values({
        fullName,
        email,
        password: hashedPassword,
        role: "patient",
        phone: phone || null,
        dateOfBirth: dateOfBirth || null,
        gender: gender || null,
        address: address || null,
      })
      .returning({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
      });

    res.status(201).json({
      status: "success",
      data: newPatient,
      message: "Akun pasien berhasil dibuat",
    });
  } catch (error: any) {
    console.error("Create Patient Error:", error);
    res.status(500).json({
      status: "error",
      message: "Terjadi kesalahan pada server",
      error: error.message,
    });
  }
};
