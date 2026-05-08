import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import * as authService from "../services/auth.service";

/**
 * POST /api/auth/register
 * Mendaftarkan akun perawat baru sebagai pending approval.
 */
export const register = async (req: AuthRequest, res: Response) => {
  try {
    const newUser = await authService.registerUser(req.body);

    res.status(201).json({
      status: "berhasil",
      data: {
        user_id: newUser.id,
        fullName: newUser.fullName,
        role: newUser.role,
        approval_status: newUser.approvalStatus,
        created_at: newUser.createdAt,
      },
      message: "Pendaftaran berhasil. Akun Anda menunggu persetujuan administrator.",
    });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string; code?: string };
    const status = err.status || 500;
    const isInternalError = status === 500;
    
    // console.error("Register Error:", error);
    
    res.status(status).json({
      status: "gagal",
      message: isInternalError ? "Terjadi kesalahan pada server" : (err.message || "Terjadi kesalahan"),
      ...(err.code && { error_code: err.code }),
    });
  }
};

/**
 * POST /api/auth/login
 * Masuk dengan email/telepon + kata sandi. Mengembalikan access + refresh token.
 */
export const login = async (req: AuthRequest, res: Response) => {
  try {
    const data = await authService.loginUser(req.body);

    res.status(200).json({ status: "berhasil", data });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string; code?: string };
    const status = err.status || 500;
    const isInternalError = status === 500;
    
    // console.error("Login Error:", error);
    
    res.status(status).json({
      status: "gagal",
      message: isInternalError ? "Terjadi kesalahan pada server" : (err.message || "Terjadi kesalahan"),
      ...(err.code && { error_code: err.code }),
    });
  }
};

export const listPendingRegistrations = async (req: AuthRequest, res: Response) => {
  try {
    const data = await authService.listPendingRegistrations();
    res.status(200).json({ status: "berhasil", data });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string; code?: string };
    const status = err.status || 500;

    res.status(status).json({
      status: "gagal",
      message: status === 500 ? "Terjadi kesalahan pada server" : (err.message || "Terjadi kesalahan"),
      ...(err.code && { error_code: err.code }),
    });
  }
};

export const approveRegistration = async (req: AuthRequest, res: Response) => {
  try {
    const userId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const data = await authService.approveRegistration(userId, req.user?.id);

    res.status(200).json({ status: "berhasil", data, message: "Registrasi pengguna berhasil disetujui" });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string; code?: string };
    const status = err.status || 500;

    res.status(status).json({
      status: "gagal",
      message: status === 500 ? "Terjadi kesalahan pada server" : (err.message || "Terjadi kesalahan"),
      ...(err.code && { error_code: err.code }),
    });
  }
};

export const rejectRegistration = async (req: AuthRequest, res: Response) => {
  try {
    const userId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const data = await authService.rejectRegistration(userId, req.user?.id);

    res.status(200).json({ status: "berhasil", data, message: "Registrasi pengguna berhasil ditolak" });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string; code?: string };
    const status = err.status || 500;

    res.status(status).json({
      status: "gagal",
      message: status === 500 ? "Terjadi kesalahan pada server" : (err.message || "Terjadi kesalahan"),
      ...(err.code && { error_code: err.code }),
    });
  }
};

export const completePasswordChange = async (req: AuthRequest, res: Response) => {
  try {
    const user = await authService.completePasswordChange(req.user!.id, req.body);

    res.status(200).json({
      status: "berhasil",
      data: { user },
      message: "Kata sandi berhasil diperbarui",
    });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string; code?: string };
    const status = err.status || 500;
    const isInternalError = status === 500;

    res.status(status).json({
      status: "gagal",
      message: isInternalError ? "Terjadi kesalahan pada server" : (err.message || "Terjadi kesalahan"),
      ...(err.code && { error_code: err.code }),
    });
  }
};

/**
 * POST /api/auth/refresh
 * Perbarui access token menggunakan refresh token yang valid.
 */
export const refresh = async (req: AuthRequest, res: Response) => {
  try {
    const data = await authService.refreshAccessToken(req.body.refresh_token);

    res.status(200).json({ status: "berhasil", data });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string; code?: string };
    const status = err.status || 500;
    const isInternalError = status === 500;
    
    // console.error("Refresh Error:", error);
    
    res.status(status).json({
      status: "gagal",
      message: isInternalError ? "Terjadi kesalahan pada server" : (err.message || "Terjadi kesalahan"),
      ...(err.code && { error_code: err.code }),
    });
  }
};

/**
 * POST /api/auth/logout
 * Invalidasi refresh token.
 */
export const logout = async (req: AuthRequest, res: Response) => {
  try {
    await authService.invalidateRefreshToken(req.body.refresh_token);

    res.status(200).json({
      status: "berhasil",
      message: "Berhasil keluar dari akun",
    });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    const status = err.status || 500;
    // console.error("Logout Error:", error);
    res.status(status).json({
      status: "gagal",
      message: err.message || "Terjadi kesalahan pada server",
    });
  }
};

/**
 * GET /api/auth/me
 * Ambil profil pengguna saat ini. Memerlukan autentikasi.
 */
export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    const profile = await authService.getUserProfile(req.user!.id);

    res.status(200).json({ status: "berhasil", data: profile });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    const status = err.status || 500;
    const isInternalError = status === 500;
    
    // console.error("GetMe Error:", error);
    
    res.status(status).json({
      status: "gagal",
      message: isInternalError ? "Terjadi kesalahan pada server" : (err.message || "Terjadi kesalahan"),
    });
  }
};

