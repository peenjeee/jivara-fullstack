import { Router } from "express";
import rateLimit from "express-rate-limit";
import * as authController from "../controllers/auth.controller";
import { authenticateToken, authorizeRoles } from "../middleware/auth.middleware";
import {
  validateRegister,
  validateLogin,
  validateLoginIdentifier,
  validateRefreshToken,
  validateCompletePasswordChange,
} from "../validators/auth.validator";

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    status: "gagal",
    message: "Terlalu banyak percobaan login, silakan coba lagi nanti.",
    error_code: "LOGIN_RATE_LIMITED",
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
 * /api/auth/register:
 *   post:
 *     summary: Daftarkan pengguna baru (admin only)
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
 *       401:
 *         description: Token akses diperlukan
 *       403:
 *         description: Hanya admin yang dapat mendaftarkan pengguna
 *       409:
 *         description: Pengguna sudah terdaftar
 */
router.post(
  "/register",
  authenticateToken,
  authorizeRoles("admin"),
  validateRegister,
  authController.register
);

/**
 * @swagger
 * /api/auth/login:
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
 *       400:
 *         description: Kredensial tidak valid
 */
router.post("/login", loginLimiter, validateLoginIdentifier, validateLogin, authController.login);

/**
 * @swagger
 * /api/auth/complete-password-change:
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
 * /api/auth/change-password:
 *   put:
 *     summary: Ganti kata sandi akun saat ini
 *     description: Alias standar untuk flow penggantian kata sandi wajib.
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
router.put(
  "/change-password",
  authenticateToken,
  validateCompletePasswordChange,
  authController.completePasswordChange
);

/**
 * @swagger
 * /api/auth/refresh:
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
router.post("/refresh", validateRefreshToken, authController.refresh);

/**
 * @swagger
 * /api/auth/logout:
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
router.post("/logout", validateRefreshToken, authController.logout);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Ambil profil pengguna saat ini
 *     description: Klik tombol Authorize di bagian atas Swagger UI, lalu masukkan access_token dari /api/auth/login tanpa awalan Bearer.
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profil berhasil diambil
 *       401:
 *         description: Tidak terautentikasi
 */
router.get("/me", authenticateToken, authController.getMe);

export default router;
