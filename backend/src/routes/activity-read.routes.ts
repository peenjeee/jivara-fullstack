import { Router } from "express";
import * as activityReadController from "../controllers/activity-read.controller";
import { authenticateToken, authorizeRoles } from "../middleware/auth.middleware";

const router = Router();

router.use(authenticateToken);

/**
 * @swagger
 * tags:
 *   name: Activity Reads
 *   description: Status baca log aktivitas per user
 */

/**
 * @swagger
 * /api/v1/activity-reads:
 *   get:
 *     summary: Ambil daftar aktivitas yang sudah dibaca user saat ini
 *     tags: [Activity Reads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *           maximum: 100
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Format YYYY-MM-DD berdasarkan zona waktu aplikasi (Asia/Jakarta).
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Format YYYY-MM-DD berdasarkan zona waktu aplikasi (Asia/Jakarta).
 *       - in: query
 *         name: activity_ids
 *         schema:
 *           type: string
 *         description: Daftar ID aktivitas dipisahkan koma untuk mengecek status baca item tertentu
 *     responses:
 *       200:
 *         description: Daftar aktivitas terbaca berhasil diambil
 */
router.get("/", authorizeRoles("patient", "nurse", "admin", "super_admin", "superadmin"), activityReadController.listActivityReads);

/**
 * @swagger
 * /api/v1/activity-reads/unread-count:
 *   get:
 *     summary: Ambil jumlah log aktivitas belum dibaca untuk badge
 *     description: Endpoint ringan untuk badge nurse/patient tanpa mengambil daftar medication logs, food scans, audit logs, atau notifications secara penuh.
 *     tags: [Activity Reads]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Jumlah aktivitas belum dibaca berhasil diambil
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
 *                     count:
 *                       type: number
 *                       example: 12
 */
router.get("/unread-count", authorizeRoles("patient", "nurse"), activityReadController.getUnreadActivityCount);

/**
 * @swagger
 * /api/v1/activity-reads/mark-all-unread:
 *   post:
 *     summary: Tandai semua aktivitas belum dibaca sebagai sudah dibaca
 *     description: Menandai seluruh log aktivitas (medication logs, food scans, notifikasi, audit log yang tampil) yang belum dibaca oleh user saat ini sebagai sudah dibaca. Client dapat mengirim activityIds yang sedang tampil agar cache stale-while-revalidate tetap sinkron setelah navigasi/filter. Berguna untuk tombol "Tandai Semua Dibaca" agar badge benar-benar 0.
 *     tags: [Activity Reads]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               activityIds:
 *                 type: array
 *                 description: ID aktivitas tambahan dari halaman yang sedang terlihat untuk ikut ditandai dibaca.
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Semua aktivitas berhasil ditandai dibaca
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
 *                     count:
 *                       type: number
 *                       example: 12
 *                     activityIds:
 *                       type: array
 *                       items:
 *                         type: string
 *                 message:
 *                   type: string
 *                   example: "12 aktivitas ditandai sudah dibaca"
 */
router.post("/mark-all-unread", authorizeRoles("patient", "nurse"), activityReadController.markAllUnread);

/**
 * @swagger
 * /api/v1/activity-reads:
 *   post:
 *     summary: Tandai satu atau banyak aktivitas sebagai dibaca
 *     tags: [Activity Reads]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - activityIds
 *             properties:
 *               activityIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Aktivitas berhasil ditandai dibaca
 */
router.post("/", authorizeRoles("patient", "nurse", "admin", "super_admin", "superadmin"), activityReadController.markActivitiesRead);

export default router;
