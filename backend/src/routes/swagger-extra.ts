/**
 * @swagger
 * tags:
 *   name: Public
 *   description: Endpoint publik tanpa autentikasi
 */

/**
 * @swagger
 * /api/v1/public/stats:
 *   get:
 *     summary: Ambil statistik publik landing page
 *     tags: [Public]
 *     security: []
 *     responses:
 *       200:
 *         description: Statistik publik berhasil diambil
 */

/**
 * @swagger
 * /api/v1/auth/admin-approvals:
 *   get:
 *     summary: Ambil daftar pengajuan admin
 *     tags: [Auth]
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
 *           enum: [all, pending, active, rejected, suspended]
 *     responses:
 *       200:
 *         description: Daftar pengajuan admin berhasil diambil
 *       403:
 *         description: Hanya super admin yang dapat mengakses endpoint ini
 */

/**
 * @swagger
 * /api/v1/auth/admin-approvals/{id}/approve:
 *   post:
 *     summary: Setujui pengajuan admin
 *     tags: [Auth]
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
 *         description: Pengajuan admin berhasil disetujui
 */

/**
 * @swagger
 * /api/v1/auth/admin-approvals/{id}/reject:
 *   post:
 *     summary: Tolak pengajuan admin
 *     tags: [Auth]
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
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Pengajuan admin berhasil ditolak
 */

/**
 * @swagger
 * /api/v1/auth/admin-approvals/{id}/activate:
 *   post:
 *     summary: Aktifkan kembali admin yang disuspend
 *     tags: [Auth]
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
 *         description: Admin berhasil diaktifkan kembali
 */

/**
 * @swagger
 * /api/v1/auth/admin-approvals/{id}/restore:
 *   post:
 *     summary: Pulihkan pengajuan admin yang ditolak
 *     tags: [Auth]
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
 *         description: Pengajuan admin berhasil dipulihkan
 */

/**
 * @swagger
 * /api/v1/auth/admin-approvals/{id}/suspend:
 *   post:
 *     summary: Suspend admin aktif
 *     tags: [Auth]
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
 *         description: Admin berhasil disuspend
 */

/**
 * @swagger
 * /api/v1/auth/status:
 *   post:
 *     summary: Cek status akun dari refresh token
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refresh_token:
 *                 type: string
 *                 description: Refresh token dari login
 *     responses:
 *       200:
 *         description: Status akun berhasil diambil
 */

/**
 * @swagger
 * /api/v1/notifications/user-preferences:
 *   get:
 *     summary: Ambil preferensi notifikasi pengguna saat ini
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *           enum: [admin_critical_activity, super_admin_approval, nurse_critical_alert]
 *     responses:
 *       200:
 *         description: Preferensi notifikasi pengguna berhasil diambil
 */

/**
 * @swagger
 * /api/v1/notifications/user-preferences:
 *   patch:
 *     summary: Perbarui preferensi notifikasi pengguna saat ini
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               key:
 *                 type: string
 *                 enum: [admin_critical_activity, super_admin_approval, nurse_critical_alert]
 *               enabled:
 *                 type: boolean
 *               criticalAlert:
 *                 type: boolean
 *               medicationReminder:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Preferensi notifikasi pengguna berhasil diperbarui
 */

/**
 * @swagger
 * /api/v1/medication-logs/snooze:
 *   post:
 *     summary: Tunda reminder obat pasien
 *     tags: [Medication Logs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - scheduleId
 *             properties:
 *               scheduleId:
 *                 type: string
 *                 format: uuid
 *               snoozeMinutes:
 *                 type: integer
 *                 example: 10
 *     responses:
 *       200:
 *         description: Reminder obat berhasil ditunda
 */

export {};
