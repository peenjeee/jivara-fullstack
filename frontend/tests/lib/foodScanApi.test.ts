import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import api from "@/lib/axios";
import { scanFoodImage } from "@/lib/foodScanApi";

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
    mockedGet.mockResolvedValueOnce({ data: { data: [{ id: "patient-1", fullName: "Budi Santoso" }] } });
    mockedPost
      .mockResolvedValueOnce({ data: { data: { image_id: "img-1", upload_url: "/uploads/img-1.jpg", timestamp: "2026-05-09T08:00:00.000Z" } } })
      .mockResolvedValueOnce({ data: { data: { scan_id: "scan-1", detected_items: [{ label: "milk", label_display: "Susu", confidence: 0.95 }], inference_time_ms: 120, model_version: "v1", timestamp: "2026-05-09T08:00:01.000Z" } } })
      .mockResolvedValueOnce({ data: { data: { interactions: [{ food_item: "milk", food_display: "Susu", medication: "Cefixime", severity: "high", severity_label: "Tinggi", interaction_description: "Susu dapat mengganggu penyerapan.", recommendation: "Beri jeda 2 jam." }], overall_risk_level: "high", overall_recommendation: "Hindari konsumsi bersamaan.", disclaimer: "Konsultasikan ke tenaga kesehatan." } } })
      .mockResolvedValueOnce({ data: { data: {} } });

    const file = new File(["image"], "food.jpg", { type: "image/jpeg" });
    const analysis = await scanFoodImage(file);

    expect(mockedGet).toHaveBeenCalledWith("/patients", { params: { limit: 1 } });
    expect(mockedPost).toHaveBeenNthCalledWith(1, "/food-scans", expect.any(FormData), { headers: { "Content-Type": "multipart/form-data" } });
    expect(mockedPost).toHaveBeenNthCalledWith(2, "/food-scans/img-1/detections", { patientId: "patient-1" });
    expect(mockedPost).toHaveBeenNthCalledWith(3, "/food-scans/img-1/interactions", { patientId: "patient-1", detectedItems: ["milk"] });
    expect(mockedPost).toHaveBeenNthCalledWith(4, "/nutrition-estimates", { detectedItems: [{ label: "milk", confidence: 0.95 }] });
    expect(analysis).toMatchObject({
      overallRisk: "High Risk",
      scan: { id: "img-1", patientId: "patient-1", foodName: "Susu", risk: "High Risk" },
      interactions: [expect.objectContaining({ risk: "High Risk", recommendation: "Beri jeda 2 jam." })],
    });
  });

  it("throws when current patient is unavailable", async () => {
    mockedGet.mockResolvedValueOnce({ data: { data: [] } });

    await expect(scanFoodImage(new File(["image"], "food.jpg"))).rejects.toThrow("Data pasien tidak ditemukan untuk scan makanan.");
  });
});
