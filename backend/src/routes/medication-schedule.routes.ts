import { Router } from "express";
import * as medicationScheduleController from "../controllers/medication-schedule.controller";
import { authenticateToken, authorizeRoles } from "../middleware/auth.middleware";
import {
  validateMedicationScheduleCreate,
  validateMedicationScheduleId,
  validateMedicationScheduleUpdate,
} from "../validators/medication-schedule.validator";

const router = Router();

router.use(authenticateToken);

/**
 * @swagger
 * tags:
 *   name: Medication Schedules
 *   description: Manajemen jadwal obat pasien
 */

/**
 * @swagger
 * /api/medication-schedules:
 *   get:
 *     summary: Ambil daftar jadwal obat
 *     tags: [Medication Schedules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: patient_id
 *         schema:
 *           type: string
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Daftar jadwal obat berhasil diambil
 */
router.get("/", authorizeRoles("patient", "nurse", "admin"), medicationScheduleController.listMedicationSchedules);

/**
 * @swagger
 * /api/medication-schedules/{id}:
 *   get:
 *     summary: Ambil detail jadwal obat
 *     tags: [Medication Schedules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Detail jadwal obat berhasil diambil
 */
router.get("/:id", authorizeRoles("patient", "nurse", "admin"), validateMedicationScheduleId, medicationScheduleController.getMedicationSchedule);

/**
 * @swagger
 * /api/medication-schedules:
 *   post:
 *     summary: Buat jadwal obat baru
 *     tags: [Medication Schedules]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Jadwal obat berhasil dibuat
 */
router.post("/", authorizeRoles("nurse", "admin"), validateMedicationScheduleCreate, medicationScheduleController.createMedicationSchedule);

/**
 * @swagger
 * /api/medication-schedules/{id}:
 *   put:
 *     summary: Perbarui jadwal obat
 *     tags: [Medication Schedules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Jadwal obat berhasil diperbarui
 */
router.put("/:id", authorizeRoles("nurse", "admin"), validateMedicationScheduleId, validateMedicationScheduleUpdate, medicationScheduleController.updateMedicationSchedule);

/**
 * @swagger
 * /api/medication-schedules/{id}:
 *   delete:
 *     summary: Deaktivasi jadwal obat
 *     tags: [Medication Schedules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Jadwal obat berhasil dinonaktifkan
 */
router.delete("/:id", authorizeRoles("nurse", "admin"), validateMedicationScheduleId, medicationScheduleController.deactivateMedicationSchedule);

export default router;
