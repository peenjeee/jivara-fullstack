import { Router } from "express";
import * as medicationScheduleController from "../controllers/medication-schedule.controller";
import { authenticateToken, authorizeRoles } from "../middleware/auth.middleware";
import {
  validateMedicationScheduleBulkCreate,
  validateMedicationScheduleCreate,
  validateMedicationScheduleId,
  validateMedicationScheduleUpdate,
} from "../validators/medication-schedule.validator";

const router = Router();

router.use(authenticateToken);

router.get("/medicine-catalog", authorizeRoles("nurse", "admin"), medicationScheduleController.listMedicineCatalog);

/**
 * @swagger
 * tags:
 *   name: Medication Schedules
 *   description: Manajemen jadwal obat pasien
 */

/**
 * @swagger
 * /api/v1/medication-schedules:
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
 *         name: patient_ids
 *         schema:
 *           type: string
 *         description: Daftar ID pasien dipisahkan koma untuk mengambil jadwal beberapa pasien dalam satu halaman.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Batas jumlah jadwal yang dikembalikan. Jika tidak dikirim, semua jadwal sesuai filter dikembalikan.
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Daftar jadwal obat berhasil diambil
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
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       patientId:
 *                         type: string
 *                         format: uuid
 *                       drugName:
 *                         type: string
 *                       dosage:
 *                         type: string
 *                       stock:
 *                         type: integer
 *                       frequency:
 *                         type: integer
 *                       scheduledTimes:
 *                         type: array
 *                         items:
 *                           type: string
 *                       reminderEnabled:
 *                         type: boolean
 *                       isActive:
 *                         type: boolean
 *                       completedAt:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 */
router.get("/", authorizeRoles("patient", "nurse", "admin"), medicationScheduleController.listMedicationSchedules);

/**
 * @swagger
 * /api/v1/medication-schedules/patient-groups:
 *   get:
 *     summary: Ambil halaman pasien beserta jadwal obatnya
 *     tags: [Medication Schedules]
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
 *           default: 10
 *           maximum: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, all]
 *         description: Filter status aktif pasien pada halaman jadwal.
 *       - in: query
 *         name: adherenceStatus
 *         schema:
 *           type: string
 *           enum: [Need Special Attention, Lagging Behind, On Ideal Schedule, Complete]
 *     responses:
 *       200:
 *         description: Halaman jadwal per pasien berhasil diambil
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
 *                     patients:
 *                       type: array
 *                       items:
 *                         type: object
 *                     schedules:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           patientId:
 *                             type: string
 *                             format: uuid
 *                           drugName:
 *                             type: string
 *                           dosage:
 *                             type: string
 *                           stock:
 *                             type: integer
 *                           completedAt:
 *                             type: string
 *                             format: date-time
 *                             nullable: true
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
 *                         active:
 *                           type: integer
 *                         completed:
 *                           type: integer
 *                         reminders:
 *                           type: integer
 */
router.get("/patient-groups", authorizeRoles("patient", "nurse", "admin"), medicationScheduleController.listMedicationSchedulePatientGroups);

/**
 * @swagger
 * /api/v1/medication-schedules/{id}:
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
 * /api/v1/medication-schedules:
 *   post:
 *     summary: Buat jadwal obat baru
 *     tags: [Medication Schedules]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - patientId
 *               - drugName
 *               - dosage
 *               - frequency
 *               - scheduledTimes
 *             properties:
 *               patientId:
 *                 type: string
 *                 format: uuid
 *               drugName:
 *                 type: string
 *                 example: Amlodipine
 *               dosage:
 *                 type: string
 *                 example: 5mg
 *               stock:
 *                 type: integer
 *                 minimum: 0
 *                 example: 30
 *               frequency:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 3
 *                 example: 2
 *               scheduledTimes:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: string
 *                   pattern: '^([01]\\d|2[0-3]):[0-5]\\d$'
 *                 example: ["08:00", "20:00"]
 *               instructions:
 *                 type: string
 *                 nullable: true
 *                 example: Sesudah makan
 *               reminderEnabled:
 *                 type: boolean
 *                 default: true
 *               isActive:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       201:
 *         description: Jadwal obat berhasil dibuat
 */
router.post("/", authorizeRoles("nurse", "admin"), validateMedicationScheduleCreate, medicationScheduleController.createMedicationSchedule);

/**
 * @swagger
 * /api/v1/medication-schedules/bulk:
 *   post:
 *     summary: Buat beberapa jadwal obat sekaligus
 *     tags: [Medication Schedules]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - schedules
 *             properties:
 *               schedules:
 *                 type: array
 *                 minItems: 1
 *                 maxItems: 20
 *                 items:
 *                   type: object
 *                   required:
 *                     - patientId
 *                     - drugName
 *                     - dosage
 *                     - frequency
 *                     - scheduledTimes
 *                   properties:
 *                     patientId:
 *                       type: string
 *                       format: uuid
 *                     drugName:
 *                       type: string
 *                     dosage:
 *                       type: string
 *                     frequency:
 *                       type: integer
 *                     scheduledTimes:
 *                       type: array
 *                       items:
 *                         type: string
 *                     instructions:
 *                       type: string
 *     responses:
 *       201:
 *         description: Jadwal obat berhasil dibuat
 *       400:
 *         description: Payload tidak valid
 */
router.post("/bulk", authorizeRoles("nurse", "admin"), validateMedicationScheduleBulkCreate, medicationScheduleController.createMedicationSchedules);

/**
 * @swagger
 * /api/v1/medication-schedules/{id}:
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
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               drugName:
 *                 type: string
 *                 example: Metformin
 *               dosage:
 *                 type: string
 *                 example: 500mg
 *               stock:
 *                 type: integer
 *                 minimum: 0
 *                 example: 20
 *               frequency:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 3
 *                 example: 2
 *               scheduledTimes:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: string
 *                   pattern: '^([01]\\d|2[0-3]):[0-5]\\d$'
 *                 example: ["07:00", "19:00"]
 *               instructions:
 *                 type: string
 *                 nullable: true
 *               reminderEnabled:
 *                 type: boolean
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Jadwal obat berhasil diperbarui
 */
router.put("/:id", authorizeRoles("nurse", "admin"), validateMedicationScheduleId, validateMedicationScheduleUpdate, medicationScheduleController.updateMedicationSchedule);

/**
 * @swagger
 * /api/v1/medication-schedules/{id}:
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
