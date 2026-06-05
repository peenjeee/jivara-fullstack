import api from "@/lib/axios";
import { getApiErrorMessage } from "@/lib/apiErrors";
import { getTodayAppDateKey } from "@/lib/appTimezone";
import { notifyDashboardDataChanged } from "@/lib/cacheEvents";
import { getDateRangeParams } from "@/lib/dateRange";
import type { FoodScanAnalysis } from "@/helpers/foodScans";
import type { FoodScanBoundingBox, FoodScanDetectedItem, FoodScanRecord, FoodScanRisk } from "@/lib/mocks/foodScans";
import type { MedicationScheduleRecord } from "@/lib/mocks/schedules";

const foodScansCache = new Map<string, { data: FoodScanRecord[] }>();
const foodScansRequests = new Map<string, Promise<FoodScanRecord[]>>();
const foodScanDetailCache = new Map<string, { data: FoodScanAnalysis }>();
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
    import("./alertsApi").then(({ clearAlertsCache }) => clearAlertsCache()).catch(() => undefined),
    import("./auditLogApi").then(({ clearAuditLogCache }) => clearAuditLogCache()).catch(() => undefined),
    import("./dashboardApi").then(({ clearDashboardCache }) => clearDashboardCache()).catch(() => undefined),
    import("./notificationActivitiesApi").then(({ clearNotificationActivityCache }) => clearNotificationActivityCache()).catch(() => undefined),
    import("./patientApi").then(({ clearPatientsCache }) => clearPatientsCache()).catch(() => undefined),
    import("./patientDashboardApi").then(({ clearPatientDashboardCache }) => clearPatientDashboardCache()).catch(() => undefined),
  ]);
  notifyDashboardDataChanged("food-scans");
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
  bounding_box?: FoodScanBoundingBox | null;
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
  patient_medication_details?: AnalyzedMedicationDetailResponse[];
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

interface AnalyzedMedicationDetailResponse {
  drugName: string;
  registrationNumber?: string | null;
  compositionNormalized?: string | null;
  activeSubstances?: string | null;
  drugCategories?: string | null;
  medicineForm?: string | null;
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
  overallRecommendation?: string | null;
  modelVersion?: string | null;
  inferenceTimeMs?: number | null;
  createdAt?: string | null;
  detectedItems?: Array<{
    id: string;
    label: string;
    labelDisplay: string;
    confidence: number;
    boundingBox?: FoodScanBoundingBox | null;
  }>;
  interactions?: Array<{
    id: string;
    foodItem: string;
    medication: string;
    severity: string;
    interactionDescription?: string | null;
    recommendation?: string | null;
  }>;
  patientName?: string | null;
  patientMedications?: string[];
  patientMedicationDetails?: AnalyzedMedicationDetailResponse[];
  analyzedMedicationCount?: number;
  nutritionItems?: NutritionItemResponse[];
  nutritionTotal?: NutritionResponse["total"] | null;
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

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isTransientDetectionError = (error: unknown) => {
  const response = (error as { response?: { status?: number; data?: { error_code?: unknown } } })?.response;
  const status = response?.status;
  return status === 502 || status === 503 || status === 504 || response?.data?.error_code === "AI_INFERENCE_TIMEOUT";
};

const detectFoodWithRetry = async (imageId: string, patientId: string) => {
  const path = `/food-scans/${encodeURIComponent(imageId)}/detections`;

  try {
    return await api.post<{ data: DetectResponse }>(path, { patientId });
  } catch (error) {
    if (!isTransientDetectionError(error)) throw error;
    await wait(900);
    return api.post<{ data: DetectResponse }>(path, { patientId });
  }
};

const toFoodName = (items: DetectedItemResponse[]) => {
  if (items.length === 0) return "Tidak ada makanan terdeteksi";
  return items.map((item) => item.label_display).join(", ");
};

const mapDetectedItem = (item: DetectedItemResponse): FoodScanDetectedItem => ({
  label: item.label,
  labelDisplay: item.label_display,
  confidence: item.confidence,
  boundingBox: item.bounding_box,
});

const mapDetailDetectedItem = (item: NonNullable<FoodScanDetailResponse["detectedItems"]>[number]): FoodScanDetectedItem => ({
  label: item.label,
  labelDisplay: item.labelDisplay,
  confidence: item.confidence,
  boundingBox: item.boundingBox,
});

const toRisk = (riskLevel: string): FoodScanRisk => {
  const normalized = riskLevel.trim().toLowerCase();
  if (["tinggi", "kritis", "critical", "high", "high risk"].includes(normalized)) return "High Risk";
  return "Low Risk";
};

const isAttentionRiskLevel = (riskLevel?: string | null) => {
  const normalized = String(riskLevel || "").trim().toLowerCase();
  return ["sedang", "menengah", "moderate", "medium", "tinggi", "kritis", "critical", "high", "high risk"].includes(normalized);
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

const formatFoodDisplay = (value: string) => value.replace(/-/g, " ");

const foodDetectionModelDisplayName = "Jivara Food Detection";
const inferenceDurationFormatter = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 });

const formatInferenceDuration = (durationMs?: number | null) => {
  if (!durationMs || durationMs <= 0) return "";
  const seconds = Math.max(durationMs / 1000, 0.1);
  return `${inferenceDurationFormatter.format(seconds)} detik`;
};

const formatInferencePhrase = (durationMs?: number | null) => {
  const duration = formatInferenceDuration(durationMs);
  return duration ? ` dalam ${duration}` : "";
};

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
  source: item.source.replace(/\bJivara AI Nutrition\b/gi, "Jivara Nutrition"),
});

const mapNutritionTotal = (total: NutritionResponse["total"]) => ({
  calories: total.calories,
  proteinG: total.protein_g,
  fatG: total.fat_g,
  carbsG: total.carbs_g,
});

const uniqueStrings = (values: readonly string[]) => Array.from(values.reduce((uniqueValues, value) => {
  const text = value.trim();
  if (!text) return uniqueValues;

  const key = text.toLocaleLowerCase("id-ID");
  if (!uniqueValues.has(key)) uniqueValues.set(key, text);
  return uniqueValues;
}, new Map<string, string>()).values());

type InteractionDedupeInput = {
  readonly foodItem?: unknown;
  readonly food_item?: unknown;
  readonly medication?: unknown;
  readonly severity?: unknown;
  readonly interactionDescription?: unknown;
  readonly interaction_description?: unknown;
  readonly recommendation?: unknown;
};

const normalizeInteractionKeyPart = (value: unknown) => String(value ?? "").trim().toLocaleLowerCase("id-ID");

const getInteractionDedupeKey = (interaction: InteractionDedupeInput) => [
  normalizeInteractionKeyPart(interaction.foodItem ?? interaction.food_item),
  normalizeInteractionKeyPart(interaction.medication),
  normalizeInteractionKeyPart(interaction.severity),
  normalizeInteractionKeyPart(interaction.interactionDescription ?? interaction.interaction_description),
  normalizeInteractionKeyPart(interaction.recommendation),
].join("|");

const dedupeInteractions = <T extends InteractionDedupeInput>(interactions: readonly T[]) => Array.from(interactions.reduce((uniqueInteractions, interaction) => {
  const key = getInteractionDedupeKey(interaction);
  if (!uniqueInteractions.has(key)) uniqueInteractions.set(key, interaction);
  return uniqueInteractions;
}, new Map<string, T>()).values());

const getAnalyzedMedicationNames = (detail: FoodScanDetailResponse, interactions: readonly NonNullable<FoodScanDetailResponse["interactions"]>[number][] = detail.interactions ?? []) => uniqueStrings([
  ...(detail.patientMedications || []),
  ...(detail.patientMedicationDetails || []).map((medicine) => medicine.drugName),
  ...interactions.map((interaction) => interaction.medication),
]);

const getAnalyzedMedicationCount = (explicitCount: number | null | undefined, medicationNames: readonly string[]) => explicitCount ?? medicationNames.length;

const mapScanDetail = (detail: FoodScanDetailResponse, patientName = detail.patientName || "Pasien"): FoodScanAnalysis => {
  const detectedItems = detail.detectedItems ?? [];
  const rawDetailInteractions = detail.interactions || [];
  const detailInteractions = dedupeInteractions(rawDetailInteractions);
  const hasDetectedFood = detail.detectedItems ? detectedItems.length > 0 : Boolean(detail.overallRiskLevel);
  const foodName = detectedItems.length > 0
    ? detectedItems.map((item) => item.labelDisplay).join(", ")
    : hasDetectedFood ? "Makanan terdeteksi" : "Tidak ada makanan terdeteksi";
  const risk = toRisk(detail.overallRiskLevel || "rendah");
  const analyzedMedicationNames = getAnalyzedMedicationNames(detail, detailInteractions);
  const analyzedMedicationCount = getAnalyzedMedicationCount(detail.analyzedMedicationCount, analyzedMedicationNames);
  const hasAttentionInteractions = isAttentionRiskLevel(detail.overallRiskLevel) || detailInteractions.some((interaction) => isAttentionRiskLevel(interaction.severity));
  const scan: FoodScanRecord = {
    id: detail.id,
    patientId: detail.patientId,
    foodName,
    image: getBackendImageUrl(detail.imageUrl),
    scannedAt: detail.createdAt || new Date().toISOString(),
    risk,
    hasDetectedFood,
    aiReasoning: hasDetectedFood
      ? `Model ${foodDetectionModelDisplayName} menganalisis ${foodName}${formatInferencePhrase(detail.inferenceTimeMs)}${analyzedMedicationCount > 0 ? " dan mencocokkannya dengan obat aktif pasien" : ""}.`
      : `Model ${foodDetectionModelDisplayName} tidak mendeteksi makanan yang didukung${formatInferencePhrase(detail.inferenceTimeMs)}. Pastikan gambar berisi makanan dan kamera aktif, lalu coba scan ulang.`,
    result: hasDetectedFood
      ? hasAttentionInteractions ? "Ditemukan potensi interaksi obat-makanan." : "Tidak ditemukan interaksi signifikan pada makanan yang terdeteksi."
      : "Tidak ada makanan yang dapat dianalisis dari gambar ini.",
    recommendation: hasDetectedFood
      ? detail.overallRecommendation || (hasAttentionInteractions ? "Ditemukan potensi interaksi obat-makanan. Baca penjelasan AI per obat dan konsultasikan dengan dokter atau apoteker." : "Tidak ditemukan interaksi signifikan pada makanan yang terdeteksi.")
      : "Gunakan foto makanan yang lebih jelas atau upload gambar makanan dari galeri.",
    detectedItems: detectedItems.map(mapDetailDetectedItem),
  };
  const interactions = detailInteractions.map((interaction) => {
    const medicationDetail = findMedicationDetail(detail.patientMedicationDetails, interaction.medication);
    return {
      foodItem: interaction.foodItem,
      foodDisplay: formatFoodDisplay(interaction.foodItem),
      schedule: {
        id: interaction.id,
        patientId: detail.patientId,
        patientName,
        patientAvatar: getInitials(patientName),
        medicineName: interaction.medication,
        registrationNumber: medicationDetail?.registrationNumber || undefined,
        compositionNormalized: medicationDetail?.compositionNormalized || undefined,
        activeSubstances: medicationDetail?.activeSubstances || undefined,
        drugCategories: medicationDetail?.drugCategories || undefined,
        dose: "-",
        medicineForm: (medicationDetail?.medicineForm as MedicationScheduleRecord["medicineForm"] | null | undefined) || "Tablet",
        stock: 0,
        frequency: "Sesuai jadwal aktif",
        times: [],
        mealRule: "Tidak tergantung makan" as const,
        startDate: getTodayAppDateKey(),
        reminderEnabled: true,
        status: "Aktif" as const,
      },
      risk: toRisk(interaction.severity),
      reasoning: interaction.interactionDescription || "Interaksi terdeteksi dari hasil analisis makanan-obat.",
      recommendation: interaction.recommendation ?? "",
    };
  });
  const riskyFoodItems = new Set(rawDetailInteractions.map((interaction) => interaction.foodItem));
  const safeFoods = (detail.detectedItems || [])
    .flatMap((item) => (riskyFoodItems.has(item.label) ? [] : [{ foodItem: item.label, foodDisplay: item.labelDisplay, status: "aman" }]));

  const recommendationGroups = splitRecommendationsByRisk(detail.recommendedFoods || [], detail.foodsToAvoid || []);
  const nutritionItems = detail.nutritionItems?.map(mapNutritionItem) ?? [];

  return {
    scan,
    patientName,
    analyzedMedicationCount,
    analyzedMedications: analyzedMedicationNames,
    analyzedMedicationDetails: detail.patientMedicationDetails ?? [],
    schedules: interactions.map((interaction) => interaction.schedule),
    interactions,
    nutritionItems: nutritionItems.length > 0 ? nutritionItems : undefined,
    nutritionTotal: nutritionItems.length > 0 && detail.nutritionTotal ? mapNutritionTotal(detail.nutritionTotal) : undefined,
    safeFoods,
    recommendedFoods: recommendationGroups.safeRecommendations,
    foodsToAvoid: recommendationGroups.avoidRecommendations,
    disclaimer: detail.disclaimer || undefined,
    overallRisk: hasDetectedFood && interactions.some((interaction) => interaction.risk === "High Risk") ? "High Risk" : risk,
  };
};

const findMedicationDetail = (details: readonly AnalyzedMedicationDetailResponse[] | undefined, medication: string) => details?.find((detail) => detail.drugName.toLowerCase() === medication.toLowerCase());

const createSchedule = (interaction: InteractionResponse["interactions"][number], patient: PatientResponse, index: number, medicationDetails?: readonly AnalyzedMedicationDetailResponse[]): MedicationScheduleRecord => {
  const detail = findMedicationDetail(medicationDetails, interaction.medication);
  return {
    id: `API-FOOD-INTERACTION-${index}`,
    patientId: patient.id,
    patientName: patient.fullName || "Pasien",
    patientAvatar: getInitials(patient.fullName),
    medicineName: interaction.medication,
    registrationNumber: detail?.registrationNumber || undefined,
    compositionNormalized: detail?.compositionNormalized || undefined,
    activeSubstances: detail?.activeSubstances || undefined,
    drugCategories: detail?.drugCategories || undefined,
    dose: "-",
    medicineForm: (detail?.medicineForm as MedicationScheduleRecord["medicineForm"] | null | undefined) || "Tablet",
    stock: 0,
    frequency: "Sesuai jadwal aktif",
    times: [],
    mealRule: "Tidak tergantung makan",
    startDate: getTodayAppDateKey(),
    reminderEnabled: true,
    status: "Aktif",
  };
};

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
  const detectResponse = await detectFoodWithRetry(upload.image_id, patientId);
  const detection = detectResponse.data.data;
  const detectedLabels = uniqueStrings(detection.detected_items.map((item) => item.label));
  const image = getBackendImageUrl(upload.upload_url);

  if (detectedLabels.length === 0) {
    await clearFoodScanRelatedCaches();

    return {
      scan: {
        id: upload.image_id,
        patientId,
        foodName: "Tidak ada makanan terdeteksi",
        image,
        scannedAt: upload.timestamp,
        risk: "Low Risk",
        hasDetectedFood: false,
        aiReasoning: `Model ${foodDetectionModelDisplayName} tidak mendeteksi makanan yang didukung${formatInferencePhrase(detection.inference_time_ms)}. Pastikan gambar berisi makanan dan kamera aktif, lalu coba scan ulang.`,
        result: "Tidak ada makanan yang dapat dianalisis dari gambar ini.",
        recommendation: "Gunakan foto makanan yang lebih jelas atau upload gambar makanan dari galeri.",
        detectedItems: [],
      },
      patientName: patient.fullName || "Pasien",
      analyzedMedicationCount: 0,
      analyzedMedications: [],
      analyzedMedicationDetails: [],
      schedules: [],
      interactions: [],
      safeFoods: [],
      recommendedFoods: [],
      foodsToAvoid: [],
      overallRisk: "Low Risk",
    };
  }

  const [interactionResult, nutritionResult] = await Promise.allSettled([
    api.post<{ data: InteractionResponse }>(`/food-scans/${encodeURIComponent(upload.image_id)}/interactions`, {
      patientId,
      detectedItems: detectedLabels,
      includeRecommendations: false,
    }),
    api.post<{ data: NutritionResponse }>("/nutrition-estimates", {
      scanId: upload.image_id,
      detectedItems: detection.detected_items.map((item) => ({ label: item.label, confidence: item.confidence })),
    }),
  ]);

  if (interactionResult.status === "rejected") {
    throw new Error(getApiErrorMessage(interactionResult.reason, "Analisis interaksi makanan gagal."));
  }

  const interactionData = interactionResult.value.data.data;
  const uniqueInteractions = dedupeInteractions(interactionData.interactions);
  const nutritionData = nutritionResult.status === "fulfilled"
    ? nutritionResult.value.data.data
    : null;
  const nutritionItems = nutritionData?.items.map(mapNutritionItem) ?? [];
  const risk = toRisk(interactionData.overall_risk_level);
  const hasAttentionInteractions = isAttentionRiskLevel(interactionData.overall_risk_level) || uniqueInteractions.some((interaction) => isAttentionRiskLevel(interaction.severity));
  const foodName = toFoodName(detection.detected_items);
  const analyzedMedicationNames = uniqueStrings([
    ...(interactionData.patient_medications || []),
    ...(interactionData.patient_medication_details || []).map((medicine) => medicine.drugName),
    ...uniqueInteractions.map((interaction) => interaction.medication),
  ]);
  const analyzedMedicationCount = getAnalyzedMedicationCount(
    interactionData.analyzed_medications_count,
    analyzedMedicationNames,
  );
  const scan: FoodScanRecord = {
    id: upload.image_id,
    patientId,
    foodName,
    image,
    scannedAt: upload.timestamp,
    risk,
    hasDetectedFood: detection.detected_items.length > 0,
    aiReasoning: `Model ${foodDetectionModelDisplayName} mendeteksi ${foodName}${formatInferencePhrase(detection.inference_time_ms)}${analyzedMedicationCount > 0 ? " dan mencocokkannya dengan obat aktif pasien" : ""}.`,
    result: hasAttentionInteractions ? "Ditemukan potensi interaksi obat-makanan." : "Tidak ditemukan interaksi signifikan pada makanan yang terdeteksi.",
    recommendation: interactionData.overall_recommendation || interactionData.disclaimer,
    detectedItems: detection.detected_items.map(mapDetectedItem),
  };
  const interactions = uniqueInteractions.map((interaction, index) => ({
    foodItem: interaction.food_item,
    foodDisplay: interaction.food_display || formatFoodDisplay(interaction.food_item),
    schedule: createSchedule(interaction, patient, index, interactionData.patient_medication_details),
    risk: toRisk(interaction.severity),
    reasoning: interaction.interaction_description,
    recommendation: interaction.recommendation,
  }));
  await clearFoodScanRelatedCaches();

  const recommendationGroups = splitRecommendationsByRisk(
    interactionData.recommended_foods || [],
    interactionData.foods_to_avoid || [],
  );

  return {
    scan,
    patientName: patient.fullName || "Pasien",
    analyzedMedicationCount,
    analyzedMedications: analyzedMedicationNames,
    analyzedMedicationDetails: interactionData.patient_medication_details ?? [],
    schedules: interactions.map((interaction) => interaction.schedule),
    interactions,
    nutritionItems: nutritionItems.length > 0 ? nutritionItems : undefined,
    nutritionTotal: nutritionItems.length > 0 && nutritionData ? mapNutritionTotal(nutritionData.total) : undefined,
    safeFoods: (interactionData.safe_items || []).map(mapSafeFood),
    recommendedFoods: recommendationGroups.safeRecommendations,
    foodsToAvoid: recommendationGroups.avoidRecommendations,
    disclaimer: interactionData.disclaimer,
    overallRisk: risk,
  };
};

export const getFoodScansFromApi = async (params: { page?: number; limit?: number; patientId?: string; date?: string } = {}): Promise<FoodScanRecord[]> => {
  const cacheKey = `${params.page ?? ""}:${params.limit ?? ""}:${params.patientId ?? ""}:${params.date ?? ""}`;
  const activeRequest = foodScansRequests.get(cacheKey);
  if (activeRequest) return activeRequest;

  const request = api.get<FoodScanListApiResponse>("/food-scans", { params: { page: params.page, limit: params.limit, patient_id: params.patientId, ...getDateRangeParams(params.date) } })
    .then((response) => {
      const scans = response.data.data.map((detail) => mapScanDetail(detail).scan);
      foodScansCache.set(cacheKey, { data: scans });
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
  const cached = foodScanDetailCache.get(scanId);
  if (cached) return cached.data;

  const inFlightRequest = foodScanDetailRequests.get(scanId);
  if (inFlightRequest) return inFlightRequest;

  const request = api.get<FoodScanDetailApiResponse>(`/food-scans/${encodeURIComponent(scanId)}`)
    .then((response) => {
      const analysis = mapScanDetail(response.data.data);
      foodScanDetailCache.set(scanId, { data: analysis });
      return analysis;
    })
    .finally(() => {
      foodScanDetailRequests.delete(scanId);
    });

  foodScanDetailRequests.set(scanId, request);
  return request;
};
