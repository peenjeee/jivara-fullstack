import { NextFunction, Request, Response, Router } from "express";
import * as foodAiController from "../controllers/food-ai.controller";
import { authenticateToken, authorizeRoles } from "../middleware/auth.middleware";
import { uploadSingleFoodImage } from "../middleware/upload.middleware";
import {
  validateFoodDetect,
  validateFoodRecommendations,
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
 *     description: Mengembalikan scan yang sudah selesai dianalisis. Scan upload/deteksi yang gagal atau masih pending tidak ditampilkan di log aktivitas.
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
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter satu tanggal dibuat berdasarkan zona waktu aplikasi (Asia/Jakarta). Untuk range gunakan start_date dan end_date.
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Tanggal awal berdasarkan zona waktu aplikasi (Asia/Jakarta).
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Tanggal akhir berdasarkan zona waktu aplikasi (Asia/Jakarta).
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
 *                 description: URL gambar harus berasal dari `/uploads/food-scans/...` atau host storage Jivara yang dikonfigurasi.
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
 *       Backend mengambil gambar dari URL Supabase Storage pada scan, lalu memanggil endpoint
 *       YOLO/inference (`FOOD_AI_INFERENCE_URL`, default Jivara AI `/detect`) sebagai
 *       `multipart/form-data` dengan field `file`.
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
 *     summary: Buat hasil analisis interaksi obat-makanan untuk scan
 *     description: |
 *       Mengambil label makanan hasil YOLO dari request, mengambil obat aktif pasien dari database,
 *       lalu backend memanggil AI reasoning service (`FOOD_REASONING_API_URL`) ke `/interaction-check`
 *       untuk setiap makanan. Secara default endpoint ini juga memanggil `/recommend` untuk kompatibilitas
 *       client lama, tetapi client baru dapat mengirim `includeRecommendations: false` lalu memanggil
 *       `/api/v1/food-scans/{scanId}/recommendations` agar request rekomendasi terlihat eksplisit.
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
 *               includeRecommendations:
 *                 type: boolean
 *                 default: true
 *                 description: Jika false, endpoint ini hanya menjalankan `/interaction-check` dan tidak memanggil AI `/recommend`.
 *           example:
 *             patientId: d2945f3f-d09c-4d9f-8ed2-1b9914328746
 *             detectedItems: ["tumis-kangkung"]
 *             includeRecommendations: false
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
 *                 disclaimer: Ini bukan nasihat medis. Selalu konsultasikan dengan dokter atau apoteker Anda.
 */
router.post("/food-scans/:scanId/interactions", authorizeRoles("patient", "nurse", "admin"), attachScanIdParam, validateInteractionCheck, foodAiController.checkInteraction);

/**
 * @swagger
 * /api/v1/food-scans/{scanId}/recommendations:
 *   post:
 *     summary: Buat rekomendasi makanan aman untuk scan
 *     description: |
 *       Mengambil obat aktif pasien dari database, lalu backend memanggil AI reasoning service
 *       (`FOOD_REASONING_API_URL`) ke endpoint `/recommend` dengan payload
 *       `{ patient_medications, top_n }`. Frontend mengirim `topN: 100` agar seluruh hasil
 *       rekomendasi yang tersedia dari AI ikut ditampilkan. Endpoint ini tidak memanggil root,
 *       health, atau alert dari AI service.
 *       Backend memisahkan hasil rekomendasi berdasarkan risiko: `aman` dan `ringan` masuk
 *       `recommended_foods`, sedangkan `sedang`, `tinggi`, dan `kritis` masuk `foods_to_avoid`.
 *       Hasil rekomendasi juga disimpan sebagai snapshot pada scan agar detail scan dapat
 *       menampilkan rekomendasi yang sama tanpa memanggil AI ulang saat modal dibuka.
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
 *               topN:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 100
 *                 default: 100
 *                 description: Jumlah rekomendasi yang diteruskan sebagai `top_n` ke AI `/recommend`.
 *           example:
 *             patientId: d2945f3f-d09c-4d9f-8ed2-1b9914328746
 *             topN: 100
 *     responses:
 *       200:
 *         description: Rekomendasi makanan aman berhasil dibuat
 *         content:
 *           application/json:
 *             example:
 *               status: berhasil
 *               data:
 *                 patient_medications: ["WARFARIN"]
 *                 analyzed_medications_count: 1
 *                 recommended_foods:
 *                   - food_name: apel
 *                     severity_score: 0
 *                     risk_level: aman
 *                     worst_category: null
 *                 foods_to_avoid:
 *                   - food_name: soerabi
 *                     severity_score: 2
 *                     risk_level: sedang
 *                     worst_category: diabetes
 *                 recommendation_summary:
 *                   safe: 5
 *                   avoid: 2
 *                 matched_medication_categories:
 *                   WARFARIN: ["antikoagulan"]
 */
router.post("/food-scans/:scanId/recommendations", authorizeRoles("patient", "nurse", "admin"), attachScanIdParam, validateFoodRecommendations, foodAiController.recommendFoods);

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
