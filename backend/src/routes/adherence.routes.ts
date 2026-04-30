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
 * /api/adherence:
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
 *           enum: [7d, 30d, 90d]
 *     responses:
 *       200:
 *         description: Statistik adherence berhasil diambil
 */
router.get("/", authorizeRoles("nurse", "admin"), adherenceController.getAdherence);

export default router;
