import { Router } from "express";
import * as alertController from "../controllers/alert.controller";
import { authenticateToken, authorizeRoles } from "../middleware/auth.middleware";

const router = Router();

router.use(authenticateToken);

/**
 * @swagger
 * tags:
 *   name: Alerts
 *   description: Alert non-adherence untuk dashboard nurse/admin
 */

/**
 * @swagger
 * /api/v1/alerts:
 *   get:
 *     summary: Ambil daftar alert non-adherence
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: patient_id
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [urgent, urgent_failed, missed]
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [warning, critical]
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter satu tanggal update. Untuk range gunakan start_date dan end_date.
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
 *         description: Alert berhasil diambil
 *       403:
 *         description: Tidak memiliki izin untuk melihat alert pasien ini
 */
router.get("/", authorizeRoles("patient", "nurse", "admin"), alertController.listAlerts);

/**
 * @swagger
 * /api/v1/alerts/{id}/resolve:
 *   patch:
 *     summary: Tandai alert sebagai selesai
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Alert berhasil diselesaikan
 *       400:
 *         description: Alert sudah tidak aktif
 *       403:
 *         description: Tidak boleh menyelesaikan alert ini
 *       404:
 *         description: Alert tidak ditemukan
 */
router.patch("/:id/resolve", authorizeRoles("nurse", "admin"), alertController.resolveAlert);

export default router;
