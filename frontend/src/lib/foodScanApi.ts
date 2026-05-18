import api from "@/lib/axios";
import { getApiErrorMessage } from "@/lib/apiErrors";
import type { FoodScanAnalysis } from "@/helpers/foodScans";
import type { FoodScanRecord, FoodScanRisk } from "@/lib/mocks/foodScans";
import type { MedicationScheduleRecord } from "@/lib/mocks/schedules";

interface PatientResponse {
  id: string;
  fullName?: string | null;
}

interface UploadResponse {
  image_id: string;
  upload_url: string;
  timestamp: string;
}

interface DetectedItemResponse {
  label: string;
  label_display: string;
  confidence: number;
}

interface DetectResponse {
  scan_id: string;
  detected_items: DetectedItemResponse[];
  inference_time_ms: number;
  model_version: string;
  timestamp: string;
}

interface InteractionResponse {
  interactions: Array<{
    food_item: string;
    food_display: string;
    medication: string;
    severity: string;
    severity_label: string;
    interaction_description: string;
    recommendation: string;
  }>;
  overall_risk_level: string;
  overall_recommendation: string;
  disclaimer: string;
  patient_medications?: string[];
  analyzed_medications_count?: number;
  safe_items?: Array<{
    food_item: string;
    food_display: string;
    status: string;
  }>;
  recommended_foods?: FoodRecommendationResponse[];
  foods_to_avoid?: FoodRecommendationResponse[];
}

interface FoodRecommendationResponse {
  food_name: string;
  severity_score: number;
  risk_level: string;
  worst_category?: string | null;
}

interface NutritionResponse {
  items: NutritionItemResponse[];
  total: {
    calories: number;
    protein_g: number;
    fat_g: number;
    carbs_g: number;
  };
}

interface NutritionItemResponse {
  food_item: string;
  food_display: string;
  portion: string;
  nutrition: {
    calories: number;
    protein_g: number;
    fat_g: number;
    carbs_g: number;
  };
  source: string;
}

interface FoodScanDetailResponse {
  id: string;
  patientId: string;
  imageUrl: string;
  overallRiskLevel?: string | null;
  modelVersion?: string | null;
  inferenceTimeMs?: number | null;
  createdAt?: string | null;
  detectedItems?: Array<{
    id: string;
    label: string;
    labelDisplay: string;
    confidence: number;
  }>;
  interactions?: Array<{
    id: string;
    foodItem: string;
    medication: string;
    severity: string;
    interactionDescription?: string | null;
    recommendation?: string | null;
  }>;
  patientMedications?: string[];
  analyzedMedicationCount?: number;
  recommendedFoods?: FoodRecommendationResponse[];
  foodsToAvoid?: FoodRecommendationResponse[];
}

interface FoodScanDetailApiResponse {
  data: FoodScanDetailResponse;
}

interface FoodScanListApiResponse {
  data: FoodScanDetailResponse[];
  meta?: { page: number; limit: number; total: number };
}

const getInitials = (name?: string | null) => name?.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "PX";

const getBackendOrigin = () => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.jivara.web.id/api";
  return apiUrl.replace(/\/api\/?$/, "");
};

const getPatient = async () => {
  const response = await api.get<{ data: PatientResponse[] }>("/patients", { params: { limit: 1 } });
  const patient = response.data.data[0];

  if (!patient?.id) {
    throw new Error("Data pasien tidak ditemukan untuk scan makanan.");
  }

  return patient;
};

const toFoodName = (items: DetectedItemResponse[]) => {
  if (items.length === 0) return "Makanan terdeteksi";
  return items.map((item) => item.label_display).join(", ");
};

const toRisk = (riskLevel: string): FoodScanRisk => {
  if (["tinggi", "critical", "high"].includes(riskLevel.toLowerCase())) return "High Risk";
  return "Low Risk";
};

const getBackendImageUrl = (imageUrl: string) => imageUrl.startsWith("http") ? imageUrl : `${getBackendOrigin()}${imageUrl}`;

const mapRecommendation = (food: FoodRecommendationResponse) => ({
  foodName: food.food_name,
  severityScore: food.severity_score,
  riskLevel: food.risk_level,
  worstCategory: food.worst_category,
});

const mapSafeFood = (item: { food_item: string; food_display: string; status: string }) => ({
  foodItem: item.food_item,
  foodDisplay: item.food_display,
  status: item.status,
});

const mapNutritionItem = (item: NutritionItemResponse) => ({
  foodItem: item.food_item,
  foodDisplay: item.food_display,
  portion: item.portion,
  nutrition: {
    calories: item.nutrition.calories,
    proteinG: item.nutrition.protein_g,
    fatG: item.nutrition.fat_g,
    carbsG: item.nutrition.carbs_g,
  },
  source: item.source,
});

const mapScanDetail = (detail: FoodScanDetailResponse, patientName = "Pasien"): FoodScanAnalysis => {
  const foodName = detail.detectedItems?.map((item) => item.labelDisplay).join(", ") || "Makanan terdeteksi";
  const risk = toRisk(detail.overallRiskLevel || "rendah");
  const scan: FoodScanRecord = {
    id: detail.id,
    patientId: detail.patientId,
    foodName,
    image: getBackendImageUrl(detail.imageUrl),
    scannedAt: detail.createdAt || new Date().toISOString(),
    risk,
    aiReasoning: `Model ${detail.modelVersion || "AI"} menganalisis ${foodName}${detail.inferenceTimeMs ? ` dalam ${detail.inferenceTimeMs} ms` : ""}.`,
    result: detail.interactions?.length ? "Ditemukan potensi interaksi obat-makanan." : "Tidak ditemukan interaksi signifikan pada makanan yang terdeteksi.",
    recommendation: detail.interactions?.[0]?.recommendation || "Ikuti jadwal obat dan pantau gejala setelah makan.",
  };
  const interactions = (detail.interactions || []).map((interaction) => ({
    schedule: {
      id: interaction.id,
      patientId: detail.patientId,
      patientName,
      patientAvatar: getInitials(patientName),
      medicineName: interaction.medication,
      dose: "-",
      medicineForm: "Tablet" as const,
      stock: 0,
      frequency: "Sesuai jadwal aktif",
      times: [],
      mealRule: "Tidak tergantung makan" as const,
      startDate: new Date().toISOString().slice(0, 10),
      reminderEnabled: true,
      status: "Aktif" as const,
    },
    risk: toRisk(interaction.severity),
    reasoning: interaction.interactionDescription || "Interaksi terdeteksi dari hasil analisis makanan-obat.",
    recommendation: interaction.recommendation || "Ikuti rekomendasi tenaga kesehatan.",
  }));
  const riskyFoodItems = new Set((detail.interactions || []).map((interaction) => interaction.foodItem));
  const safeFoods = (detail.detectedItems || [])
    .filter((item) => !riskyFoodItems.has(item.label))
    .map((item) => ({ foodItem: item.label, foodDisplay: item.labelDisplay, status: "aman" }));

  return {
    scan,
    patientName,
    analyzedMedicationCount: detail.analyzedMedicationCount ?? detail.patientMedications?.length ?? interactions.length,
    analyzedMedications: detail.patientMedications ?? interactions.map((interaction) => interaction.schedule.medicineName),
    schedules: interactions.map((interaction) => interaction.schedule),
    interactions,
    safeFoods,
    recommendedFoods: (detail.recommendedFoods || []).map(mapRecommendation),
    foodsToAvoid: (detail.foodsToAvoid || []).map(mapRecommendation),
    overallRisk: interactions.some((interaction) => interaction.risk === "High Risk") ? "High Risk" : risk,
  };
};

const createSchedule = (interaction: InteractionResponse["interactions"][number], patient: PatientResponse, index: number): MedicationScheduleRecord => ({
  id: `API-FOOD-INTERACTION-${index}`,
  patientId: patient.id,
  patientName: patient.fullName || "Pasien",
  patientAvatar: getInitials(patient.fullName),
  medicineName: interaction.medication,
  dose: "-",
  medicineForm: "Tablet",
  stock: 0,
  frequency: "Sesuai jadwal aktif",
  times: [],
  mealRule: "Tidak tergantung makan",
  startDate: new Date().toISOString().slice(0, 10),
  reminderEnabled: true,
  status: "Aktif",
});

export const scanFoodImage = async (file: File): Promise<FoodScanAnalysis> => {
  const patient = await getPatient();
  const patientId = patient.id;
  const formData = new FormData();
  formData.append("patientId", patientId);
  formData.append("image", file);

  const uploadResponse = await api.post<{ data: UploadResponse }>("/food-scans", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  const upload = uploadResponse.data.data;
  const detectResponse = await api.post<{ data: DetectResponse }>(`/food-scans/${encodeURIComponent(upload.image_id)}/detections`, {
    patientId,
  });
  const detection = detectResponse.data.data;
  const detectedLabels = detection.detected_items.map((item) => item.label);

  const [interactionResult, nutritionResult] = await Promise.allSettled([
    api.post<{ data: InteractionResponse }>(`/food-scans/${encodeURIComponent(upload.image_id)}/interactions`, {
      patientId,
      detectedItems: detectedLabels,
    }),
    api.post<{ data: NutritionResponse }>("/nutrition-estimates", {
      detectedItems: detection.detected_items.map((item) => ({ label: item.label, confidence: item.confidence })),
    }),
  ]);

  if (interactionResult.status === "rejected") {
    throw new Error(getApiErrorMessage(interactionResult.reason, "Analisis interaksi makanan gagal."));
  }

  const interactionData = interactionResult.value.data.data;
  const nutritionData = nutritionResult.status === "fulfilled"
    ? nutritionResult.value.data.data
    : null;
  const risk = toRisk(interactionData.overall_risk_level);
  const image = getBackendImageUrl(upload.upload_url);
  const foodName = toFoodName(detection.detected_items);
  const scan: FoodScanRecord = {
    id: upload.image_id,
    patientId,
    foodName,
    image,
    scannedAt: upload.timestamp,
    risk,
    aiReasoning: `Model ${detection.model_version} mendeteksi ${foodName} dalam ${detection.inference_time_ms} ms dan mencocokkannya dengan obat aktif pasien.`,
    result: interactionData.interactions.length > 0 ? "Ditemukan potensi interaksi obat-makanan." : "Tidak ditemukan interaksi signifikan pada makanan yang terdeteksi.",
    recommendation: interactionData.overall_recommendation || interactionData.disclaimer,
  };
  const interactions = interactionData.interactions.map((interaction, index) => ({
    schedule: createSchedule(interaction, patient, index),
    risk: risk,
    reasoning: interaction.interaction_description,
    recommendation: interaction.recommendation,
  }));

  return {
    scan,
    patientName: patient.fullName || "Pasien",
    analyzedMedicationCount: interactionData.analyzed_medications_count ?? interactionData.patient_medications?.length ?? interactions.length,
    analyzedMedications: interactionData.patient_medications ?? interactions.map((interaction) => interaction.schedule.medicineName),
    schedules: interactions.map((interaction) => interaction.schedule),
    interactions,
    nutritionItems: nutritionData?.items.map(mapNutritionItem),
    nutritionTotal: nutritionData
      ? {
        calories: nutritionData.total.calories,
        proteinG: nutritionData.total.protein_g,
        fatG: nutritionData.total.fat_g,
        carbsG: nutritionData.total.carbs_g,
      }
      : undefined,
    safeFoods: (interactionData.safe_items || []).map(mapSafeFood),
    recommendedFoods: (interactionData.recommended_foods || []).map(mapRecommendation),
    foodsToAvoid: (interactionData.foods_to_avoid || []).map(mapRecommendation),
    overallRisk: risk,
  };
};

export const getFoodScansFromApi = async (params: { page?: number; limit?: number; patientId?: string } = {}): Promise<FoodScanRecord[]> => {
  const response = await api.get<FoodScanListApiResponse>("/food-scans", { params: { page: params.page, limit: params.limit, patient_id: params.patientId } });
  return response.data.data.map((detail) => mapScanDetail(detail).scan);
};

export const getFoodScansForPatientFromApi = async (patientId: string): Promise<FoodScanRecord[]> => {
  const scans = await getFoodScansFromApi();
  return scans.filter((scan) => scan.patientId === patientId);
};

export const getFoodScanAnalysisFromApi = async (scanId: string): Promise<FoodScanAnalysis> => {
  const response = await api.get<FoodScanDetailApiResponse>(`/food-scans/${encodeURIComponent(scanId)}`);
  return mapScanDetail(response.data.data);
};
