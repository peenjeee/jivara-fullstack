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
 * /api/patients:
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
 *     responses:
 *       200:
 *         description: Daftar pasien berhasil diambil
 */
router.get("/", authorizeRoles("patient", "nurse", "admin"), patientController.listPatients);

/**
 * @swagger
 * /api/patients/{id}:
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
 *       404:
 *         description: Pasien tidak ditemukan
 */
router.get("/:id", authorizeRoles("patient", "nurse", "admin"), patientController.getPatient);

/**
 * @swagger
 * /api/patients:
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
 * /api/patients/{id}:
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
 * /api/patients/{id}/assign:
 *   put:
 *     summary: Assign pasien ke perawat
 *     tags: [Patients]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pasien berhasil ditugaskan
 */
router.put("/:id/assign", authorizeRoles("admin"), validateAssignPatient, patientController.assignPatient);

/**
 * @swagger
 * /api/patients/{id}:
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
router.delete("/:id", authorizeRoles("admin"), patientController.deactivatePatient);

export default router;
