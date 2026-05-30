import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
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
    expect(mockedPost).toHaveBeenNthCalledWith(5, "/nutrition-estimates", { detectedItems: [{ label: "milk", confidence: 0.95 }] });
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
