import { Router } from "express";
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

/**
 * @swagger
 * tags:
 *   name: Food AI
 *   description: Mock AI food detection, interaction check, dan nutrition insight
 */

/**
 * @swagger
 * /api/food/upload:
 *   post:
 *     summary: Upload foto makanan
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
router.post("/food/upload", authorizeRoles("patient", "nurse", "admin"), uploadSingleFoodImage, validateFoodUpload, foodAiController.uploadFoodImage);

/**
 * @swagger
 * /api/detect:
 *   post:
 *     summary: Jalankan mock YOLOv11 food detection
 *     tags: [Food AI]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Deteksi makanan berhasil
 */
router.post("/detect", authorizeRoles("patient", "nurse", "admin"), validateFoodDetect, foodAiController.detectFood);

/**
 * @swagger
 * /api/interaction-check:
 *   post:
 *     summary: Cek interaksi obat-makanan rule-based
 *     tags: [Food AI]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Hasil interaksi berhasil dibuat
 */
router.post("/interaction-check", authorizeRoles("patient", "nurse", "admin"), validateInteractionCheck, foodAiController.checkInteraction);

/**
 * @swagger
 * /api/nutrition:
 *   post:
 *     summary: Estimasi nutrisi makanan mock TKPI
 *     tags: [Food AI]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estimasi nutrisi berhasil dibuat
 */
router.post("/nutrition", authorizeRoles("patient", "nurse", "admin"), validateNutrition, foodAiController.estimateNutrition);

export default router;
