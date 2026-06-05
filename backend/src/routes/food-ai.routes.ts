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
 *   description: |
 *     Flow scan makanan Jivara: upload foto, deteksi YOLO, Jivara Interaction Check
 *     per makanan x obat, reasoning OpenRouter di backend, dan estimasi nutrisi.
 */

/**
 * @swagger
 * /api/v1/food-scans:
 *   get:
 *     summary: Ambil daftar scan makanan
 *     description: |
 *       Mengembalikan scan yang sudah selesai dianalisis. Scan upload/deteksi yang gagal
 *       atau masih pending tidak ditampilkan di log aktivitas.
 *       Setiap item menyertakan `overallRecommendation` dari snapshot rekomendasi AI
 *       keseluruhan bila tersedia, dengan fallback ringkas dari `overallRiskLevel` untuk data lama.
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
 *         content:
 *           application/json:
 *             example:
 *               status: berhasil
 *               data:
 *                 - id: d2945f3f-d09c-4d9f-8ed2-1b9914328746
 *                   patientId: 2b709cd0-d34c-4a45-9962-d5810202f51e
 *                   imageUrl: /uploads/food-scans/food.jpg
 *                   imageSizeKb: 450
 *                   inferenceTimeMs: 7218
 *                   modelVersion: jivara-food-detection-hf
 *                   overallRiskScore: 2.5
 *                   overallRiskLevel: sedang
 *                   overallRecommendation: Secara keseluruhan, nasi goreng dengan CELESTAR perlu diperhatikan karena terdeteksi potensi interaksi ringan sampai sedang. Tetap ikuti jadwal obat dan konsultasikan dengan dokter atau apoteker jika ada keluhan.
 *                   createdAt: 2026-06-05T05:39:22.615Z
 *               meta:
 *                 page: 1
 *                 limit: 20
 *                 total: 1
 */
router.get("/food-scans", authorizeRoles("patient", "nurse", "admin"), foodAiController.listFoodScans);

/**
 * @swagger
 * /api/v1/food-scans/{scanId}:
 *   get:
 *     summary: Ambil detail scan makanan
 *     description: |
 *       Mengambil detail scan makanan beserta item deteksi YOLO, hasil analisis interaksi
 *       makanan x obat yang tersimpan, rekomendasi keseluruhan AI, rekomendasi makanan dari
 *       Jivara Interaction Check, dan snapshot estimasi nutrisi. Endpoint ini tidak memanggil
 *       AI ulang; semua data berasal dari snapshot scan dan interaksi yang sudah tersimpan.
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
 *         description: Detail scan makanan berhasil diambil
 *         content:
 *           application/json:
 *             example:
 *               status: berhasil
 *               data:
 *                 id: d2945f3f-d09c-4d9f-8ed2-1b9914328746
 *                 patientId: 2b709cd0-d34c-4a45-9962-d5810202f51e
 *                 imageUrl: /uploads/food-scans/food.jpg
 *                 inferenceTimeMs: 7218
 *                 modelVersion: jivara-food-detection-hf
 *                 overallRiskScore: 2.5
 *                 overallRiskLevel: sedang
 *                 overallRecommendation: Secara keseluruhan, nasi goreng dengan CELESTAR perlu diperhatikan karena terdeteksi potensi interaksi ringan sampai sedang. Tetap ikuti jadwal obat dan konsultasikan dengan dokter atau apoteker jika ada keluhan.
 *                 detectedItems:
 *                   - label: nasi-goreng
 *                     labelDisplay: Nasi Goreng
 *                     confidence: 0.94
 *                 interactions:
 *                   - foodItem: nasi-goreng
 *                     medication: CELESTAR
 *                     severity: sedang
 *                     interactionDescription: Nasi goreng dengan CELESTAR terdeteksi memiliki potensi interaksi sedang berdasarkan Jivara Interaction Check.
 *                     recommendation: ""
 *                     sources: ["Jivara Interaction Check", "OpenRouter openai/gpt-oss-120b:free"]
 *                 recommendedFoods: []
 *                 foodsToAvoid: []
 *                 recommendationSummary:
 *                   safe: 0
 *                   avoid: 0
 *                 nutritionItems:
 *                   - food_item: nasi-goreng
 *                     food_display: Nasi Goreng
 *                     portion: 100 gram
 *                     nutrition:
 *                       calories: 276
 *                       protein_g: 3.2
 *                       fat_g: 3.2
 *                       carbs_g: 30.2
 *                     source: Jivara Nutrition
 *                 disclaimer: Ini bukan nasihat medis. Selalu konsultasikan dengan dokter atau apoteker Anda.
 */
router.get("/food-scans/:scanId", authorizeRoles("patient", "nurse", "admin"), foodAiController.getFoodScan);

/**
 * @swagger
 * /api/v1/food-scans:
 *   post:
 *     summary: Buat data scan makanan dari foto
 *     description: |
 *       Merekam foto scan makanan dan mengembalikan `image_id` untuk dipakai pada langkah
 *       berikutnya. Endpoint ini hanya upload/registrasi gambar; deteksi makanan, analisis
 *       interaksi, dan estimasi nutrisi dijalankan oleh endpoint terpisah.
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
 *         content:
 *           application/json:
 *             example:
 *               status: berhasil
 *               data:
 *                 image_id: d2945f3f-d09c-4d9f-8ed2-1b9914328746
 *                 upload_url: /uploads/food-scans/food-1717578000000.jpg
 *                 image_size_kb: 450
 *                 timestamp: 2026-06-05T05:39:22.615Z
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
 *       YOLO/inference (`FOOD_AI_INFERENCE_URL`, default Jivara Food Detection `/detect`)
 *       sebagai `multipart/form-data` dengan field `file`. Hasil deteksi disimpan ke tabel
 *       `detected_items`; reasoning interaksi tidak dibuat pada endpoint ini.
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
 *                       x1: 97
 *                       y1: 212
 *                       x2: 818
 *                       y2: 1006
 *                       imageWidth: 1402
 *                       imageHeight: 1122
 *                 low_confidence_items: []
 *                 inference_time_ms: 320
 *                 model_version: jivara-food-detection-hf
 */
router.post("/food-scans/:scanId/detections", authorizeRoles("patient", "nurse", "admin"), attachScanIdParam, validateFoodDetect, foodAiController.detectFood);

/**
 * @swagger
 * /api/v1/food-scans/{scanId}/interactions:
 *   post:
 *     summary: Buat hasil analisis interaksi obat-makanan untuk scan
 *     description: |
 *       Mengambil label makanan hasil YOLO dari request, mengambil obat aktif pasien dari database,
 *       lalu backend memanggil layanan Jivara reasoning (`FOOD_REASONING_API_URL`) ke `/interaction-check`
 *       untuk setiap pasangan makanan x obat dengan payload `{ yolo_class, patient_medications: [obat] }`.
 *       Narasi `interaction_description` dibuat di backend via OpenRouter (`OPENROUTER_REASONING_MODEL`,
 *       default `moonshotai/kimi-k2.6:free`, fallback `OPENROUTER_REASONING_FALLBACK_MODELS`)
 *       berdasarkan response `/interaction-check`, bukan dari YOLO.
 *       Setelah seluruh narasi pasangan selesai, `overall_recommendation` juga dibuat via OpenRouter
 *       dari semua `interaction_description` pasangan makanan x obat dan disimpan sebagai snapshot scan.
 *       Rekomendasi makanan pada response ini hanya berasal dari `recommended_foods` milik
 *       `/interaction-check`; jika response AI tidak mengirim rekomendasi, field rekomendasi pasangan
 *       dikembalikan kosong agar client tidak menampilkan blok rekomendasi.
 *       Jika AI reasoning gagal untuk salah satu label makanan, backend tetap mengembalikan hasil scan
 *       dengan fallback teks lokal untuk label tersebut agar upload tidak gagal total.
 *       Response `interactions` berisi seluruh pasangan makanan terdeteksi x obat aktif pasien, termasuk
 *       pasangan aman/ringan/sedang. Level `sedang` tetap dikembalikan untuk penjelasan AI dan
 *       rekomendasi keseluruhan, tetapi label UI `High Risk` hanya dipakai untuk level `tinggi`,
 *       `kritis`, `high`, `high risk`, atau `critical`.
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
 *                 deprecated: true
 *                 description: Legacy flag. Nilai ini diabaikan; endpoint ini tidak lagi memanggil AI `/recommend`. Rekomendasi diambil dari `recommended_foods` pada response `/interaction-check`.
 *           example:
 *             patientId: d2945f3f-d09c-4d9f-8ed2-1b9914328746
 *             detectedItems: ["tumis-kangkung"]
 *             includeRecommendations: false
 *     responses:
 *       200:
 *         description: Hasil interaksi, reasoning per pasangan, rekomendasi keseluruhan AI, dan snapshot rekomendasi berhasil dibuat
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
 *                     interaction_description: Tumis kangkung dengan WARFARIN berisiko tinggi karena dapat memengaruhi efek pengencer darah berdasarkan kategori antikoagulan.
 *                     recommendation: "Alternatif makanan aman dari Jivara Interaction Check: biskuit choco chips, stroberi, es dawet."
 *                     sources: ["Jivara Interaction Check", "OpenRouter moonshotai/kimi-k2.6:free"]
 *                 patient_medications: ["WARFARIN"]
 *                 analyzed_medications_count: 1
 *                 safe_items:
 *                   - food_item: rendang
 *                     food_display: rendang
 *                     status: aman
 *                 recommended_foods:
 *                   - food_name: biskuit-choco-chips
 *                     severity_score: 0.51
 *                     risk_level: aman
 *                     worst_category: antikoagulan
 *                 foods_to_avoid: []
 *                 overall_risk_score: 4.3
 *                 overall_risk_level: tinggi
 *                 overall_recommendation: Secara keseluruhan, tumis kangkung dengan WARFARIN perlu dihindari atau dikonsultasikan lebih dulu karena berpotensi mengganggu efek pengencer darah. Pilih alternatif yang direkomendasikan Jivara Interaction Check bila tersedia, tetap ikuti jadwal obat, dan hubungi dokter atau apoteker jika muncul keluhan setelah makan.
 *                 disclaimer: Ini bukan nasihat medis. Selalu konsultasikan dengan dokter atau apoteker Anda.
 */
router.post("/food-scans/:scanId/interactions", authorizeRoles("patient", "nurse", "admin"), attachScanIdParam, validateInteractionCheck, foodAiController.checkInteraction);

// Legacy compatibility route for older clients. The current scan flow takes recommendations
// from `/interaction-check`, so this route is intentionally not documented in Swagger.
router.post("/food-scans/:scanId/recommendations", authorizeRoles("patient", "nurse", "admin"), attachScanIdParam, validateFoodRecommendations, foodAiController.recommendFoods);

/**
 * @swagger
 * /api/v1/nutrition-estimates:
 *   post:
 *     summary: Buat estimasi nutrisi dari makanan terdeteksi
 *     description: |
 *       Memanggil layanan Jivara reasoning `/nutrition` untuk setiap label makanan hasil YOLO.
 *       Frontend scan terbaru tetap memakai endpoint ini setelah deteksi dan interaction check.
 *       Jika `portionGrams` tidak dikirim, backend memakai estimasi per 100 gram; jika `scanId`
 *       dikirim, hasil nutrisi disimpan sebagai snapshot pada scan untuk modal detail.
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
 *               scanId:
 *                 type: string
 *                 format: uuid
 *                 description: Opsional. Jika dikirim, snapshot nutrisi disimpan pada scan.
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
 *                       description: Gram porsi estimasi. Default 100 gram.
 *           example:
 *             scanId: d2945f3f-d09c-4d9f-8ed2-1b9914328746
 *             detectedItems:
 *               - label: rendang
 *                 confidence: 0.88
 *                 portionGrams: 100
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
 *                     source: Jivara Nutrition
 *                 total:
 *                   calories: 193
 *                   protein_g: 22.6
 *                   fat_g: 7.9
 *                   carbs_g: 7.8
 */
router.post("/nutrition-estimates", authorizeRoles("patient", "nurse", "admin"), validateNutrition, foodAiController.estimateNutrition);

export default router;
