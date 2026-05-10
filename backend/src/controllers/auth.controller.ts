import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import * as authService from "../services/auth.service";

function getParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getCookieValue(cookieHeader: string | undefined, name: string) {
  if (!cookieHeader) return undefined;
  const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());
  const target = cookies.find((cookie) => cookie.startsWith(`${name}=`));
  return target ? decodeURIComponent(target.slice(name.length + 1)) : undefined;
}

function getRefreshToken(req: AuthRequest) {
  return req.body?.refresh_token || getCookieValue(req.headers.cookie, "jivara-refresh-token");
}

/**
 * POST /api/auth/register
 * Mendaftarkan akun perawat baru oleh admin.
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
        created_at: newUser.createdAt,
      },
      message: "Pendaftaran berhasil",
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

export const listAdminApprovals = async (_req: AuthRequest, res: Response) => {
  try {
    const [users, summary] = await Promise.all([
      authService.listPendingAdminApprovals(),
      authService.getAdminApprovalSummary(),
    ]);

    res.status(200).json({ status: "berhasil", data: { users, summary } });
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

export const approveAdminApproval = async (req: AuthRequest, res: Response) => {
  try {
    const adminId = getParamValue(req.params.id);
    if (!adminId) {
      return res.status(400).json({ status: "gagal", message: "ID admin wajib diisi", error_code: "VALIDATION_ERROR" });
    }

    const user = await authService.approveAdminApproval(adminId, req.user!.id);

    res.status(200).json({
      status: "berhasil",
      data: { user },
      message: "Admin berhasil disetujui",
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

export const rejectAdminApproval = async (req: AuthRequest, res: Response) => {
  try {
    const adminId = getParamValue(req.params.id);
    if (!adminId) {
      return res.status(400).json({ status: "gagal", message: "ID admin wajib diisi", error_code: "VALIDATION_ERROR" });
    }

    const user = await authService.rejectAdminApproval(adminId, req.body, req.user!.id);

    res.status(200).json({
      status: "berhasil",
      data: { user },
      message: "Pengajuan admin berhasil ditolak",
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

export const activateSuspendedAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const adminId = getParamValue(req.params.id);
    if (!adminId) {
      return res.status(400).json({ status: "gagal", message: "ID admin wajib diisi", error_code: "VALIDATION_ERROR" });
    }

    const user = await authService.activateSuspendedAdmin(adminId, req.user!.id);

    res.status(200).json({
      status: "berhasil",
      data: { user },
      message: "Admin berhasil diaktifkan kembali",
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

export const restoreRejectedAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const adminId = getParamValue(req.params.id);
    if (!adminId) {
      return res.status(400).json({ status: "gagal", message: "ID admin wajib diisi", error_code: "VALIDATION_ERROR" });
    }

    const user = await authService.restoreRejectedAdmin(adminId, req.user!.id);

    res.status(200).json({
      status: "berhasil",
      data: { user },
      message: "Pengajuan admin berhasil dipulihkan",
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

export const suspendActiveAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const adminId = getParamValue(req.params.id);
    if (!adminId) {
      return res.status(400).json({ status: "gagal", message: "ID admin wajib diisi", error_code: "VALIDATION_ERROR" });
    }

    const user = await authService.suspendActiveAdmin(adminId, req.user!.id);

    res.status(200).json({
      status: "berhasil",
      data: { user },
      message: "Admin berhasil disuspend",
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

export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    const user = await authService.changePassword(req.user!.id, req.body);

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
    const refreshToken = getRefreshToken(req);
    if (!refreshToken) {
      return res.status(400).json({ status: "gagal", message: "Token refresh wajib diisi", error_code: "VALIDATION_ERROR" });
    }
    const data = await authService.refreshAccessToken(refreshToken);

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

export const getStatus = async (req: AuthRequest, res: Response) => {
  try {
    const refreshToken = getRefreshToken(req);
    if (!refreshToken) {
      return res.status(400).json({ status: "gagal", message: "Token refresh wajib diisi", error_code: "VALIDATION_ERROR" });
    }
    const user = await authService.getUserProfileByRefreshToken(refreshToken);

    res.status(200).json({ status: "berhasil", data: { user } });
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
 * POST /api/auth/logout
 * Invalidasi refresh token.
 */
export const logout = async (req: AuthRequest, res: Response) => {
  try {
    const refreshToken = getRefreshToken(req);
    if (refreshToken) await authService.invalidateRefreshToken(refreshToken);

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

export const updateMe = async (req: AuthRequest, res: Response) => {
  try {
    const profile = await authService.updateUserProfile(req.user!.id, req.body);

    res.status(200).json({ status: "berhasil", data: profile, message: "Profil berhasil diperbarui" });
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
