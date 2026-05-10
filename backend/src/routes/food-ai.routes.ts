import { NextFunction, Request, Response, Router } from "express";
import * as foodAiController from "../controllers/food-ai.controller";
import { authenticateToken, authorizeRoles } from "../middleware/auth.middleware";
import { uploadSingleFoodImage } from "../middleware/upload.middleware";
import {
  validateFoodDetect,
  validateFoodUpload,
  validateInteractionCheck,
  validateNutrition,
} from "../validators/food-ai.validator";

const router = Router();

router.use(authenticateToken);

const attachScanIdParam = (req: Request, _res: Response, next: NextFunction) => {
  req.body = { ...req.body, scanId: req.params.scanId, imageId: req.params.scanId };
  next();
};

/**
 * @swagger
 * tags:
 *   name: Food AI
 *   description: Mock AI food detection, interaction check, dan nutrition insight
 */

router.get("/food-scans", authorizeRoles("patient", "nurse", "admin"), foodAiController.listFoodScans);

/**
 * @swagger
 * /api/food-scans/analytics/interactions:
 *   get:
 *     summary: Ambil analitik agregat interaksi makanan-obat
 *     tags: [Food AI]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Analitik interaksi berhasil diambil
 *       403:
 *         description: Role tidak memiliki akses
 */
router.get("/food-scans/analytics/interactions", authorizeRoles("nurse", "admin"), foodAiController.getInteractionAnalytics);
router.get("/food-scans/:scanId", authorizeRoles("patient", "nurse", "admin"), foodAiController.getFoodScan);

/**
 * @swagger
 * /api/food-scans:
 *   post:
 *     summary: Buat data scan makanan dari foto
 *     tags: [Food AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - patientId
 *               - image
 *             properties:
 *               patientId:
 *                 type: string
 *                 format: uuid
 *               image:
 *                 type: string
 *                 format: binary
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - patientId
 *               - imageUrl
 *             properties:
 *               patientId:
 *                 type: string
 *                 format: uuid
 *               imageUrl:
 *                 type: string
 *               imageSizeKb:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Foto makanan berhasil direkam
 *       400:
 *         description: Payload atau file gambar tidak valid
 */
router.post("/food-scans", authorizeRoles("patient", "nurse", "admin"), uploadSingleFoodImage, validateFoodUpload, foodAiController.uploadFoodImage);

/**
 * @swagger
 * /api/food-scans/{scanId}/detections:
 *   post:
 *     summary: Buat hasil deteksi makanan untuk scan
 *     tags: [Food AI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: scanId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Deteksi makanan berhasil
 */
router.post("/food-scans/:scanId/detections", authorizeRoles("patient", "nurse", "admin"), attachScanIdParam, validateFoodDetect, foodAiController.detectFood);

/**
 * @swagger
 * /api/food-scans/{scanId}/interactions:
 *   post:
 *     summary: Buat hasil analisis interaksi obat-makanan untuk scan
 *     tags: [Food AI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: scanId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Hasil interaksi berhasil dibuat
 */
router.post("/food-scans/:scanId/interactions", authorizeRoles("patient", "nurse", "admin"), attachScanIdParam, validateInteractionCheck, foodAiController.checkInteraction);

/**
 * @swagger
 * /api/nutrition-estimates:
 *   post:
 *     summary: Buat estimasi nutrisi dari makanan terdeteksi
 *     tags: [Food AI]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estimasi nutrisi berhasil dibuat
 */
router.post("/nutrition-estimates", authorizeRoles("patient", "nurse", "admin"), validateNutrition, foodAiController.estimateNutrition);

export default router;
