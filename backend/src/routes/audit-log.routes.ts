import { Router } from "express";
import * as auditLogController from "../controllers/audit-log.controller";
import { authenticateToken, authorizeRoles } from "../middleware/auth.middleware";

const router = Router();

router.use(authenticateToken);

/**
 * @swagger
 * tags:
 *   name: Audit Logs
 *   description: Riwayat akses dan perubahan data untuk admin
 */

/**
 * @swagger
 * /api/v1/audit-logs:
 *   get:
 *     summary: Ambil riwayat audit log
 *     tags: [Audit Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: user_id
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *           example: patient.updated,admin.approved
 *       - in: query
 *         name: activity_category
 *         schema:
 *           type: string
 *           enum: [reminder, adherence, food_scan, administration]
 *         description: Filter kategori aktivitas UI. Backend yang memetakan kategori ini ke resource type internal.
 *       - in: query
 *         name: resource_type
 *         schema:
 *           type: string
 *           example: patient
 *         description: Filter resource type teknis. Untuk filter kategori UI gunakan activity_category.
 *       - in: query
 *         name: resource_id
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Cari berdasarkan nama/email pengguna, action, resource type, atau resource id.
 *       - in: query
 *         name: user_role
 *         schema:
 *           type: string
 *           example: super_admin
 *       - in: query
 *         name: nurse_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter audit log berdasarkan perawat atau pasien aktif yang ditangani perawat tersebut.
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [success, info, critical, warning]
 *         description: Filter cepat untuk log sukses, info, kritis, atau peringatan.
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, active, rejected, suspended]
 *         description: Filter status approval admin untuk halaman persetujuan super admin.
 *       - in: query
 *         name: severityFilter
 *         schema:
 *           type: string
 *           enum: [success, info, warning, critical]
 *         description: Filter level log approval admin untuk halaman persetujuan super admin.
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter satu tanggal. Untuk range gunakan start_date dan end_date.
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *     responses:
 *       200:
 *         description: Audit log berhasil diambil
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: berhasil
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                 meta:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     summary:
 *                       type: object
 *                       properties:
 *                         warningCritical:
 *                           type: integer
 *                         today:
 *                           type: integer
 *                         pending:
 *                           type: integer
 *                           description: Untuk user_role=super_admin, jumlah seluruh log approval admin (pending dan terproses). Untuk role lain, jumlah log approval pending hari ini.
 *                         processedToday:
 *                           type: integer
 *                           description: Jumlah seluruh log approval admin yang dibuat hari ini.
 *       403:
 *         description: Hanya admin yang dapat melihat audit log
 */
router.get("/", authorizeRoles("nurse", "admin", "super_admin"), auditLogController.listAuditLogs);

export default router;
