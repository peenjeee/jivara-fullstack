import { Router } from "express";
import * as notificationController from "../controllers/notification.controller";
import { authenticateToken, authorizeRoles } from "../middleware/auth.middleware";
import { validatePreference, validateSendNotification, validateSubscribe, validateTrackNotificationEvent, validateUserNotificationPreference, validateUserSubscribe } from "../validators/notification.validator";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: Web Push subscription dan push notification PWA
 */

/**
 * @swagger
 * /api/v1/notifications/public-key:
 *   get:
 *     summary: Ambil VAPID public key untuk Push API browser
 *     tags: [Notifications]
 *     security: []
 *     responses:
 *       200:
 *         description: Public key berhasil diambil
 *       500:
 *         description: VAPID public key belum dikonfigurasi
 */
router.get("/public-key", notificationController.getPublicKey);

/**
 * @swagger
 * /api/v1/notifications/events:
 *   post:
 *     summary: Catat event klik/open notifikasi Web Push
 *     tags: [Notifications]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - notificationId
 *               - eventType
 *             properties:
 *               notificationId:
 *                 type: string
 *                 format: uuid
 *               eventType:
 *                 type: string
 *                 enum: [opened, clicked]
 *     responses:
 *       200:
 *         description: Event notifikasi berhasil dicatat
 */
router.post("/events", validateTrackNotificationEvent, notificationController.trackEvent);

router.use(authenticateToken);

/**
 * @swagger
 * /api/v1/notifications:
 *   get:
 *     summary: Ambil riwayat notifikasi
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: patient_id
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: nurse_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter notifikasi berdasarkan pasien aktif yang ditangani perawat.
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *       - in: query
 *         name: activity_category
 *         schema:
 *           type: string
 *           enum: [reminder, adherence, food_scan, administration]
 *         description: Filter kategori aktivitas UI untuk riwayat notifikasi.
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [success, warning, critical]
 *         description: Filter level notifikasi. Nilai success mencakup notifikasi non-warning/non-critical.
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Cari berdasarkan judul, isi, tipe, atau ID pasien.
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, delivered, failed, skipped]
 *         description: Filter status pengiriman notifikasi.
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
 *         description: Riwayat notifikasi berhasil diambil
 *       401:
 *         description: Tidak terautentikasi
 */
router.get("/", authorizeRoles("patient", "nurse", "admin"), notificationController.listNotifications);

/**
 * @swagger
 * /api/v1/notifications/analytics:
 *   get:
 *     summary: Ambil analitik performa notifikasi
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: patient_id
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Analitik notifikasi berhasil diambil
 */
router.get("/analytics", authorizeRoles("patient", "nurse", "admin"), notificationController.getAnalytics);

/**
 * @swagger
 * /api/v1/notifications/preferences:
 *   get:
 *     summary: Ambil status preferensi push notification pasien
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: patient_id
 *         required: false
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Opsional untuk role patient; jika kosong, API memakai pasien dari token login.
 *     responses:
 *       200:
 *         description: Preferensi notifikasi berhasil diambil
 */
router.get("/preferences", authorizeRoles("patient"), notificationController.getPreference);

router.get("/user-preferences", authorizeRoles("admin", "super_admin", "nurse"), notificationController.getUserPreference);
router.patch("/user-preferences", authorizeRoles("admin", "super_admin", "nurse"), validateUserNotificationPreference, notificationController.updateUserPreference);

/**
 * @swagger
 * /api/v1/notifications/subscribe:
 *   post:
 *     summary: Daftarkan device pasien untuk Web Push
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - subscription
 *             properties:
 *               patientId:
 *                 type: string
 *                 format: uuid
 *                 description: Opsional untuk role patient; jika kosong, API memakai pasien dari token login.
 *               subscription:
 *                 type: object
 *                 required:
 *                   - endpoint
 *                   - keys
 *                 properties:
 *                   endpoint:
 *                     type: string
 *                     format: uri
 *                   keys:
 *                     type: object
 *                     required:
 *                       - p256dh
 *                       - auth
 *                     properties:
 *                       p256dh:
 *                         type: string
 *                       auth:
 *                         type: string
 *     responses:
 *       201:
 *         description: Subscription berhasil disimpan
 *       400:
 *         description: Payload subscription tidak valid
 *       403:
 *         description: Tidak boleh mengakses pasien ini
 */
router.post("/subscribe", authorizeRoles("patient"), validateSubscribe, notificationController.subscribe);

router.post("/user-subscribe", authorizeRoles("admin", "super_admin", "nurse"), validateUserSubscribe, notificationController.subscribeUser);

/**
 * @swagger
 * /api/v1/notifications/preferences:
 *   patch:
 *     summary: Aktifkan atau nonaktifkan push notification pasien
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - enabled
 *             properties:
 *               patientId:
 *                 type: string
 *                 format: uuid
 *                 description: Opsional untuk role patient; jika kosong, API memakai pasien dari token login.
 *               enabled:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Preferensi notifikasi diperbarui
 *       400:
 *         description: Payload tidak valid
 */
router.patch("/preferences", authorizeRoles("patient"), validatePreference, notificationController.updatePreference);

/**
 * @swagger
 * /api/v1/notifications/send:
 *   post:
 *     summary: Kirim Web Push notification ke pasien
 *     tags: [Notifications]
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
 *               - type
 *               - title
 *               - body
 *             properties:
 *               patientId:
 *                 type: string
 *                 format: uuid
 *               type:
 *                 type: string
 *                 example: medication_reminder
 *               title:
 *                 type: string
 *                 maxLength: 120
 *               body:
 *                 type: string
 *                 maxLength: 500
 *               urgency:
 *                 type: string
 *                 enum: [normal, high, urgent, critical]
 *               data:
 *                 type: object
 *     responses:
 *       200:
 *         description: Push notification diproses
 *       400:
 *         description: Payload tidak valid
 *       403:
 *         description: Tidak boleh mengakses pasien ini
 */
router.post("/send", authorizeRoles("nurse", "admin"), validateSendNotification, notificationController.sendNotification);

export default router;
