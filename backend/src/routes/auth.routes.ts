import { Router } from "express";
import * as authController from "../controllers/auth.controller";
import { authenticateToken } from "../middleware/auth.middleware";
import {
  validateRegister,
  validateLogin,
  validateRefreshToken,
} from "../validators/auth.validator";

const router = Router();

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
 *     summary: Daftarkan pengguna baru
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
 *               role:
 *                 type: string
 *                 enum: [patient, nurse, admin]
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *               gender:
 *                 type: string
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
router.post("/register", validateRegister, authController.register);

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
router.post("/login", validateLogin, authController.login);

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
