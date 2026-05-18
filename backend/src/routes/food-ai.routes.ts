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
 *   description: AI food detection, interaction check, dan nutrition insight
 */

/**
 * @swagger
 * /api/v1/food-scans:
 *   get:
 *     summary: Ambil daftar scan makanan
 *     tags: [Food AI]
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
 *           default: 20
 *           maximum: 100
 *       - in: query
 *         name: patient_id
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Daftar scan makanan berhasil diambil
 */
router.get("/food-scans", authorizeRoles("patient", "nurse", "admin"), foodAiController.listFoodScans);

router.get("/food-scans/:scanId", authorizeRoles("patient", "nurse", "admin"), foodAiController.getFoodScan);

/**
 * @swagger
 * /api/v1/food-scans:
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
 * /api/v1/food-scans/{scanId}/detections:
 *   post:
 *     summary: Buat hasil deteksi makanan untuk scan
 *     description: |
 *       Backend akan memanggil endpoint YOLO/inference (`FOOD_AI_INFERENCE_URL`) dengan payload
 *       `scanId`, `patientId`, dan `imageUrl` publik hasil upload pasien.
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - patientId
 *             properties:
 *               patientId:
 *                 type: string
 *                 format: uuid
 *           example:
 *             patientId: d2945f3f-d09c-4d9f-8ed2-1b9914328746
 *     responses:
 *       200:
 *         description: Deteksi makanan berhasil
 *         content:
 *           application/json:
 *             example:
 *               status: berhasil
 *               data:
 *                 scan_id: d2945f3f-d09c-4d9f-8ed2-1b9914328746
 *                 detected_items:
 *                   - label: rendang
 *                     label_display: Rendang
 *                     confidence: 0.94
 *                     bounding_box:
 *                       x: 120
 *                       y: 80
 *                       width: 200
 *                       height: 180
 *                 low_confidence_items: []
 *                 inference_time_ms: 320
 *                 model_version: yolov11-food-v1
 */
router.post("/food-scans/:scanId/detections", authorizeRoles("patient", "nurse", "admin"), attachScanIdParam, validateFoodDetect, foodAiController.detectFood);

/**
 * @swagger
 * /api/v1/food-scans/{scanId}/interactions:
 *   post:
 *     summary: Buat hasil analisis interaksi obat-makanan dan rekomendasi wajib untuk scan
 *     description: |
 *       Mengambil label makanan hasil YOLO dari request, mengambil obat aktif pasien dari database,
 *       lalu backend memanggil AI reasoning service (`FOOD_REASONING_API_URL`) ke `/interaction-check`
 *       untuk setiap makanan dan wajib memanggil `/recommend` untuk rekomendasi makanan aman.
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - patientId
 *               - detectedItems
 *             properties:
 *               patientId:
 *                 type: string
 *                 format: uuid
 *               detectedItems:
 *                 type: array
 *                 description: Label makanan hasil YOLO yang akan diteruskan sebagai `yolo_class` ke AI reasoning.
 *                 items:
 *                   type: string
 *           example:
 *             patientId: d2945f3f-d09c-4d9f-8ed2-1b9914328746
 *             detectedItems: ["tumis-kangkung"]
 *     responses:
 *       200:
 *         description: Hasil interaksi dan rekomendasi AI berhasil dibuat
 *         content:
 *           application/json:
 *             example:
 *               status: berhasil
 *               data:
 *                 interactions:
 *                   - food_item: tumis-kangkung
 *                     food_display: tumis kangkung
 *                     medication: WARFARIN
 *                     severity: tinggi
 *                     severity_label: tinggi
 *                     interaction_description: Kangkung mengandung Vitamin K yang dapat memengaruhi terapi Warfarin.
 *                     recommendation: "Alternatif aman: apel, bika-ambon, burger."
 *                 patient_medications: ["WARFARIN"]
 *                 analyzed_medications_count: 1
 *                 safe_items:
 *                   - food_item: rendang
 *                     food_display: rendang
 *                     status: aman
 *                 recommended_foods:
 *                   - food_name: apel
 *                     severity_score: 0
 *                     risk_level: aman
 *                     worst_category: null
 *                 foods_to_avoid:
 *                   - food_name: tumis-kangkung
 *                     severity_score: 5
 *                     risk_level: tinggi
 *                     worst_category: antikoagulan
 *                 overall_risk_score: 5
 *                 overall_risk_level: tinggi
 *                 overall_recommendation: Ditemukan potensi interaksi obat-makanan. Ikuti alternatif makanan aman dari rekomendasi AI.
 */
router.post("/food-scans/:scanId/interactions", authorizeRoles("patient", "nurse", "admin"), attachScanIdParam, validateInteractionCheck, foodAiController.checkInteraction);

/**
 * @swagger
 * /api/v1/nutrition-estimates:
 *   post:
 *     summary: Buat estimasi nutrisi dari makanan terdeteksi
 *     description: Memanggil AI reasoning service `/nutrition` untuk setiap label makanan hasil YOLO.
 *     tags: [Food AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - detectedItems
 *             properties:
 *               detectedItems:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - label
 *                   properties:
 *                     label:
 *                       type: string
 *                       description: Label makanan dari YOLO, misalnya `rendang`.
 *                     confidence:
 *                       type: number
 *                     portionGrams:
 *                       type: number
 *                       default: 100
 *           example:
 *             detectedItems:
 *               - label: rendang
 *                 confidence: 0.88
 *                 portionGrams: 150
 *     responses:
 *       200:
 *         description: Estimasi nutrisi berhasil dibuat
 *         content:
 *           application/json:
 *             example:
 *               status: berhasil
 *               data:
 *                 items:
 *                   - food_item: rendang
 *                     food_display: Rendang sapi masakan
 *                     portion: 100 gram
 *                     nutrition:
 *                       calories: 193
 *                       protein_g: 22.6
 *                       fat_g: 7.9
 *                       carbs_g: 7.8
 *                     source: Jivara AI Nutrition
 *                 total:
 *                   calories: 193
 *                   protein_g: 22.6
 *                   fat_g: 7.9
 *                   carbs_g: 7.8
 */
router.post("/nutrition-estimates", authorizeRoles("patient", "nurse", "admin"), validateNutrition, foodAiController.estimateNutrition);

export default router;
