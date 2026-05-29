import api from "@/lib/axios";
import { getApiErrorMessage } from "@/lib/apiErrors";
import { getDateRangeParams } from "@/lib/dateRange";
import type { FoodScanAnalysis } from "@/helpers/foodScans";
import type { FoodScanRecord, FoodScanRisk } from "@/lib/mocks/foodScans";
import type { MedicationScheduleRecord } from "@/lib/mocks/schedules";

const foodScansCacheTtl = 15_000;
const foodScansCache = new Map<string, { data: FoodScanRecord[]; expiresAt: number }>();
const foodScansRequests = new Map<string, Promise<FoodScanRecord[]>>();
const foodScanDetailCache = new Map<string, { data: FoodScanAnalysis; expiresAt: number }>();
const foodScanDetailRequests = new Map<string, Promise<FoodScanAnalysis>>();

export const clearFoodScansCache = () => {
  foodScansCache.clear();
  foodScansRequests.clear();
  foodScanDetailCache.clear();
  foodScanDetailRequests.clear();
};

const clearFoodScanRelatedCaches = async () => {
  clearFoodScansCache();
  await Promise.all([
    import("./dashboardApi").then(({ clearDashboardCache }) => clearDashboardCache()).catch(() => undefined),
    import("./patientApi").then(({ clearPatientsCache }) => clearPatientsCache()).catch(() => undefined),
    import("./patientDashboardApi").then(({ clearPatientDashboardCache }) => clearPatientDashboardCache()).catch(() => undefined),
  ]);
};

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

interface RecommendationResponse {
  patient_medications?: string[];
  analyzed_medications_count?: number;
  recommended_foods?: FoodRecommendationResponse[];
  foods_to_avoid?: FoodRecommendationResponse[];
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
  disclaimer?: string | null;
}

interface FoodScanDetailApiResponse {
  data: FoodScanDetailResponse;
}

interface FoodScanListApiResponse {
  data: FoodScanDetailResponse[];
  meta?: { page: number; limit: number; total: number };
}

export interface FoodScanListPage {
  data: FoodScanRecord[];
  meta: { page: number; limit: number; total: number };
}

const getInitials = (name?: string | null) => name?.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "PX";

const getBackendOrigin = () => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.jivara.web.id/api/v1";
  return apiUrl.replace(/\/api(?:\/v\d+)?\/?$/, "");
};

const getPatient = async () => {
  const response = await api.get<{ data: PatientResponse }>("/patients/me");
  const patient = response.data.data;

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

const getBackendImageUrl = (imageUrl: string) => {
  if (imageUrl.startsWith("/uploads/")) return `/api${imageUrl}`;
  return imageUrl.startsWith("http") ? imageUrl : `${getBackendOrigin()}${imageUrl}`;
};

const mapRecommendation = (food: FoodRecommendationResponse) => ({
  foodName: food.food_name,
  severityScore: food.severity_score,
  riskLevel: food.risk_level,
  worstCategory: food.worst_category,
});

type FoodRecommendationRecord = ReturnType<typeof mapRecommendation>;

const getRecommendationKey = (food: FoodRecommendationRecord) => food.foodName.trim().toLowerCase();

const isSafeRecommendation = (food: FoodRecommendationRecord) => {
  const risk = food.riskLevel.trim().toLowerCase();
  if (["aman", "ringan", "rendah", "safe", "low", "low risk"].includes(risk)) return true;
  if (["sedang", "menengah", "moderate", "medium", "tinggi", "high", "high risk", "kritis", "critical"].includes(risk)) return false;
  return food.severityScore <= 1;
};

const splitRecommendationsByRisk = (recommendedFoods: FoodRecommendationResponse[] = [], foodsToAvoid: FoodRecommendationResponse[] = []) => {
  const byName = new Map<string, FoodRecommendationRecord>();

  for (const recommendation of [...recommendedFoods, ...foodsToAvoid]) {
    const food = mapRecommendation(recommendation);
    const key = getRecommendationKey(food);
    const existing = byName.get(key);
    if (!existing || food.severityScore > existing.severityScore) byName.set(key, food);
  }

  const safeRecommendations: FoodRecommendationRecord[] = [];
  const avoidRecommendations: FoodRecommendationRecord[] = [];

  byName.forEach((food) => {
    if (isSafeRecommendation(food)) {
      safeRecommendations.push(food);
    } else {
      avoidRecommendations.push(food);
    }
  });

  return { safeRecommendations, avoidRecommendations };
};

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
  const analyzedMedicationCount = detail.analyzedMedicationCount ?? detail.patientMedications?.length ?? 0;
  const scan: FoodScanRecord = {
    id: detail.id,
    patientId: detail.patientId,
    foodName,
    image: getBackendImageUrl(detail.imageUrl),
    scannedAt: detail.createdAt || new Date().toISOString(),
    risk,
    hasDetectedFood: detail.detectedItems ? detail.detectedItems.length > 0 : Boolean(detail.overallRiskLevel),
    aiReasoning: `Model ${detail.modelVersion || "AI"} menganalisis ${foodName}${detail.inferenceTimeMs ? ` dalam ${detail.inferenceTimeMs} ms` : ""}${analyzedMedicationCount > 0 ? " dan mencocokkannya dengan obat aktif pasien" : ""}.`,
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
    .flatMap((item) => (riskyFoodItems.has(item.label) ? [] : [{ foodItem: item.label, foodDisplay: item.labelDisplay, status: "aman" }]));

  const recommendationGroups = splitRecommendationsByRisk(detail.recommendedFoods || [], detail.foodsToAvoid || []);

  return {
    scan,
    patientName,
    analyzedMedicationCount,
    analyzedMedications: detail.patientMedications ?? interactions.map((interaction) => interaction.schedule.medicineName),
    schedules: interactions.map((interaction) => interaction.schedule),
    interactions,
    safeFoods,
    recommendedFoods: recommendationGroups.safeRecommendations,
    foodsToAvoid: recommendationGroups.avoidRecommendations,
    disclaimer: detail.disclaimer || undefined,
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

  const [interactionResult, recommendationResult, nutritionResult] = await Promise.allSettled([
    api.post<{ data: InteractionResponse }>(`/food-scans/${encodeURIComponent(upload.image_id)}/interactions`, {
      patientId,
      detectedItems: detectedLabels,
      includeRecommendations: false,
    }),
    api.post<{ data: RecommendationResponse }>(`/food-scans/${encodeURIComponent(upload.image_id)}/recommendations`, {
      patientId,
      topN: 100,
    }),
    api.post<{ data: NutritionResponse }>("/nutrition-estimates", {
      detectedItems: detection.detected_items.map((item) => ({ label: item.label, confidence: item.confidence })),
    }),
  ]);

  if (interactionResult.status === "rejected") {
    throw new Error(getApiErrorMessage(interactionResult.reason, "Analisis interaksi makanan gagal."));
  }

  const interactionData = interactionResult.value.data.data;
  const recommendationData = recommendationResult.status === "fulfilled"
    ? recommendationResult.value.data.data
    : null;
  const nutritionData = nutritionResult.status === "fulfilled"
    ? nutritionResult.value.data.data
    : null;
  const risk = toRisk(interactionData.overall_risk_level);
  const image = getBackendImageUrl(upload.upload_url);
  const foodName = toFoodName(detection.detected_items);
  const analyzedMedicationCount =
    recommendationData?.analyzed_medications_count
    ?? interactionData.analyzed_medications_count
    ?? recommendationData?.patient_medications?.length
    ?? interactionData.patient_medications?.length
    ?? 0;
  const scan: FoodScanRecord = {
    id: upload.image_id,
    patientId,
    foodName,
    image,
    scannedAt: upload.timestamp,
    risk,
    hasDetectedFood: detection.detected_items.length > 0,
    aiReasoning: `Model ${detection.model_version} mendeteksi ${foodName} dalam ${detection.inference_time_ms} ms${analyzedMedicationCount > 0 ? " dan mencocokkannya dengan obat aktif pasien" : ""}.`,
    result: interactionData.interactions.length > 0 ? "Ditemukan potensi interaksi obat-makanan." : "Tidak ditemukan interaksi signifikan pada makanan yang terdeteksi.",
    recommendation: interactionData.overall_recommendation || interactionData.disclaimer,
  };
  const interactions = interactionData.interactions.map((interaction, index) => ({
    schedule: createSchedule(interaction, patient, index),
    risk: risk,
    reasoning: interaction.interaction_description,
    recommendation: interaction.recommendation,
  }));
  await clearFoodScanRelatedCaches();

  const recommendationGroups = splitRecommendationsByRisk(
    recommendationData?.recommended_foods || interactionData.recommended_foods || [],
    recommendationData?.foods_to_avoid || interactionData.foods_to_avoid || [],
  );

  return {
    scan,
    patientName: patient.fullName || "Pasien",
    analyzedMedicationCount,
    analyzedMedications:
      recommendationData?.patient_medications
      ?? interactionData.patient_medications
      ?? interactions.map((interaction) => interaction.schedule.medicineName),
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
    recommendedFoods: recommendationGroups.safeRecommendations,
    foodsToAvoid: recommendationGroups.avoidRecommendations,
    disclaimer: interactionData.disclaimer,
    overallRisk: risk,
  };
};

export const getFoodScansFromApi = async (params: { page?: number; limit?: number; patientId?: string; date?: string } = {}): Promise<FoodScanRecord[]> => {
  const now = Date.now();
  const cacheKey = `${params.page ?? ""}:${params.limit ?? ""}:${params.patientId ?? ""}:${params.date ?? ""}`;
  const cached = foodScansCache.get(cacheKey);
  if (cached && cached.expiresAt > now) return cached.data;
  const activeRequest = foodScansRequests.get(cacheKey);
  if (activeRequest) return activeRequest;

  const request = api.get<FoodScanListApiResponse>("/food-scans", { params: { page: params.page, limit: params.limit, patient_id: params.patientId, ...getDateRangeParams(params.date) } })
    .then((response) => {
      const scans = response.data.data.map((detail) => mapScanDetail(detail).scan);
      foodScansCache.set(cacheKey, { data: scans, expiresAt: Date.now() + foodScansCacheTtl });
      return scans;
    })
    .finally(() => {
      foodScansRequests.delete(cacheKey);
    });

  foodScansRequests.set(cacheKey, request);
  return request;
};

export const getFoodScansPageFromApi = async (params: { page?: number; limit?: number; patientId?: string; date?: string } = {}): Promise<FoodScanListPage> => {
  const response = await api.get<FoodScanListApiResponse>("/food-scans", { params: { page: params.page, limit: params.limit, patient_id: params.patientId, ...getDateRangeParams(params.date) } });
  const scans = response.data.data.map((detail) => mapScanDetail(detail).scan);

  return {
    data: scans,
    meta: response.data.meta ?? {
      page: params.page ?? 1,
      limit: params.limit ?? scans.length,
      total: scans.length,
    },
  };
};

export const getFoodScansForPatientFromApi = async (patientId: string, limit = 100): Promise<FoodScanRecord[]> => {
  const scans = await getFoodScansFromApi({ patientId, limit });
  return scans.filter((scan) => scan.patientId === patientId);
};

export const getFoodScanAnalysisFromApi = async (scanId: string): Promise<FoodScanAnalysis> => {
  const now = Date.now();
  const cached = foodScanDetailCache.get(scanId);
  if (cached && cached.expiresAt > now) return cached.data;

  const inFlightRequest = foodScanDetailRequests.get(scanId);
  if (inFlightRequest) return inFlightRequest;

  const request = api.get<FoodScanDetailApiResponse>(`/food-scans/${encodeURIComponent(scanId)}`)
    .then((response) => {
      const analysis = mapScanDetail(response.data.data);
      foodScanDetailCache.set(scanId, { data: analysis, expiresAt: Date.now() + foodScansCacheTtl });
      return analysis;
    })
    .finally(() => {
      foodScanDetailRequests.delete(scanId);
    });

  foodScanDetailRequests.set(scanId, request);
  return request;
};
