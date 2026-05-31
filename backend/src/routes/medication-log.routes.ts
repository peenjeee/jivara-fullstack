import { Router } from "express";
import * as medicationLogController from "../controllers/medication-log.controller";
import { authenticateToken, authorizeRoles } from "../middleware/auth.middleware";
import { validateMedicationLogCreate, validateMedicationSnooze } from "../validators/medication-log.validator";

const router = Router();

router.use(authenticateToken);

/**
 * @swagger
 * tags:
 *   name: Medication Logs
 *   description: Riwayat dan konfirmasi intake obat
 */

/**
 * @swagger
 * /api/v1/medication-logs:
 *   get:
 *     summary: Ambil riwayat intake obat
 *     tags: [Medication Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: patient_id
 *         schema:
 *           type: string
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           example: 2026-05-10
 *         description: Filter satu tanggal berdasarkan zona waktu aplikasi (Asia/Jakarta). Untuk range gunakan start_date dan end_date.
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Tanggal awal berdasarkan zona waktu aplikasi (Asia/Jakarta).
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Tanggal akhir berdasarkan zona waktu aplikasi (Asia/Jakarta).
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [confirmed, missed, snoozed]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Halaman data riwayat.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Jumlah data per halaman. Maksimal 100.
 *     responses:
 *       200:
 *         description: Riwayat intake berhasil diambil
 */
router.get("/", authorizeRoles("patient", "nurse", "admin"), medicationLogController.listMedicationLogs);
router.post("/snooze", authorizeRoles("patient"), validateMedicationSnooze, medicationLogController.snoozeMedicationReminder);

/**
 * @swagger
 * /api/v1/medication-logs:
 *   post:
 *     summary: Catat konfirmasi intake obat pasien
 *     tags: [Medication Logs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Intake obat berhasil dicatat
 */
router.post("/", authorizeRoles("patient", "nurse", "admin"), validateMedicationLogCreate, medicationLogController.createMedicationLog);

export default router;
