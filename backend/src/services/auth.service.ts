import { db } from "../db";
import { users, refreshTokens } from "../db/schema";
import { eq, or } from "drizzle-orm";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import {
  RegisterDTO,
  LoginDTO,
  CompletePasswordChangeDTO,
  TokenPayload,
  AUTH_CONSTANTS,
} from "../types/auth.types";

const JWT_SECRET = process.env.JWT_SECRET as string;

// ─── Utilitas Token ─────────────────────────

export const generateAccessToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: AUTH_CONSTANTS.ACCESS_TOKEN_EXPIRY,
  });
};

export const generateRefreshToken = async (userId: string): Promise<string> => {
  const token = crypto.randomBytes(64).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + AUTH_CONSTANTS.REFRESH_TOKEN_EXPIRY_DAYS);

  await db.insert(refreshTokens).values({ userId, token, expiresAt });
  return token;
};

/**
 * Mendaftarkan akun perawat baru oleh admin.
 */
export const registerUser = async (dto: RegisterDTO) => {
  // Cek pengguna yang sudah ada
  const conditions = [eq(users.email, dto.email)];
  if (dto.phone) {
    conditions.push(eq(users.phone, dto.phone));
  }

  const existingUser = await db
    .select()
    .from(users)
    .where(or(...conditions))
    .limit(1);

  if (existingUser.length > 0) {
    throw { status: 409, message: "Nomor telepon atau email sudah terdaftar", code: "USER_EXISTS" };
  }

  const hashedPassword = await bcrypt.hash(dto.password, AUTH_CONSTANTS.BCRYPT_SALT_ROUNDS);

  const [newUser] = await db
    .insert(users)
    .values({
      fullName: dto.fullName,
      email: dto.email,
      password: hashedPassword,
      role: "nurse",
      phone: dto.phone || null,
      gender: dto.gender || null,
      address: dto.address || null,
      age: dto.age || 0,
      mustChangePassword: true,
    })
    .returning({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
    });

  return newUser;
};

/**
 * Autentikasi pengguna dengan email/telepon + kata sandi.
 */
export const loginUser = async (dto: LoginDTO) => {
  const loginId = dto.identifier || dto.email;
  if (!loginId) {
    throw { status: 400, message: "Email/nomor telepon wajib diisi", code: "MISSING_IDENTIFIER" };
  }

  const user = await db
    .select()
    .from(users)
    .where(or(eq(users.email, loginId), eq(users.phone, loginId)))
    .limit(1);

  if (user.length === 0) {
    throw { status: 400, message: "Email/nomor telepon atau kata sandi salah", code: "INVALID_CREDENTIALS" };
  }

  const foundUser = user[0];

  if (!foundUser.isActive) {
    throw { status: 403, message: "Akun telah dinonaktifkan", code: "ACCOUNT_DEACTIVATED" };
  }

  const isPasswordValid = await bcrypt.compare(dto.password, foundUser.password);
  if (!isPasswordValid) {
    throw { status: 400, message: "Email/nomor telepon atau kata sandi salah", code: "INVALID_CREDENTIALS" };
  }

  const accessToken = generateAccessToken({
    id: foundUser.id,
    email: foundUser.email,
    role: foundUser.role,
  });
  const refreshToken = await generateRefreshToken(foundUser.id);

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: "Bearer" as const,
    expires_in: 3600,
    user: {
      id: foundUser.id,
      fullName: foundUser.fullName,
      email: foundUser.email,
      phone: foundUser.phone,
      role: foundUser.role,
      age: foundUser.age,
      gender: foundUser.gender,
      address: foundUser.address,
      mustChangePassword: foundUser.mustChangePassword,
    },
  };
};

export const completePasswordChange = async (userId: string, dto: CompletePasswordChangeDTO) => {
  const user = await db
    .select({ id: users.id, mustChangePassword: users.mustChangePassword })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (user.length === 0) {
    throw { status: 404, message: "Pengguna tidak ditemukan", code: "NOT_FOUND" };
  }

  if (!user[0].mustChangePassword) {
    throw { status: 400, message: "Akun ini tidak wajib mengganti kata sandi", code: "PASSWORD_CHANGE_NOT_REQUIRED" };
  }

  const hashedPassword = await bcrypt.hash(dto.newPassword, AUTH_CONSTANTS.BCRYPT_SALT_ROUNDS);

  const [updatedUser] = await db
    .update(users)
    .set({ password: hashedPassword, mustChangePassword: false, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      phone: users.phone,
      role: users.role,
      age: users.age,
      gender: users.gender,
      address: users.address,
      mustChangePassword: users.mustChangePassword,
    });

  return updatedUser;
};

/**
 * Perbarui access token menggunakan string refresh token yang valid.
 */
export const refreshAccessToken = async (token: string) => {
  const storedToken = await db
    .select()
    .from(refreshTokens)
    .where(eq(refreshTokens.token, token))
    .limit(1);

  if (storedToken.length === 0) {
    throw { status: 401, message: "Token refresh tidak valid", code: "INVALID_TOKEN" };
  }

  if (new Date() > storedToken[0].expiresAt) {
    await db.delete(refreshTokens).where(eq(refreshTokens.id, storedToken[0].id));
    throw { status: 401, message: "Token refresh telah kedaluwarsa", code: "TOKEN_EXPIRED" };
  }

  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, storedToken[0].userId))
    .limit(1);

  if (user.length === 0) {
    throw { status: 401, message: "Pengguna tidak ditemukan", code: "INVALID_TOKEN" };
  }

  if (!user[0].isActive) {
    await db.delete(refreshTokens).where(eq(refreshTokens.id, storedToken[0].id));
    throw { status: 403, message: "Akun telah dinonaktifkan", code: "ACCOUNT_DEACTIVATED" };
  }

  const accessToken = generateAccessToken({
    id: user[0].id,
    email: user[0].email,
    role: user[0].role,
  });

  return { access_token: accessToken, expires_in: 3600 };
};

/**
 * Invalidasi refresh token (logout).
 */
export const invalidateRefreshToken = async (token: string) => {
  await db.delete(refreshTokens).where(eq(refreshTokens.token, token));
};

/**
 * Ambil profil pengguna saat ini berdasarkan ID.
 */
export const getUserProfile = async (userId: string) => {
  const user = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      phone: users.phone,
      role: users.role,
      age: users.age,
      gender: users.gender,
      address: users.address,
      isActive: users.isActive,
      mustChangePassword: users.mustChangePassword,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (user.length === 0) {
    throw { status: 404, message: "Pengguna tidak ditemukan", code: "NOT_FOUND" };
  }

  return user[0];
};
