import { Router } from "express";
import { streamActivityEvents } from "../controllers/activity-event.controller";
import { authenticateToken, authorizeRoles } from "../middleware/auth.middleware";

const router = Router();

/**
 * @swagger
 * /api/v1/activity-events:
 *   get:
 *     summary: Stream perubahan log aktivitas realtime untuk badge nurse/patient
 *     description: |
 *       Membuka koneksi Server-Sent Events (SSE). Client menerima event `activity:changed`
 *       saat jumlah log aktivitas berpotensi berubah, lalu client dapat memuat ulang badge/log aktivitas.
 *     tags: [Activity Events]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Koneksi SSE berhasil dibuat.
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 *               example: |
 *                 event: activity:connected
 *                 data: {"userId":"uuid","role":"nurse","createdAt":"2026-05-28T00:00:00.000Z"}
 *
 *                 event: activity:changed
 *                 data: {"reason":"audit-log-created","createdAt":"2026-05-28T00:00:05.000Z"}
 *       401:
 *         description: Tidak terautentikasi
 *       403:
 *         description: Hanya role patient dan nurse yang boleh membuka stream ini
 */
router.get("/", authenticateToken, authorizeRoles("patient", "nurse"), streamActivityEvents);

export default router;
