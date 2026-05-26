import { Router } from "express";
import * as adminDashboardController from "../controllers/admin-dashboard.controller";
import { authenticateToken, authorizeRoles } from "../middleware/auth.middleware";

const router = Router();

router.use(authenticateToken);

/**
 * @swagger
 * tags:
 *   name: Admin Dashboard
 *   description: Ringkasan dashboard admin dan preview data prioritas
 */

/**
 * @swagger
 * /api/v1/admin-dashboard:
 *   get:
 *     summary: Ambil data ringkas dashboard admin
 *     description: Mengembalikan summary card, 5 perawat yang memiliki pasien perlu perhatian, 5 pasien berisiko, dan 5 notifikasi prioritas terbaru.
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Data dashboard admin berhasil diambil
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
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalNurses:
 *                           type: integer
 *                           example: 5
 *                         totalActivePatients:
 *                           type: integer
 *                           example: 8
 *                         totalActiveSchedules:
 *                           type: integer
 *                           example: 19
 *                     nurseFollowUps:
 *                       type: array
 *                       maxItems: 5
 *                       items:
 *                         type: object
 *                         properties:
 *                           nurse:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                                 format: uuid
 *                               fullName:
 *                                 type: string
 *                               email:
 *                                 type: string
 *                               phone:
 *                                 type: string
 *                               gender:
 *                                 type: string
 *                                 enum: [Pria, Wanita]
 *                               status:
 *                                 type: string
 *                                 enum: [Aktif, Nonaktif]
 *                               assignedPatients:
 *                                 type: integer
 *                           assignedPatientCount:
 *                             type: integer
 *                             example: 5
 *                           riskyPatientCount:
 *                             type: integer
 *                             example: 2
 *                     riskyPatients:
 *                       type: array
 *                       maxItems: 5
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           name:
 *                             type: string
 *                           status:
 *                             type: string
 *                             enum: [On Ideal Schedule, Lagging Behind, Need Special Attention]
 *                           adherence:
 *                             type: integer
 *                           assignedNurseId:
 *                             type: string
 *                             format: uuid
 *                           assignedNurseName:
 *                             type: string
 *                     priorityActivities:
 *                       type: array
 *                       maxItems: 5
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           title:
 *                             type: string
 *                           description:
 *                             type: string
 *                           category:
 *                             type: string
 *                             enum: [Reminder, Kepatuhan, Scan Makanan, Administrasi]
 *                           severity:
 *                             type: string
 *                             enum: [Peringatan, Kritis]
 *                           timestamp:
 *                             type: string
 *                             format: date-time
 *                           patientId:
 *                             type: string
 *                             format: uuid
 *                           patientName:
 *                             type: string
 *       401:
 *         description: Token tidak valid atau belum login
 *       403:
 *         description: Hanya admin dan super admin yang dapat melihat dashboard admin
 */

/**
 * @swagger
 * /api/v1/admin-dashboard/nurse-summary:
 *   get:
 *     summary: Ambil ringkasan dashboard nurse
 *     description: Mengembalikan angka ringkas untuk dashboard nurse. Total pasien aktif, total notifikasi peringatan/kritis, dan kepatuhan keseluruhan dihitung dari seluruh pasien yang dapat diakses nurse.
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Ringkasan dashboard nurse berhasil diambil
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
 *                     totalActivePatients:
 *                       type: integer
 *                       example: 7
 *                     warningCriticalNotifications:
 *                       type: integer
 *                       description: Total notifikasi urgency high, urgent, dan critical.
 *                       example: 3
 *                     overallAdherence:
 *                       type: integer
 *                       description: Persentase kepatuhan seluruh pasien nurse untuk semua periode.
 *                       example: 86
 *       401:
 *         description: Token tidak valid atau belum login
 *       403:
 *         description: Hanya nurse yang dapat melihat ringkasan dashboard nurse
 */
router.get("/nurse-summary", authorizeRoles("nurse"), adminDashboardController.getNurseDashboardSummary);
router.get("/", authorizeRoles("admin", "super_admin"), adminDashboardController.getAdminDashboard);

export default router;
