import { Router } from "express";
import * as auditLogController from "../controllers/audit-log.controller";
import { authenticateToken, authorizeRoles } from "../middleware/auth.middleware";

const router = Router();

router.use(authenticateToken);

/**
 * @swagger
 * tags:
 *   name: Audit Logs
 *   description: Riwayat akses dan perubahan data untuk admin
 */

/**
 * @swagger
 * /api/audit-logs:
 *   get:
 *     summary: Ambil riwayat audit log
 *     tags: [Audit Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: user_id
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *           example: patient.updated
 *       - in: query
 *         name: resource_type
 *         schema:
 *           type: string
 *           example: patient
 *       - in: query
 *         name: resource_id
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: date
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
 *         description: Audit log berhasil diambil
 *       403:
 *         description: Hanya admin yang dapat melihat audit log
 */
router.get("/", authorizeRoles("admin"), auditLogController.listAuditLogs);

export default router;
