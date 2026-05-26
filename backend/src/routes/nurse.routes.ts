import { Router } from "express";
import * as nurseController from "../controllers/nurse.controller";
import { authenticateToken, authorizeRoles } from "../middleware/auth.middleware";
import { validateNurseCreate, validateNurseId, validateNurseUpdate } from "../validators/nurse.validator";

const router = Router();

router.use(authenticateToken);

/**
 * @swagger
 * tags:
 *   name: Nurses
 *   description: Manajemen akun perawat untuk admin
 */

/**
 * @swagger
 * /api/v1/nurses:
 *   get:
 *     summary: Ambil daftar perawat
 *     tags: [Nurses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *       - in: query
 *         name: department
 *         schema:
 *           type: string
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
 *         description: Daftar perawat berhasil diambil
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
 *                       gender:
 *                         type: string
 *                         enum: [male, female]
 *                       isActive:
 *                         type: boolean
 *                       assignedPatients:
 *                         type: integer
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       lastLoginAt:
 *                         type: string
 *                         nullable: true
 *                         format: date-time
 *       403:
 *         description: Hanya admin yang dapat mengakses endpoint ini
 */
router.get("/", authorizeRoles("admin", "super_admin"), nurseController.listNurses);

/**
 * @swagger
 * /api/v1/nurses/{id}:
 *   get:
 *     summary: Ambil detail perawat
 *     tags: [Nurses]
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
 *         description: Detail perawat berhasil diambil
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
 *                     gender:
 *                       type: string
 *                       enum: [male, female]
 *                     isActive:
 *                       type: boolean
 *                     assignedPatients:
 *                       type: integer
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     lastLoginAt:
 *                       type: string
 *                       nullable: true
 *                       format: date-time
 *       404:
 *         description: Perawat tidak ditemukan
 */
router.get("/:id", authorizeRoles("admin", "super_admin"), validateNurseId, nurseController.getNurse);

/**
 * @swagger
 * /api/v1/nurses:
 *   post:
 *     summary: Buat akun perawat
 *     tags: [Nurses]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fullName
 *               - email
 *               - password
 *             properties:
 *               fullName:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *               phone:
 *                 type: string
 *               age:
 *                 type: integer
 *               gender:
 *                 type: string
 *                 enum: [male, female]
 *               address:
 *                 type: string
 *               employeeId:
 *                 type: string
 *               department:
 *                 type: string
 *     responses:
 *       201:
 *         description: Akun perawat berhasil dibuat
 *       400:
 *         description: Payload tidak valid
 *       409:
 *         description: Email atau nomor telepon sudah terdaftar
 */
router.post("/", authorizeRoles("admin", "super_admin"), validateNurseCreate, nurseController.createNurse);

/**
 * @swagger
 * /api/v1/nurses/{id}:
 *   put:
 *     summary: Perbarui data perawat
 *     tags: [Nurses]
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
 *               fullName:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *               age:
 *                 type: integer
 *               gender:
 *                 type: string
 *                 enum: [male, female]
 *               address:
 *                 type: string
 *               employeeId:
 *                 type: string
 *               department:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Data perawat berhasil diperbarui
 *       400:
 *         description: Payload tidak valid
 *       404:
 *         description: Perawat tidak ditemukan
 */
router.put("/:id", authorizeRoles("admin", "super_admin"), validateNurseId, validateNurseUpdate, nurseController.updateNurse);

/**
 * @swagger
 * /api/v1/nurses/{id}:
 *   delete:
 *     summary: Nonaktifkan perawat
 *     tags: [Nurses]
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
 *         description: Perawat berhasil dinonaktifkan
 *       404:
 *         description: Perawat tidak ditemukan
 */
router.delete("/:id", authorizeRoles("admin", "super_admin"), validateNurseId, nurseController.deactivateNurse);

export default router;
