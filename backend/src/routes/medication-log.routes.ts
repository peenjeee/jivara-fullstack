import { Router } from "express";
import * as medicationLogController from "../controllers/medication-log.controller";
import { authenticateToken, authorizeRoles } from "../middleware/auth.middleware";
import { validateMedicationLogCreate } from "../validators/medication-log.validator";

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
 * /api/medication-logs:
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
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [confirmed, missed, snoozed]
 *     responses:
 *       200:
 *         description: Riwayat intake berhasil diambil
 */
router.get("/", authorizeRoles("patient", "nurse", "admin"), medicationLogController.listMedicationLogs);

/**
 * @swagger
 * /api/medication-logs:
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
