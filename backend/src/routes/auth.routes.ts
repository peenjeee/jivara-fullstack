import { Router } from "express";
import rateLimit from "express-rate-limit";
import * as authController from "../controllers/auth.controller";
import { authenticateToken, authorizeRoles } from "../middleware/auth.middleware";
import {
  validateRegister,
  validateLogin,
  validateLoginIdentifier,
  validateChangePassword,
  validateCompletePasswordChange,
  validateRejectAdminApproval,
  validateUpdateProfile,
} from "../validators/auth.validator";

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "production" ? 10 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    status: "gagal",
    message: "Terlalu banyak percobaan login, silakan coba lagi nanti.",
    error_code: "LOGIN_RATE_LIMITED",
  },
});

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "production" ? 10 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    status: "gagal",
    message: "Terlalu banyak percobaan pendaftaran, silakan coba lagi nanti.",
    error_code: "REGISTER_RATE_LIMITED",
  },
});

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Manajemen autentikasi
 */

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Daftarkan calon admin baru
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fullName
 *               - email
 *               - password
 *             properties:
 *               fullName:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               phone:
 *                 type: string
 *               gender:
 *                 type: string
 *                 enum: [male, female]
 *               address:
 *                 type: string
 *     responses:
 *       201:
 *         description: Pengguna berhasil terdaftar
 *       400:
 *         description: Permintaan tidak valid
 *       409:
 *         description: Pengguna sudah terdaftar
 */
router.post(
  "/register",
  registerLimiter,
  validateRegister,
  authController.register
);

router.get(
  "/admin-approvals",
  authenticateToken,
  authorizeRoles("super_admin"),
  authController.listAdminApprovals
);

router.post(
  "/admin-approvals/:id/approve",
  authenticateToken,
  authorizeRoles("super_admin"),
  authController.approveAdminApproval
);

router.post(
  "/admin-approvals/:id/reject",
  authenticateToken,
  authorizeRoles("super_admin"),
  validateRejectAdminApproval,
  authController.rejectAdminApproval
);

router.post(
  "/admin-approvals/:id/activate",
  authenticateToken,
  authorizeRoles("super_admin"),
  authController.activateSuspendedAdmin
);

router.post(
  "/admin-approvals/:id/restore",
  authenticateToken,
  authorizeRoles("super_admin"),
  authController.restoreRejectedAdmin
);

router.post(
  "/admin-approvals/:id/suspend",
  authenticateToken,
  authorizeRoles("super_admin"),
  authController.suspendActiveAdmin
);

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Masuk ke akun pengguna
 *     description: Gunakan access_token dari response endpoint ini untuk tombol Authorize di Swagger UI.
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               identifier:
 *                 type: string
 *                 description: Email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login berhasil. Salin data.access_token untuk autentikasi Bearer.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: berhasil
 *                 data:
 *                   type: object
 *                   properties:
 *                     access_token:
 *                       type: string
 *                     refresh_token:
 *                       type: string
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         fullName:
 *                           type: string
 *                         email:
 *                           type: string
 *                           format: email
 *                         role:
 *                           type: string
 *                         lastLoginAt:
 *                           type: string
 *                           nullable: true
 *                           format: date-time
 *       400:
 *         description: Kredensial tidak valid
 */
router.post("/login", loginLimiter, validateLoginIdentifier, validateLogin, authController.login);

/**
 * @swagger
 * /api/v1/auth/complete-password-change:
 *   post:
 *     summary: Selesaikan penggantian kata sandi wajib
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newPassword
 *             properties:
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Kata sandi berhasil diperbarui
 *       400:
 *         description: Kata sandi tidak valid atau perubahan tidak diperlukan
 *       401:
 *         description: Tidak terautentikasi
 */
router.post(
  "/complete-password-change",
  authenticateToken,
  validateCompletePasswordChange,
  authController.completePasswordChange
);

/**
 * @swagger
 * /api/v1/auth/change-password:
 *   put:
 *     summary: Ganti kata sandi akun saat ini
 *     description: Verifikasi kata sandi lama sebelum menyimpan kata sandi baru.
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Kata sandi berhasil diperbarui
 *       400:
 *         description: Kata sandi lama salah atau kata sandi baru tidak valid
 *       401:
 *         description: Tidak terautentikasi
 */
router.put(
  "/change-password",
  authenticateToken,
  validateChangePassword,
  authController.changePassword
);

/**
 * @swagger
 * /api/v1/auth/refresh:
 *   post:
 *     summary: Perbarui token akses
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refresh_token
 *             properties:
 *               refresh_token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token berhasil diperbarui
 *       401:
 *         description: Token refresh tidak valid atau kedaluwarsa
 */
router.post("/refresh", authController.refresh);

router.post("/status", authController.getStatus);

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: Keluar dari akun
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refresh_token
 *             properties:
 *               refresh_token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Berhasil keluar
 */
router.post("/logout", authController.logout);

/**
 * @swagger
 * /api/v1/auth/me:
 *   get:
 *     summary: Ambil profil pengguna saat ini
 *     description: Klik tombol Authorize di bagian atas Swagger UI, lalu masukkan access_token dari /api/v1/auth/login tanpa awalan Bearer.
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profil berhasil diambil
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: berhasil
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     fullName:
 *                       type: string
 *                     email:
 *                       type: string
 *                       format: email
 *                     role:
 *                       type: string
 *                     lastLoginAt:
 *                       type: string
 *                       nullable: true
 *                       format: date-time
 *       401:
 *         description: Tidak terautentikasi
 */
router.get("/me", authenticateToken, authController.getMe);

/**
 * @swagger
 * /api/v1/auth/me:
 *   patch:
 *     summary: Perbarui profil pengguna saat ini
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *               address:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profil berhasil diperbarui
 *       400:
 *         description: Payload tidak valid
 *       409:
 *         description: Email atau nomor telepon sudah digunakan
 */
router.patch("/me", authenticateToken, validateUpdateProfile, authController.updateMe);

export default router;
