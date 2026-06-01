import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import api from "@/lib/axios";
import { getFoodScanAnalysisFromApi, getFoodScansPageFromApi, scanFoodImage } from "@/lib/foodScanApi";

vi.mock("@/lib/axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const mockedGet = api.get as Mock;
const mockedPost = api.post as Mock;

describe("foodScanApi", () => {
  beforeEach(() => {
    mockedGet.mockReset();
    mockedPost.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("uploads, detects, checks interactions, and maps analysis", async () => {
    mockedGet.mockResolvedValueOnce({ data: { data: { id: "patient-1", fullName: "Budi Santoso" } } });
    mockedPost
      .mockResolvedValueOnce({ data: { data: { image_id: "img-1", upload_url: "/uploads/img-1.jpg", timestamp: "2026-05-09T08:00:00.000Z" } } })
      .mockResolvedValueOnce({ data: { data: { scan_id: "scan-1", detected_items: [{ label: "milk", label_display: "Susu", confidence: 0.95, bounding_box: { x1: 10, y1: 20, x2: 110, y2: 220 } }], inference_time_ms: 120, model_version: "v1", timestamp: "2026-05-09T08:00:01.000Z" } } })
      .mockResolvedValueOnce({ data: { data: { interactions: [{ food_item: "milk", food_display: "Susu", medication: "Cefixime", severity: "high", severity_label: "Tinggi", interaction_description: "Susu dapat mengganggu penyerapan.", recommendation: "Beri jeda 2 jam." }], patient_medications: ["CEFIXIME"], analyzed_medications_count: 1, recommended_foods: [{ food_name: "ayam-goreng", severity_score: 0, risk_level: "aman", worst_category: null }], foods_to_avoid: [{ food_name: "susu", severity_score: 5, risk_level: "tinggi", worst_category: "antibiotik" }], overall_risk_level: "high", overall_recommendation: "Hindari konsumsi bersamaan.", disclaimer: "Konsultasikan ke tenaga kesehatan." } } })
      .mockResolvedValueOnce({ data: { data: { recommended_foods: [{ food_name: "ayam-goreng", severity_score: 0, risk_level: "aman", worst_category: null }], foods_to_avoid: [{ food_name: "susu", severity_score: 5, risk_level: "tinggi", worst_category: "antibiotik" }], patient_medications: ["CEFIXIME"], analyzed_medications_count: 1 } } })
      .mockResolvedValueOnce({ data: { data: { items: [{ food_item: "milk", food_display: "Susu", portion: "100 gram", nutrition: { calories: 60, protein_g: 3.2, fat_g: 3.3, carbs_g: 4.8 }, source: "Jivara AI Nutrition" }], total: { calories: 60, protein_g: 3.2, fat_g: 3.3, carbs_g: 4.8 } } } });

    const file = new File(["image"], "food.jpg", { type: "image/jpeg" });
    const analysis = await scanFoodImage(file);

    expect(mockedGet).toHaveBeenCalledWith("/patients/me");
    expect(mockedPost).toHaveBeenNthCalledWith(1, "/food-scans", expect.any(FormData), { headers: { "Content-Type": "multipart/form-data" } });
    expect(mockedPost).toHaveBeenNthCalledWith(2, "/food-scans/img-1/detections", { patientId: "patient-1" });
    expect(mockedPost).toHaveBeenNthCalledWith(3, "/food-scans/img-1/interactions", { patientId: "patient-1", detectedItems: ["milk"], includeRecommendations: false });
    expect(mockedPost).toHaveBeenNthCalledWith(4, "/food-scans/img-1/recommendations", { patientId: "patient-1", topN: 100 });
    expect(mockedPost).toHaveBeenNthCalledWith(5, "/nutrition-estimates", { scanId: "img-1", detectedItems: [{ label: "milk", confidence: 0.95 }] });
    expect(analysis).toMatchObject({
      overallRisk: "High Risk",
      scan: { id: "img-1", patientId: "patient-1", foodName: "Susu", risk: "High Risk", detectedItems: [{ label: "milk", labelDisplay: "Susu", confidence: 0.95, boundingBox: { x1: 10, y1: 20, x2: 110, y2: 220 } }] },
      analyzedMedicationCount: 1,
      analyzedMedications: ["CEFIXIME"],
      interactions: [expect.objectContaining({ risk: "High Risk", recommendation: "Beri jeda 2 jam." })],
      recommendedFoods: [{ foodName: "ayam-goreng", severityScore: 0, riskLevel: "aman", worstCategory: null }],
      foodsToAvoid: [{ foodName: "susu", severityScore: 5, riskLevel: "tinggi", worstCategory: "antibiotik" }],
      nutritionItems: [expect.objectContaining({ foodDisplay: "Susu", nutrition: { calories: 60, proteinG: 3.2, fatG: 3.3, carbsG: 4.8 } })],
      nutritionTotal: { calories: 60, proteinG: 3.2, fatG: 3.3, carbsG: 4.8 },
    });
  });

  it("keeps each food-medication interaction pair and deduplicates exact duplicates", async () => {
    const duplicateInteraction = {
      food_item: "rendang",
      food_display: "Rendang",
      medication: "Simvastatin",
      severity: "low",
      severity_label: "Rendah",
      interaction_description: "Kombinasi makanan dan obat ini diprediksi aman.",
      recommendation: "Pantau gejala setelah makan.",
    };
    const sameCardFromAnotherFood = {
      ...duplicateInteraction,
      food_item: "nasi-goreng",
      food_display: "Nasi Goreng",
    };
    mockedGet.mockResolvedValueOnce({ data: { data: { id: "patient-1", fullName: "Budi Santoso" } } });
    mockedPost
      .mockResolvedValueOnce({ data: { data: { image_id: "img-1", upload_url: "/uploads/img-1.jpg", timestamp: "2026-05-09T08:00:00.000Z" } } })
      .mockResolvedValueOnce({
        data: {
          data: {
            scan_id: "scan-1",
            detected_items: [
              { label: "rendang", label_display: "Rendang", confidence: 0.95 },
              { label: "rendang", label_display: "Rendang", confidence: 0.42 },
              { label: "nasi-goreng", label_display: "Nasi Goreng", confidence: 0.9 },
            ],
            inference_time_ms: 120,
            model_version: "v1",
            timestamp: "2026-05-09T08:00:01.000Z",
          },
        },
      })
      .mockResolvedValueOnce({ data: { data: { interactions: [duplicateInteraction, duplicateInteraction, sameCardFromAnotherFood], patient_medications: ["SIMVASTATIN"], analyzed_medications_count: 1, recommended_foods: [], foods_to_avoid: [], overall_risk_level: "low", overall_recommendation: "Aman.", disclaimer: "Konsultasikan ke tenaga kesehatan." } } })
      .mockResolvedValueOnce({ data: { data: { recommended_foods: [], foods_to_avoid: [], patient_medications: ["SIMVASTATIN"], analyzed_medications_count: 1 } } })
      .mockResolvedValueOnce({ data: { data: { items: [], total: { calories: 0, protein_g: 0, fat_g: 0, carbs_g: 0 } } } });

    const analysis = await scanFoodImage(new File(["image"], "food.jpg", { type: "image/jpeg" }));

    expect(mockedPost).toHaveBeenNthCalledWith(3, "/food-scans/img-1/interactions", { patientId: "patient-1", detectedItems: ["rendang", "nasi-goreng"], includeRecommendations: false });
    expect(analysis.interactions).toHaveLength(2);
    expect(analysis.schedules).toHaveLength(2);
    expect(analysis.interactions[0]?.schedule.medicineName).toBe("Simvastatin");
    expect(analysis.interactions.map((interaction) => interaction.foodDisplay)).toEqual(["Rendang", "Nasi Goreng"]);
  });

  it("maps medium severity to high risk without marking safe pairs as high", async () => {
    mockedGet.mockResolvedValueOnce({ data: { data: { id: "patient-1", fullName: "Budi Santoso" } } });
    mockedPost
      .mockResolvedValueOnce({ data: { data: { image_id: "img-1", upload_url: "/uploads/img-1.jpg", timestamp: "2026-05-09T08:00:00.000Z" } } })
      .mockResolvedValueOnce({ data: { data: { scan_id: "scan-1", detected_items: [{ label: "nasi-goreng", label_display: "Nasi Goreng", confidence: 0.95 }], inference_time_ms: 120, model_version: "v1", timestamp: "2026-05-09T08:00:01.000Z" } } })
      .mockResolvedValueOnce({ data: { data: { interactions: [
        { food_item: "nasi-goreng", food_display: "Nasi Goreng", medication: "Celestar", severity: "sedang", severity_label: "Sedang", interaction_description: "Perlu perhatian.", recommendation: "Pantau gejala." },
        { food_item: "nasi-goreng", food_display: "Nasi Goreng", medication: "Simvastatin", severity: "aman", severity_label: "Aman", interaction_description: "Aman.", recommendation: "Lanjutkan pemantauan." },
      ], patient_medications: ["CELESTAR", "SIMVASTATIN"], analyzed_medications_count: 2, recommended_foods: [], foods_to_avoid: [], overall_risk_level: "sedang", overall_recommendation: "Ditemukan potensi interaksi obat-makanan. Ikuti alternatif makanan aman dari rekomendasi AI.", disclaimer: "Konsultasikan ke tenaga kesehatan." } } })
      .mockResolvedValueOnce({ data: { data: { recommended_foods: [], foods_to_avoid: [], patient_medications: ["CELESTAR", "SIMVASTATIN"], analyzed_medications_count: 2 } } })
      .mockResolvedValueOnce({ data: { data: { items: [], total: { calories: 0, protein_g: 0, fat_g: 0, carbs_g: 0 } } } });

    const analysis = await scanFoodImage(new File(["image"], "food.jpg", { type: "image/jpeg" }));

    expect(analysis.overallRisk).toBe("High Risk");
    expect(analysis.scan.result).toBe("Ditemukan potensi interaksi obat-makanan.");
    expect(analysis.scan.recommendation).toBe("Ditemukan potensi interaksi obat-makanan. Ikuti alternatif makanan aman dari rekomendasi AI.");
    expect(analysis.interactions.map((interaction) => interaction.risk)).toEqual(["High Risk", "Low Risk"]);
  });

  it("throws when current patient is unavailable", async () => {
    mockedGet.mockResolvedValueOnce({ data: { data: null } });

    await expect(scanFoodImage(new File(["image"], "food.jpg"))).rejects.toThrow("Data pasien tidak ditemukan untuk scan makanan.");
  });

  it("keeps scan result when nutrition estimate fails", async () => {
    mockedGet.mockResolvedValueOnce({ data: { data: { id: "patient-1", fullName: "Budi Santoso" } } });
    mockedPost
      .mockResolvedValueOnce({ data: { data: { image_id: "img-1", upload_url: "/uploads/img-1.jpg", timestamp: "2026-05-09T08:00:00.000Z" } } })
      .mockResolvedValueOnce({ data: { data: { scan_id: "scan-1", detected_items: [{ label: "rendang", label_display: "Rendang", confidence: 0.95 }], inference_time_ms: 120, model_version: "v1", timestamp: "2026-05-09T08:00:01.000Z" } } })
      .mockResolvedValueOnce({ data: { data: { interactions: [{ food_item: "rendang", food_display: "Rendang", medication: "Warfarin", severity: "high", severity_label: "Tinggi", interaction_description: "Perlu perhatian.", recommendation: "Hindari konsumsi bersamaan." }], recommended_foods: [], foods_to_avoid: [], overall_risk_level: "high", overall_recommendation: "Hindari konsumsi bersamaan.", disclaimer: "Konsultasikan ke tenaga kesehatan." } } })
      .mockResolvedValueOnce({ data: { data: { recommended_foods: [], foods_to_avoid: [], patient_medications: ["WARFARIN"], analyzed_medications_count: 1 } } })
      .mockRejectedValueOnce({ response: { status: 502, data: { message: "Data gizi tidak tersedia" } } });

    const file = new File(["image"], "food.jpg", { type: "image/jpeg" });
    const analysis = await scanFoodImage(file);

    expect(analysis.scan.foodName).toBe("Rendang");
    expect(analysis.interactions).toHaveLength(1);
    expect(analysis.nutritionItems).toBeUndefined();
    expect(analysis.nutritionTotal).toBeUndefined();
  });

  it("hides nutrition summary when no nutrition items are available", async () => {
    mockedGet.mockResolvedValueOnce({ data: { data: { id: "patient-1", fullName: "Budi Santoso" } } });
    mockedPost
      .mockResolvedValueOnce({ data: { data: { image_id: "img-1", upload_url: "/uploads/img-1.jpg", timestamp: "2026-05-09T08:00:00.000Z" } } })
      .mockResolvedValueOnce({ data: { data: { scan_id: "scan-1", detected_items: [{ label: "biskuit-choco-chips", label_display: "Biskuit Choco Chips", confidence: 0.95 }], inference_time_ms: 120, model_version: "v1", timestamp: "2026-05-09T08:00:01.000Z" } } })
      .mockResolvedValueOnce({ data: { data: { interactions: [], recommended_foods: [], foods_to_avoid: [], overall_risk_level: "low", overall_recommendation: "Aman.", disclaimer: "Konsultasikan ke tenaga kesehatan." } } })
      .mockResolvedValueOnce({ data: { data: { recommended_foods: [], foods_to_avoid: [] } } })
      .mockResolvedValueOnce({ data: { data: { items: [], unavailable_items: [{ food_item: "biskuit-choco-chips", reason: "Data gizi belum tersedia" }], total: { calories: 0, protein_g: 0, fat_g: 0, carbs_g: 0 } } } });

    const analysis = await scanFoodImage(new File(["image"], "food.jpg", { type: "image/jpeg" }));

    expect(analysis.scan.foodName).toBe("Biskuit Choco Chips");
    expect(analysis.nutritionItems).toBeUndefined();
    expect(analysis.nutritionTotal).toBeUndefined();
  });

  it("returns a handled result when detection finds no food", async () => {
    mockedGet.mockResolvedValueOnce({ data: { data: { id: "patient-1", fullName: "Budi Santoso" } } });
    mockedPost
      .mockResolvedValueOnce({ data: { data: { image_id: "img-1", upload_url: "/uploads/img-1.jpg", timestamp: "2026-05-09T08:00:00.000Z" } } })
      .mockResolvedValueOnce({ data: { data: { scan_id: "scan-1", detected_items: [], low_confidence_items: [], inference_time_ms: 120, model_version: "v1", timestamp: "2026-05-09T08:00:01.000Z" } } });

    const analysis = await scanFoodImage(new File(["image"], "food.jpg", { type: "image/jpeg" }));

    expect(mockedPost).toHaveBeenCalledTimes(2);
    expect(analysis.scan).toMatchObject({
      foodName: "Tidak ada makanan terdeteksi",
      hasDetectedFood: false,
      detectedItems: [],
    });
    expect(analysis.overallRisk).toBe("Low Risk");
    expect(analysis.scan.result).toBe("Tidak ada makanan yang dapat dianalisis dari gambar ini.");
    expect(analysis.interactions).toEqual([]);
    expect(analysis.recommendedFoods).toEqual([]);
    expect(analysis.foodsToAvoid).toEqual([]);
  });

  it("retries food detection once after a transient timeout", async () => {
    vi.useFakeTimers();
    mockedGet.mockResolvedValueOnce({ data: { data: { id: "patient-1", fullName: "Budi Santoso" } } });
    mockedPost
      .mockResolvedValueOnce({ data: { data: { image_id: "img-1", upload_url: "/uploads/img-1.jpg", timestamp: "2026-05-09T08:00:00.000Z" } } })
      .mockRejectedValueOnce({ response: { status: 503, data: { error_code: "AI_INFERENCE_TIMEOUT", message: "AI deteksi sedang lambat" } } })
      .mockResolvedValueOnce({ data: { data: { scan_id: "scan-1", detected_items: [{ label: "kangkung", label_display: "Kangkung", confidence: 0.95 }], inference_time_ms: 120, model_version: "v1", timestamp: "2026-05-09T08:00:01.000Z" } } })
      .mockResolvedValueOnce({ data: { data: { interactions: [], recommended_foods: [], foods_to_avoid: [], overall_risk_level: "low", overall_recommendation: "Aman.", disclaimer: "Konsultasikan ke tenaga kesehatan." } } })
      .mockResolvedValueOnce({ data: { data: { recommended_foods: [], foods_to_avoid: [] } } })
      .mockResolvedValueOnce({ data: { data: { items: [], total: { calories: 0, protein_g: 0, fat_g: 0, carbs_g: 0 } } } });

    const analysisPromise = scanFoodImage(new File(["image"], "food.jpg", { type: "image/jpeg" }));
    await vi.advanceTimersByTimeAsync(900);
    const analysis = await analysisPromise;

    expect(mockedPost).toHaveBeenNthCalledWith(2, "/food-scans/img-1/detections", { patientId: "patient-1" });
    expect(mockedPost).toHaveBeenNthCalledWith(3, "/food-scans/img-1/detections", { patientId: "patient-1" });
    expect(analysis.scan.foodName).toBe("Kangkung");
  });

  it("maps analyzed medication count and recommendations from scan detail API", async () => {
    mockedGet.mockResolvedValueOnce({
      data: {
        data: {
          id: "scan-1",
          patientId: "patient-1",
          imageUrl: "/uploads/scan-1.jpg",
          overallRiskLevel: "rendah",
          modelVersion: "v1",
          inferenceTimeMs: 120,
          createdAt: "2026-05-09T08:00:00.000Z",
          detectedItems: [{ id: "item-1", label: "kangkung", labelDisplay: "Kangkung", confidence: 0.9, boundingBox: { x: 20, y: 30, width: 120, height: 140 } }],
          interactions: [],
          patientMedications: ["ATORVASTATIN"],
          analyzedMedicationCount: 1,
          recommendedFoods: [{ food_name: "apel", severity_score: 0, risk_level: "aman", worst_category: null }],
          foodsToAvoid: [{ food_name: "gudeg", severity_score: 3, risk_level: "sedang", worst_category: "statin" }],
        },
      },
    });
    const analysis = await getFoodScanAnalysisFromApi("scan-1");

    expect(mockedPost).not.toHaveBeenCalled();
    expect(analysis.analyzedMedicationCount).toBe(1);
    expect(analysis.analyzedMedications).toEqual(["ATORVASTATIN"]);
    expect(analysis.scan.detectedItems).toEqual([{ label: "kangkung", labelDisplay: "Kangkung", confidence: 0.9, boundingBox: { x: 20, y: 30, width: 120, height: 140 } }]);
    expect(analysis.recommendedFoods).toEqual([{ foodName: "apel", severityScore: 0, riskLevel: "aman", worstCategory: null }]);
    expect(analysis.foodsToAvoid).toEqual([{ foodName: "gudeg", severityScore: 3, riskLevel: "sedang", worstCategory: "statin" }]);
  });

  it("treats analyzed scan summaries as detected food activities", async () => {
    mockedGet.mockResolvedValueOnce({
      data: {
        data: [{
          id: "scan-1",
          patientId: "patient-1",
          imageUrl: "/uploads/scan-1.jpg",
          overallRiskLevel: "rendah",
          modelVersion: "v1",
          inferenceTimeMs: 120,
          createdAt: "2026-05-09T08:00:00.000Z",
        }],
        meta: { page: 1, limit: 100, total: 1 },
      },
    });

    const page = await getFoodScansPageFromApi({ patientId: "patient-1", limit: 100 });

    expect(page.data[0]).toMatchObject({ id: "scan-1", hasDetectedFood: true, risk: "Low Risk" });
  });

  it("maps scan details with an explicit empty detection list as no detected food", async () => {
    mockedGet.mockResolvedValueOnce({
      data: {
        data: {
          id: "scan-empty",
          patientId: "patient-1",
          imageUrl: "/uploads/scan-empty.jpg",
          overallRiskLevel: null,
          modelVersion: "v1",
          inferenceTimeMs: 120,
          createdAt: "2026-05-09T08:00:00.000Z",
          detectedItems: [],
          interactions: [],
        },
      },
    });

    const analysis = await getFoodScanAnalysisFromApi("scan-empty");

    expect(analysis.scan).toMatchObject({
      foodName: "Tidak ada makanan terdeteksi",
      hasDetectedFood: false,
      result: "Tidak ada makanan yang dapat dianalisis dari gambar ini.",
      recommendation: "Gunakan foto makanan yang lebih jelas atau upload gambar makanan dari galeri.",
      detectedItems: [],
    });
  });

  it("maps safe foods when no interactions are returned", async () => {
    mockedGet.mockResolvedValueOnce({ data: { data: { id: "patient-1", fullName: "Budi Santoso" } } });
    mockedPost
      .mockResolvedValueOnce({ data: { data: { image_id: "img-1", upload_url: "/uploads/img-1.jpg", timestamp: "2026-05-09T08:00:00.000Z" } } })
      .mockResolvedValueOnce({ data: { data: { scan_id: "scan-1", detected_items: [{ label: "kangkung", label_display: "Kangkung", confidence: 0.95 }], inference_time_ms: 120, model_version: "v1", timestamp: "2026-05-09T08:00:01.000Z" } } })
      .mockResolvedValueOnce({ data: { data: { interactions: [], patient_medications: ["ATORVASTATIN"], analyzed_medications_count: 1, safe_items: [{ food_item: "kangkung", food_display: "Kangkung", status: "aman" }], recommended_foods: [], foods_to_avoid: [], overall_risk_level: "low", overall_recommendation: "Tidak ditemukan interaksi signifikan pada makanan yang terdeteksi.", disclaimer: "Konsultasikan ke tenaga kesehatan." } } })
      .mockResolvedValueOnce({ data: { data: { recommended_foods: [], foods_to_avoid: [], patient_medications: ["ATORVASTATIN"], analyzed_medications_count: 1 } } })
      .mockResolvedValueOnce({ data: { data: { items: [], total: { calories: 0, protein_g: 0, fat_g: 0, carbs_g: 0 } } } });

    const file = new File(["image"], "food.jpg", { type: "image/jpeg" });
    const analysis = await scanFoodImage(file);

    expect(analysis.interactions).toEqual([]);
    expect(analysis.safeFoods).toEqual([{ foodItem: "kangkung", foodDisplay: "Kangkung", status: "aman" }]);
    expect(analysis.analyzedMedicationCount).toBe(1);
  });
});
