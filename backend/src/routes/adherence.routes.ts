import { Router } from "express";
import * as adherenceController from "../controllers/adherence.controller";
import { authenticateToken, authorizeRoles } from "../middleware/auth.middleware";

const router = Router();

router.use(authenticateToken);

/**
 * @swagger
 * tags:
 *   name: Adherence
 *   description: Statistik kepatuhan minum obat
 */

/**
 * @swagger
 * /api/v1/adherence/aggregate:
 *   get:
 *     summary: Ambil statistik aggregate adherence untuk admin
 *     tags: [Adherence]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [7d, 14d, 30d, 90d, 1y, all]
 *           default: all
 *     responses:
 *       200:
 *         description: Statistik aggregate berhasil diambil
 *       403:
 *         description: Hanya admin yang dapat melihat statistik aggregate
 */
router.get("/aggregate", authorizeRoles("admin", "super_admin"), adherenceController.getAggregateAdherence);

/**
 * @swagger
 * /api/v1/adherence:
 *   get:
 *     summary: Ambil statistik adherence pasien
 *     tags: [Adherence]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: patient_id
 *         schema:
 *           type: string
 *       - in: query
 *         name: nurse_id
 *         schema:
 *           type: string
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [7d, 14d, 30d, 90d, 1y, all]
 *     responses:
 *       200:
 *         description: Statistik adherence berhasil diambil
 */
router.get("/", authorizeRoles("patient", "nurse", "admin"), adherenceController.getAdherence);

export default router;
