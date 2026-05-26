import { Router } from "express";
import * as patientController from "../controllers/patient.controller";
import { authenticateToken, authorizeRoles } from "../middleware/auth.middleware";
import {
  validateAssignPatient,
  validatePatientCreate,
  validatePatientUpdate,
} from "../validators/patient.validator";

const router = Router();

router.use(authenticateToken);

/**
 * @swagger
 * tags:
 *   name: Patients
 *   description: Manajemen data pasien
 */

/**
 * @swagger
 * /api/v1/patients:
 *   get:
 *     summary: Ambil daftar pasien
 *     tags: [Patients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, all]
 *       - in: query
 *         name: adherenceStatus
 *         schema:
 *           type: string
 *           enum: [Need Special Attention, Lagging Behind, On Ideal Schedule, Complete]
 *         description: Filter status kepatuhan pasien yang dihitung dari adherence 30 hari/7 hari. "Complete" berarti semua jadwal obat pasien telah habis (stock ≤ 0).
 *       - in: query
 *         name: nurseId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter pasien aktif berdasarkan perawat yang menangani.
 *     responses:
 *       200:
 *         description: Daftar pasien berhasil diambil
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
 *                       fullName:
 *                         type: string
 *                       email:
 *                         type: string
 *                         format: email
 *                       phone:
 *                         type: string
 *                       assignedNurseId:
 *                         type: string
 *                         nullable: true
 *                         format: uuid
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       lastLoginAt:
 *                         type: string
 *                         nullable: true
 *                         format: date-time
 */
router.get("/", authorizeRoles("patient", "nurse", "admin"), patientController.listPatients);

/**
 * @swagger
 * /api/v1/patients/me:
 *   get:
 *     summary: Ambil data pasien yang sedang login
 *     tags: [Patients]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Data pasien login berhasil diambil
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
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     fullName:
 *                       type: string
 *                     email:
 *                       type: string
 *                       format: email
 *                     phone:
 *                       type: string
 *                     registeredAt:
 *                       type: string
 *                       nullable: true
 *                       format: date-time
 *                     lastLoginAt:
 *                       type: string
 *                       nullable: true
 *                       format: date-time
 *       403:
 *         description: Endpoint hanya untuk role patient
 *       404:
 *         description: Data pasien tidak ditemukan
 */
router.get("/me", authorizeRoles("patient"), patientController.getCurrentPatient);

/**
 * @swagger
 * /api/v1/patients/{id}:
 *   get:
 *     summary: Ambil detail pasien
 *     tags: [Patients]
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
 *         description: Detail pasien berhasil diambil
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
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     fullName:
 *                       type: string
 *                     email:
 *                       type: string
 *                       format: email
 *                     phone:
 *                       type: string
 *                     assignedNurseId:
 *                       type: string
 *                       nullable: true
 *                       format: uuid
 *                     registeredAt:
 *                       type: string
 *                       nullable: true
 *                       format: date-time
 *                     lastLoginAt:
 *                       type: string
 *                       nullable: true
 *                       format: date-time
 *       404:
 *         description: Pasien tidak ditemukan
 */
router.get("/:id", authorizeRoles("patient", "nurse", "admin"), patientController.getPatient);

/**
 * @swagger
 * /api/v1/patients:
 *   post:
 *     summary: Daftarkan pasien baru
 *     tags: [Patients]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Pasien berhasil didaftarkan
 *       409:
 *         description: Email atau telepon sudah terdaftar
 */
router.post("/", authorizeRoles("nurse", "admin"), validatePatientCreate, patientController.createPatient);

/**
 * @swagger
 * /api/v1/patients/{id}:
 *   put:
 *     summary: Perbarui data pasien
 *     tags: [Patients]
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
 *         description: Data pasien berhasil diperbarui
 */
router.put("/:id", authorizeRoles("nurse", "admin"), validatePatientUpdate, patientController.updatePatient);

/**
 * @swagger
 * /api/v1/patients/{id}/assign:
 *   put:
 *     summary: Assign pasien ke perawat
 *     tags: [Patients]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pasien berhasil ditugaskan
 */
router.put("/:id/assign", authorizeRoles("admin", "super_admin"), validateAssignPatient, patientController.assignPatient);

/**
 * @swagger
 * /api/v1/patients/{id}:
 *   delete:
 *     summary: Deaktivasi pasien
 *     tags: [Patients]
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
 *         description: Pasien berhasil dinonaktifkan
 */
router.delete("/:id", authorizeRoles("admin", "super_admin"), patientController.deactivatePatient);

export default router;
