import { and, count, desc, eq, gt, gte, isNotNull, isNull, lt } from "drizzle-orm";
import axios from "axios";
import { db } from "../db";
import {
  detectedItems,
  foodScans,
  interactionResults,
  medicationSchedules,
  patients,
  auditLogs,
} from "../db/schema";
import {
  FoodRecommendationDTO,
  FoodDetectDTO,
  FoodUploadDTO,
  InteractionCheckDTO,
  NutritionDTO,
} from "../types/food-ai.types";
import { AccessUser, assertCanAccessPatient, scopedPatientFilter } from "./access-control.service";
import { writeAuditLog } from "./audit-log.service";
import { deleteCachedByPrefix, getCached, setCached } from "./cache.service";
import { sendCareTeamCriticalPushNotification } from "./notification.service";

const FOOD_SCAN_CACHE_PREFIX = "food-scans:";
const FOOD_SCAN_CACHE_TTL_MS = Number(process.env.FOOD_SCAN_CACHE_TTL_MS || 15_000);

type DetectionItem = {
  label: string;
  labelDisplay: string;
  confidence: number;
  boundingBox?: unknown;
};

type FoodDetectionResult = {
  detectedItems: DetectionItem[];
  lowConfidenceItems: unknown[];
  inferenceTimeMs: number;
  modelVersion: string;
};

type ReasoningFoodScore = {
  food_name: string;
  severity_score: number;
  risk_level: string;
  worst_category: string | null;
};

type ReasoningInteractionResponse = {
  detected_food: string;
  highest_severity: number;
  status: string;
  detailed_predictions: Array<{
    medication: string;
    severity_score: number;
    risk_level: string;
    mechanisms?: string[];
    matched_categories?: string[];
    risky_categories?: string[];
  }>;
  llm_reasoning?: string;
  recommended_foods?: ReasoningFoodScore[];
  alert_sent?: boolean;
};

type ReasoningRecommendResponse = {
  patient_medications: string[];
  matched_categories?: Record<string, string[]>;
  total_foods_analyzed?: number;
  summary?: { safe: number; avoid: number };
  recommended_foods: ReasoningFoodScore[];
  foods_to_avoid?: ReasoningFoodScore[];
};

type RecommendationSummary = {
  safe: number;
  avoid: number;
};

type ReasoningNutritionResponse = {
  status: string;
  yolo_class: string;
  matched_food: string;
  portion_grams: number;
  nutrition_facts: {
    calories_kcal: number;
    proteins_g: number;
    fats_g: number;
    carbohydrates_g: number;
  };
};

const DEVELOPMENT_DETECTED_ITEMS: DetectionItem[] = [
  {
    label: "nasi-goreng",
    labelDisplay: "Nasi Goreng",
    confidence: 0.94,
    boundingBox: { x: 120, y: 80, width: 200, height: 180 },
  },
  {
    label: "rendang",
    labelDisplay: "Rendang Daging",
    confidence: 0.88,
    boundingBox: { x: 350, y: 100, width: 180, height: 160 },
  },
  {
    label: "kangkung",
    labelDisplay: "Kangkung",
    confidence: 0.72,
    boundingBox: { x: 100, y: 300, width: 220, height: 120 },
  },
];

const getAiInferenceUrl = () => {
  if (process.env.FOOD_AI_INFERENCE_URL) return process.env.FOOD_AI_INFERENCE_URL;
  if (process.env.AI_INFERENCE_URL) return process.env.AI_INFERENCE_URL;
  if (process.env.FASTAPI_URL) return `${process.env.FASTAPI_URL.replace(/\/$/, "")}/food-scans/detections`;
  return undefined;
};

const getReasoningApiBaseUrl = () => (process.env.FOOD_REASONING_API_URL || process.env.AI_REASONING_URL || "https://ai.jivara.web.id").replace(/\/+$/, "");

const shouldUseDevelopmentFallback = () =>
  process.env.FOOD_AI_ALLOW_LOCAL_FALLBACK === "true" || process.env.NODE_ENV !== "production";

const resolvePublicImageUrl = (imageUrl: string) => {
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;
  return `${(process.env.API_URL || "http://localhost:3001").replace(/\/$/, "")}${imageUrl.startsWith("/") ? "" : "/"}${imageUrl}`;
};

const normalizeDetectedLabel = (item: unknown) => {
  if (typeof item === "string") return item;
  if (item && typeof item === "object") {
    const record = item as Record<string, unknown>;
    return String(record.label || record.food_item || record.yolo_class || "");
  }

  return "";
};

const normalizeMedicationNames = (medications: Array<{ drugName: string }>) => medications.map((medication) => medication.drugName.toUpperCase());

const mapMedicationDetails = (medications: Array<{ drugName: string; registrationNumber?: string | null; compositionNormalized?: string | null; activeSubstances?: string | null; drugCategories?: string | null; medicineForm?: string | null }>) => medications.map((medication) => ({
  drugName: medication.drugName,
  registrationNumber: medication.registrationNumber || null,
  compositionNormalized: medication.compositionNormalized || null,
  activeSubstances: medication.activeSubstances || null,
  drugCategories: medication.drugCategories || null,
  medicineForm: medication.medicineForm || null,
}));

const mapRiskScoreToLevel = (score: number) => {
  if (score >= 4) return "tinggi";
  if (score >= 2) return "sedang";
  return "rendah";
};

const getReasoningTimeoutMs = () => Number(process.env.FOOD_REASONING_TIMEOUT_MS || process.env.FOOD_AI_TIMEOUT_MS || 10000);

const postReasoning = async <T>(path: string, body: unknown): Promise<T> => {
  try {
    const response = await axios.post<T>(`${getReasoningApiBaseUrl()}${path}`, body, { timeout: getReasoningTimeoutMs() });
    return response.data;
  } catch (error) {
    const status = axios.isAxiosError(error) && error.response?.status ? error.response.status : 502;
    throw { status, message: "Service AI reasoning gagal memproses analisis makanan", code: "AI_REASONING_FAILED" };
  }
};

const getFallbackInteraction = (yoloClass: string): ReasoningInteractionResponse => ({
  detected_food: yoloClass,
  highest_severity: 0,
  status: "fallback",
  detailed_predictions: [],
  llm_reasoning: "Service AI reasoning sedang lambat, jadi hasil sementara ditandai aman sampai analisis berikutnya tersedia.",
  recommended_foods: [],
});

const getFallbackRecommendations = (patientMedications: string[]): ReasoningRecommendResponse => ({
  patient_medications: patientMedications,
  matched_categories: {},
  summary: { safe: 0, avoid: 0 },
  recommended_foods: [],
  foods_to_avoid: [],
});

const getFallbackNutrition = (yoloClass: string, portionGrams: number): ReasoningNutritionResponse => ({
  status: "fallback",
  yolo_class: yoloClass,
  matched_food: yoloClass.replace(/-/g, " "),
  portion_grams: portionGrams,
  nutrition_facts: {
    calories_kcal: 0,
    proteins_g: 0,
    fats_g: 0,
    carbohydrates_g: 0,
  },
});

const getRecommendationKey = (food: ReasoningFoodScore) => food.food_name.trim().toLowerCase();

const isSafeFoodRecommendation = (food: ReasoningFoodScore) => {
  const risk = food.risk_level.trim().toLowerCase();
  if (["aman", "ringan", "rendah", "safe", "low", "low risk"].includes(risk)) return true;
  if (["sedang", "menengah", "moderate", "medium", "tinggi", "high", "high risk", "kritis", "critical"].includes(risk)) return false;
  return food.severity_score <= 1;
};

const splitRecommendationsByRisk = (recommendationData: ReasoningRecommendResponse) => {
  const byName = new Map<string, ReasoningFoodScore>();

  [...recommendationData.recommended_foods, ...(recommendationData.foods_to_avoid || [])].forEach((food) => {
    const key = getRecommendationKey(food);
    const existing = byName.get(key);
    if (!existing || food.severity_score > existing.severity_score) byName.set(key, food);
  });

  const recommendedFoods: ReasoningFoodScore[] = [];
  const foodsToAvoid: ReasoningFoodScore[] = [];

  byName.forEach((food) => {
    if (isSafeFoodRecommendation(food)) {
      recommendedFoods.push(food);
    } else {
      foodsToAvoid.push(food);
    }
  });

  return {
    recommendedFoods,
    foodsToAvoid,
    summary: {
      ...(recommendationData.summary || {}),
      safe: recommendedFoods.length,
      avoid: foodsToAvoid.length,
    },
  };
};

const toFoodScoreArray = (value: unknown): ReasoningFoodScore[] => (
  Array.isArray(value) ? value.filter((item): item is ReasoningFoodScore => Boolean(item && typeof item === "object" && "food_name" in item)) : []
);

const toRecommendationSummary = (value: unknown): RecommendationSummary | undefined => {
  if (!value || typeof value !== "object") return undefined;
  const summary = value as Partial<RecommendationSummary>;
  return {
    safe: Number(summary.safe || 0),
    avoid: Number(summary.avoid || 0),
  };
};

const checkFoodInteractionWithReasoning = async (yoloClass: string, patientMedications: string[]) => {
  try {
    return await postReasoning<ReasoningInteractionResponse>("/interaction-check", { yolo_class: yoloClass, patient_medications: patientMedications });
  } catch (error) {
    if (shouldUseDevelopmentFallback()) return getFallbackInteraction(yoloClass);
    throw error;
  }
};

const getFoodRecommendations = async (patientMedications: string[], topN = 100) => {
  try {
    return await postReasoning<ReasoningRecommendResponse>("/recommend", { patient_medications: patientMedications, top_n: topN });
  } catch (error) {
    if (shouldUseDevelopmentFallback()) return getFallbackRecommendations(patientMedications);
    throw error;
  }
};

const getFoodNutrition = async (yoloClass: string, portionGrams = 100) => {
  try {
    return await postReasoning<ReasoningNutritionResponse>("/nutrition", { yolo_class: yoloClass, portion_grams: portionGrams });
  } catch (error) {
    if (shouldUseDevelopmentFallback()) return getFallbackNutrition(yoloClass, portionGrams);
    throw error;
  }
};

const toDetectionItem = (item: Record<string, unknown>): DetectionItem => ({
  label: String(item.label || item.class || item.name || "makanan_terdeteksi"),
  labelDisplay: String(item.label_display || item.labelDisplay || item.display || item.name || item.label || "Makanan Terdeteksi"),
  confidence: typeof item.confidence === "number" ? item.confidence : Number(item.score || item.probability || 0),
  boundingBox: item.bounding_box || item.boundingBox || item.bbox,
});

const normalizeDetectionResponse = (payload: unknown): FoodDetectionResult => {
  const root = (payload && typeof payload === "object" && "data" in payload ? (payload as { data: unknown }).data : payload) as Record<string, unknown>;
  const rawItems = Array.isArray(root?.detected_items)
    ? root.detected_items
    : Array.isArray(root?.detectedItems)
      ? root.detectedItems
      : Array.isArray(root?.predictions)
        ? root.predictions
        : [];

  const detectedItems = rawItems
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map(toDetectionItem)
    .filter((item) => item.label.length > 0);

  if (detectedItems.length === 0) {
    throw { status: 502, message: "Service AI tidak mengembalikan hasil deteksi", code: "AI_EMPTY_DETECTION" };
  }

  return {
    detectedItems,
    lowConfidenceItems: Array.isArray(root?.low_confidence_items) ? root.low_confidence_items : [],
    inferenceTimeMs: typeof root?.inference_time_ms === "number" ? root.inference_time_ms : Number(root?.inferenceTimeMs || 0),
    modelVersion: String(root?.model_version || root?.modelVersion || "external-food-ai"),
  };
};

const getDevelopmentDetectionResult = (): FoodDetectionResult => ({
  detectedItems: DEVELOPMENT_DETECTED_ITEMS,
  lowConfidenceItems: [
    {
      label: "sayuran_tidak_dikenali",
      top_predictions: [
        { label: "bayam", confidence: 0.35 },
        { label: "kangkung", confidence: 0.30 },
        { label: "daun_singkong", confidence: 0.20 },
      ],
      message: "Tidak yakin - apakah ini bayam?",
    },
  ],
  inferenceTimeMs: 1840,
  modelVersion: "AI",
});

const runFoodDetection = async (scan: typeof foodScans.$inferSelect, patientId: string): Promise<FoodDetectionResult> => {
  const inferenceUrl = getAiInferenceUrl();

  if (!inferenceUrl) {
    if (shouldUseDevelopmentFallback()) return getDevelopmentDetectionResult();
    throw { status: 503, message: "Konfigurasi service AI belum tersedia", code: "AI_SERVICE_NOT_CONFIGURED" };
  }

  try {
    const startedAt = Date.now();
    const response = await axios.post(inferenceUrl, {
      scanId: scan.id,
      patientId,
      imageUrl: resolvePublicImageUrl(scan.imageUrl),
    }, {
      timeout: Number(process.env.FOOD_AI_TIMEOUT_MS || 10000),
    });
    const result = normalizeDetectionResponse(response.data);
    return {
      ...result,
      inferenceTimeMs: result.inferenceTimeMs || Date.now() - startedAt,
    };
  } catch (error) {
    if (shouldUseDevelopmentFallback()) return getDevelopmentDetectionResult();
    const status = axios.isAxiosError(error) && error.response?.status ? error.response.status : 502;
    throw { status, message: "Service AI gagal memproses gambar makanan", code: "AI_INFERENCE_FAILED" };
  }
};

const ensurePatientExists = async (patientId: string) => {
  const patient = await db.select({ id: patients.id }).from(patients).where(eq(patients.id, patientId)).limit(1);
  if (patient.length === 0) {
    throw { status: 404, message: "Pasien tidak ditemukan", code: "PATIENT_NOT_FOUND" };
  }
};

const ensureScanExists = async (scanId: string, patientId?: string) => {
  const scan = await db.select().from(foodScans).where(eq(foodScans.id, scanId)).limit(1);
  if (scan.length === 0) {
    throw { status: 404, message: "Scan makanan tidak ditemukan", code: "SCAN_NOT_FOUND" };
  }

  if (patientId && scan[0].patientId !== patientId) {
    throw { status: 403, message: "Scan makanan tidak sesuai dengan pasien", code: "FORBIDDEN" };
  }

  return scan[0];
};

const getActivePatientMedications = async (patientId: string) => {
  const activeMedications = await db
    .select({
      drugName: medicationSchedules.drugName,
      registrationNumber: medicationSchedules.registrationNumber,
      compositionNormalized: medicationSchedules.compositionNormalized,
      activeSubstances: medicationSchedules.activeSubstances,
      drugCategories: medicationSchedules.drugCategories,
      medicineForm: medicationSchedules.medicineForm,
    })
    .from(medicationSchedules)
    .where(and(
      eq(medicationSchedules.patientId, patientId),
      eq(medicationSchedules.isActive, true),
      gt(medicationSchedules.stock, 0),
      isNull(medicationSchedules.completedAt),
    ));

  return { names: normalizeMedicationNames(activeMedications), details: mapMedicationDetails(activeMedications) };
};

const writeFoodScanAuditLogOnce = async (input: {
  userId?: string | null;
  action: string;
  scanId: string;
  changes: Record<string, unknown>;
}) => {
  const existingLog = await db
    .select({ id: auditLogs.id })
    .from(auditLogs)
    .where(and(
      eq(auditLogs.action, input.action),
      eq(auditLogs.resourceType, "food_scan"),
      eq(auditLogs.resourceId, input.scanId),
    ))
    .limit(1);

  if (existingLog.length > 0) return;

  await writeAuditLog({
    userId: input.userId || null,
    action: input.action,
    resourceType: "food_scan",
    resourceId: input.scanId,
    changes: input.changes,
  });
};

const mapScanSummary = (scan: typeof foodScans.$inferSelect) => ({
  id: scan.id,
  patientId: scan.patientId,
  imageUrl: scan.imageUrl,
  imageSizeKb: scan.imageSizeKb,
  inferenceTimeMs: scan.inferenceTimeMs,
  modelVersion: scan.modelVersion,
  overallRiskScore: scan.overallRiskScore,
  overallRiskLevel: scan.overallRiskLevel,
  createdAt: scan.createdAt,
});

const getDateRange = (query: { date?: string; start_date?: string; startDate?: string; end_date?: string; endDate?: string }) => {
  const startValue = query.startDate || query.start_date || query.date;
  const endValue = query.endDate || query.end_date || startValue;
  if (!startValue || !endValue) return null;

  const start = new Date(`${startValue}T00:00:00.000Z`);
  const end = new Date(`${endValue}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;

  const normalizedStart = start <= end ? start : end;
  const normalizedEnd = start <= end ? end : start;
  normalizedEnd.setUTCDate(normalizedEnd.getUTCDate() + 1);
  return { start: normalizedStart, end: normalizedEnd };
};

export const listFoodScans = async (query: { page?: string; limit?: string; patient_id?: string; patientId?: string; date?: string; start_date?: string; startDate?: string; end_date?: string; endDate?: string } = {}, user?: AccessUser) => {
  const cacheKey = `food-scans:list:${user?.id || "anon"}:${query.patientId || query.patient_id || "all"}:${query.date || query.startDate || query.start_date || "all"}:${query.endDate || query.end_date || "all"}:${query.page || 1}:${query.limit || 20}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const page = Math.max(Number(query.page || 1), 1);
  const limit = Math.min(Math.max(Number(query.limit || 20), 1), 100);
  const offset = (page - 1) * limit;
  const patientId = query.patientId || query.patient_id;
  const dateRange = getDateRange(query);
  const scopedFilter = await scopedPatientFilter(foodScans.patientId, user, patientId);

  if (!scopedFilter.scope.allowed) {
    const emptyResult = { data: [], meta: { page, limit, total: 0 } };
    setCached(cacheKey, emptyResult, FOOD_SCAN_CACHE_TTL_MS);
    return emptyResult;
  }

  const conditions = [];
  if (scopedFilter.condition) conditions.push(scopedFilter.condition);
  conditions.push(isNotNull(foodScans.overallRiskLevel));
  if (dateRange) {
    conditions.push(gte(foodScans.createdAt, dateRange.start));
    conditions.push(lt(foodScans.createdAt, dateRange.end));
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const [rows, totalRows] = await Promise.all([
    db.select().from(foodScans).where(where).orderBy(desc(foodScans.createdAt)).limit(limit).offset(offset),
    db.select({ total: count() }).from(foodScans).where(where),
  ]);

  const result = {
    data: rows.map(mapScanSummary),
    meta: { page, limit, total: totalRows[0]?.total || 0 },
  };

  setCached(cacheKey, result, FOOD_SCAN_CACHE_TTL_MS);
  return result;
};

export const getFoodScanById = async (scanId: string, user?: AccessUser) => {
  const cacheKey = `food-scans:detail:${user?.id || "anon"}:${scanId}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const scan = await ensureScanExists(scanId);
  if (user) await assertCanAccessPatient(user, scan.patientId);

  const [items, interactions, activeMedications] = await Promise.all([
    db.select().from(detectedItems).where(eq(detectedItems.scanId, scanId)),
    db.select().from(interactionResults).where(eq(interactionResults.scanId, scanId)),
    db
      .select({
        drugName: medicationSchedules.drugName,
        registrationNumber: medicationSchedules.registrationNumber,
        compositionNormalized: medicationSchedules.compositionNormalized,
        activeSubstances: medicationSchedules.activeSubstances,
        drugCategories: medicationSchedules.drugCategories,
        medicineForm: medicationSchedules.medicineForm,
      })
      .from(medicationSchedules)
      .where(and(
        eq(medicationSchedules.patientId, scan.patientId),
        eq(medicationSchedules.isActive, true),
        isNull(medicationSchedules.completedAt),
      )),
  ]);

  const patientMedications = normalizeMedicationNames(activeMedications);
  const patientMedicationDetails = mapMedicationDetails(activeMedications);
  const recommendedFoods = toFoodScoreArray(scan.recommendedFoods);
  const foodsToAvoid = toFoodScoreArray(scan.foodsToAvoid);
  const recommendationSummary = toRecommendationSummary(scan.recommendationSummary);
  const result = {
    ...mapScanSummary(scan),
    detectedItems: items,
    interactions,
    patientMedications,
    patientMedicationDetails,
    analyzedMedicationCount: patientMedications.length,
    recommendedFoods,
    foodsToAvoid,
    recommendationSummary,
    matchedMedicationCategories: scan.matchedMedicationCategories || {},
    disclaimer: "Ini bukan nasihat medis. Selalu konsultasikan dengan dokter atau apoteker Anda.",
  };

  setCached(cacheKey, result, FOOD_SCAN_CACHE_TTL_MS);
  return result;
};

export const uploadFoodImage = async (dto: FoodUploadDTO, user?: AccessUser) => {
  await ensurePatientExists(dto.patientId);
  if (user) await assertCanAccessPatient(user, dto.patientId);

  const [scan] = await db
    .insert(foodScans)
    .values({
      patientId: dto.patientId,
      imageUrl: dto.imageUrl || `https://storage.jivara.app/scans/scan-${Date.now()}.jpg`,
      imageSizeKb: dto.imageSizeKb || 450,
      modelVersion: "pending-food-ai-inference",
    })
    .returning();

  deleteCachedByPrefix(FOOD_SCAN_CACHE_PREFIX);

  return {
    image_id: scan.id,
    upload_url: scan.imageUrl,
    image_size_kb: scan.imageSizeKb,
    timestamp: scan.createdAt,
  };
};

export const detectFood = async (dto: FoodDetectDTO, user?: AccessUser) => {
  await ensurePatientExists(dto.patientId);
  if (user) await assertCanAccessPatient(user, dto.patientId);

  const scan = dto.imageId
    ? await ensureScanExists(dto.imageId, dto.patientId)
    : (await db
      .insert(foodScans)
      .values({
        patientId: dto.patientId,
        imageUrl: `https://storage.jivara.app/scans/scan-${Date.now()}.jpg`,
        imageSizeKb: 450,
        modelVersion: "pending-food-ai-inference",
      })
      .returning())[0];

  const detectionResult = await runFoodDetection(scan, dto.patientId);

  const existingItems = await db.select({ id: detectedItems.id }).from(detectedItems).where(eq(detectedItems.scanId, scan.id)).limit(1);
  if (existingItems.length === 0) {
    await db.insert(detectedItems).values(detectionResult.detectedItems.map((item) => ({
      scanId: scan.id,
      label: item.label,
      labelDisplay: item.labelDisplay,
      confidence: item.confidence,
      boundingBox: item.boundingBox,
    })));
  }

  await db
    .update(foodScans)
    .set({ inferenceTimeMs: detectionResult.inferenceTimeMs, modelVersion: detectionResult.modelVersion })
    .where(eq(foodScans.id, scan.id));

  deleteCachedByPrefix(FOOD_SCAN_CACHE_PREFIX);

  return {
    scan_id: scan.id,
    detected_items: detectionResult.detectedItems.map((item) => ({
      label: item.label,
      label_display: item.labelDisplay,
      confidence: item.confidence,
      bounding_box: item.boundingBox,
    })),
    low_confidence_items: detectionResult.lowConfidenceItems,
    inference_time_ms: detectionResult.inferenceTimeMs,
    model_version: detectionResult.modelVersion,
    timestamp: new Date(),
  };
};

export const checkInteraction = async (dto: InteractionCheckDTO, user?: AccessUser) => {
  await ensurePatientExists(dto.patientId);
  if (user) await assertCanAccessPatient(user, dto.patientId);
  await ensureScanExists(dto.scanId, dto.patientId);

  const detectedLabels = dto.detectedItems.map(normalizeDetectedLabel).filter(Boolean);
  const activeMedicationData = await getActivePatientMedications(dto.patientId);
  const patientMedications = activeMedicationData.names;
  const shouldIncludeRecommendations = dto.includeRecommendations !== false;
  const [interactionChecks, recommendationData] = await Promise.all([
    Promise.all(detectedLabels.map((label) => checkFoodInteractionWithReasoning(label, patientMedications))),
    shouldIncludeRecommendations
      ? getFoodRecommendations(patientMedications, 100)
      : Promise.resolve(getFallbackRecommendations(patientMedications)),
  ]);
  const recommendationGroups = splitRecommendationsByRisk(recommendationData);
  const interactions = interactionChecks.flatMap((check) => check.detailed_predictions
    .filter((prediction) => prediction.severity_score > 0)
    .map((prediction) => ({
      food_item: check.detected_food,
      food_display: check.detected_food.replace(/-/g, " "),
      medication: prediction.medication,
      severity: prediction.risk_level || mapRiskScoreToLevel(prediction.severity_score),
      severity_label: prediction.risk_level || mapRiskScoreToLevel(prediction.severity_score),
      interaction_description: check.llm_reasoning || prediction.mechanisms?.join("; ") || "AI reasoning mendeteksi potensi interaksi obat-makanan.",
      recommendation: check.recommended_foods?.length
        ? `Alternatif aman: ${check.recommended_foods.map((food) => food.food_name).join(", ")}.`
        : "Ikuti rekomendasi tenaga kesehatan dan pantau gejala setelah makan.",
      sources: ["Jivara AI Reasoning"],
    })));
  const highestSeverity = Math.max(0, ...interactionChecks.map((check) => check.highest_severity));
  const overallRiskLevel = mapRiskScoreToLevel(highestSeverity);

  if (interactions.length > 0) {
    await db.insert(interactionResults).values(interactions.map((interaction) => ({
      scanId: dto.scanId,
      foodItem: interaction.food_item,
      medication: interaction.medication,
      severity: interaction.severity,
      interactionDescription: interaction.interaction_description,
      recommendation: interaction.recommendation,
      sources: interaction.sources,
    })));
  }

  await db
    .update(foodScans)
    .set({
      overallRiskScore: highestSeverity,
      overallRiskLevel,
      ...(shouldIncludeRecommendations
        ? {
          recommendedFoods: recommendationGroups.recommendedFoods,
          foodsToAvoid: recommendationGroups.foodsToAvoid,
          recommendationSummary: recommendationGroups.summary,
          matchedMedicationCategories: recommendationData.matched_categories || {},
          recommendationPatientMedications: patientMedications,
          analyzedMedicationCount: patientMedications.length,
        }
        : {}),
    })
    .where(eq(foodScans.id, dto.scanId));

  await writeFoodScanAuditLogOnce({
    userId: user?.id || null,
    action: "food_scan.uploaded",
    scanId: dto.scanId,
    changes: { patientId: dto.patientId, finalizedAfterAnalysis: true },
  });

  await writeFoodScanAuditLogOnce({
    userId: user?.id || null,
    action: "food_scan.detected",
    scanId: dto.scanId,
    changes: { patientId: dto.patientId, detectedItems: detectedLabels.length },
  });

  await writeAuditLog({
    userId: user?.id || null,
    action: "food_scan.interaction_checked",
    resourceType: "food_scan",
    resourceId: dto.scanId,
    changes: {
      patientId: dto.patientId,
      interactionCount: interactions.length,
      detectedItems: detectedLabels.length,
      recommendationCount: shouldIncludeRecommendations ? recommendationGroups.recommendedFoods.length : 0,
    },
  });

  deleteCachedByPrefix(FOOD_SCAN_CACHE_PREFIX);

  if (interactions.length > 0) {
    await sendCareTeamCriticalPushNotification(dto.patientId, {
      type: "food_interaction_detected",
      title: "Interaksi makanan terdeteksi",
      body: `${interactions.length} potensi interaksi makanan-obat membutuhkan perhatian.`,
      urgency: "urgent",
      data: {
        patient_id: dto.patientId,
        scan_id: dto.scanId,
        interaction_count: interactions.length,
        action_url: "/dashboard",
      },
    }).catch(() => undefined);
  }

  return {
    interactions,
    patient_medications: patientMedications,
    patient_medication_details: activeMedicationData.details,
    analyzed_medications_count: patientMedications.length,
    safe_items: detectedLabels
      .filter((item) => !interactions.some((interaction) => interaction.food_item === item))
      .map((item) => ({ food_item: item, food_display: item.replace(/-/g, " "), status: "aman" })),
    recommended_foods: recommendationGroups.recommendedFoods,
    foods_to_avoid: recommendationGroups.foodsToAvoid,
    recommendation_summary: recommendationGroups.summary,
    matched_medication_categories: recommendationData.matched_categories || {},
    overall_risk_score: highestSeverity,
    overall_risk_level: overallRiskLevel,
    overall_recommendation: interactions.length > 0
      ? "Ditemukan potensi interaksi obat-makanan. Ikuti alternatif makanan aman dari rekomendasi AI."
      : "Tidak ditemukan interaksi signifikan pada makanan yang terdeteksi.",
    disclaimer: "Ini bukan nasihat medis. Selalu konsultasikan dengan dokter atau apoteker Anda.",
    timestamp: new Date(),
  };
};

export const recommendFoods = async (dto: FoodRecommendationDTO, user?: AccessUser) => {
  await ensurePatientExists(dto.patientId);
  if (user) await assertCanAccessPatient(user, dto.patientId);
  await ensureScanExists(dto.scanId, dto.patientId);

  const activeMedicationData = await getActivePatientMedications(dto.patientId);
  const patientMedications = activeMedicationData.names;
  const topN = Math.min(Math.max(Number(dto.topN || 100), 1), 100);
  const recommendationData = await getFoodRecommendations(patientMedications, topN);
  const recommendationGroups = splitRecommendationsByRisk(recommendationData);

  await db
    .update(foodScans)
    .set({
      recommendedFoods: recommendationGroups.recommendedFoods,
      foodsToAvoid: recommendationGroups.foodsToAvoid,
      recommendationSummary: recommendationGroups.summary,
      matchedMedicationCategories: recommendationData.matched_categories || {},
      recommendationPatientMedications: patientMedications,
      analyzedMedicationCount: patientMedications.length,
    })
    .where(eq(foodScans.id, dto.scanId));

  deleteCachedByPrefix(FOOD_SCAN_CACHE_PREFIX);

  return {
    patient_medications: patientMedications,
    patient_medication_details: activeMedicationData.details,
    analyzed_medications_count: patientMedications.length,
    recommended_foods: recommendationGroups.recommendedFoods,
    foods_to_avoid: recommendationGroups.foodsToAvoid,
    recommendation_summary: recommendationGroups.summary,
    matched_medication_categories: recommendationData.matched_categories || {},
    timestamp: new Date(),
  };
};

export const estimateNutrition = async (dto: NutritionDTO) => {
  const nutritionResponses = await Promise.all(dto.detectedItems.map((item) => getFoodNutrition(item.label, item.portionGrams || 100)));
  const items = nutritionResponses.map((nutrition) => ({
    food_item: nutrition.yolo_class,
    food_display: nutrition.matched_food,
    portion: `${nutrition.portion_grams} gram`,
    nutrition: {
      calories: nutrition.nutrition_facts.calories_kcal,
      protein_g: nutrition.nutrition_facts.proteins_g,
      fat_g: nutrition.nutrition_facts.fats_g,
      carbs_g: nutrition.nutrition_facts.carbohydrates_g,
    },
    source: "Jivara AI Nutrition",
  }));

  return {
    items,
    total: {
      calories: items.reduce((sum, item) => sum + item.nutrition.calories, 0),
      protein_g: Number(items.reduce((sum, item) => sum + item.nutrition.protein_g, 0).toFixed(1)),
      fat_g: Number(items.reduce((sum, item) => sum + item.nutrition.fat_g, 0).toFixed(1)),
      carbs_g: Number(items.reduce((sum, item) => sum + item.nutrition.carbs_g, 0).toFixed(1)),
    },
  };
};
