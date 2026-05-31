import { and, count, desc, eq, gt, gte, isNotNull, isNull, lt } from "drizzle-orm";
import axios from "axios";
import sharp from "sharp";
import { db } from "../db";
import {
  detectedItems,
  foodScans,
  interactionResults,
  medicationSchedules,
  patients,
  users,
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

type ImageForDetection = {
  blob: Blob;
  filename: string;
  sourceWidth: number;
  sourceHeight: number;
  detectionWidth: number;
  detectionHeight: number;
};

type ServiceError = {
  status?: number;
  message?: string;
  code?: string;
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
  return "https://aljuan14-jivara-food-detection.hf.space/predict";
};

const getReasoningApiBaseUrl = () => (process.env.FOOD_REASONING_API_URL || process.env.AI_REASONING_URL || "https://ai.jivara.web.id").replace(/\/+$/, "");

const shouldUseDevelopmentFallback = () =>
  process.env.FOOD_AI_ALLOW_LOCAL_FALLBACK === "true";

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

const getDetectionTimeoutMs = () => Number(process.env.FOOD_AI_TIMEOUT_MS || 30000);

const getDetectionImageMaxSize = () => Number(process.env.FOOD_AI_IMAGE_MAX_SIZE || 960);

const getDetectionImageQuality = () => Number(process.env.FOOD_AI_IMAGE_QUALITY || 75);

const isRotatedExifOrientation = (orientation?: number) => orientation !== undefined && orientation >= 5 && orientation <= 8;

const normalizeFoodClass = (value: unknown) => String(value || "makanan_terdeteksi")
  .trim()
  .toLowerCase()
  .replace(/[_\s]+/g, "-")
  .replace(/[^a-z0-9-]/g, "")
  .replace(/-+/g, "-")
  .replace(/^-|-$/g, "") || "makanan_terdeteksi";

const postReasoning = async <T>(path: string, body: unknown): Promise<T> => {
  try {
    const response = await axios.post<T>(`${getReasoningApiBaseUrl()}${path}`, body, { timeout: getReasoningTimeoutMs() });
    return response.data;
  } catch (error) {
    const status = axios.isAxiosError(error) && error.response?.status ? error.response.status : 502;
    throw { status, message: "Service AI reasoning gagal memproses analisis makanan", code: "AI_REASONING_FAILED" };
  }
};

const getFilenameFromImageUrl = (imageUrl: string, contentType: string) => {
  const extension = contentType.includes("png")
    ? "png"
    : contentType.includes("webp")
      ? "webp"
      : "jpg";
  try {
    const pathname = new URL(imageUrl).pathname;
    const filename = pathname.split("/").filter(Boolean).pop();
    return filename || `food-scan.${extension}`;
  } catch {
    return `food-scan.${extension}`;
  }
};

const fetchImageForDetection = async (imageUrl: string): Promise<ImageForDetection> => {
  const response = await fetch(imageUrl, { signal: AbortSignal.timeout(getDetectionTimeoutMs()) });
  if (!response.ok) {
    throw { status: 502, message: "Gagal mengambil gambar dari storage", code: "FOOD_IMAGE_FETCH_FAILED" };
  }

  const contentType = response.headers.get("content-type") || "image/jpeg";
  const buffer = Buffer.from(await response.arrayBuffer());
  const metadata = await sharp(buffer).metadata();
  const sourceWidth = isRotatedExifOrientation(metadata.orientation) ? metadata.height : metadata.width;
  const sourceHeight = isRotatedExifOrientation(metadata.orientation) ? metadata.width : metadata.height;
  const { data: optimizedBuffer, info } = await sharp(buffer)
    .rotate()
    .resize({ width: getDetectionImageMaxSize(), height: getDetectionImageMaxSize(), fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: getDetectionImageQuality(), mozjpeg: true })
    .toBuffer({ resolveWithObject: true });
  const optimizedArrayBuffer = optimizedBuffer.buffer.slice(optimizedBuffer.byteOffset, optimizedBuffer.byteOffset + optimizedBuffer.byteLength) as ArrayBuffer;

  return {
    blob: new Blob([optimizedArrayBuffer], { type: "image/jpeg" }),
    filename: getFilenameFromImageUrl(imageUrl, contentType).replace(/\.[^.]+$/, ".jpg"),
    sourceWidth: sourceWidth || info.width,
    sourceHeight: sourceHeight || info.height,
    detectionWidth: info.width,
    detectionHeight: info.height,
  };
};

const postFoodDetectionMultipart = async (inferenceUrl: string, image: ImageForDetection) => {
  const formData = new FormData();
  formData.append("file", image.blob, image.filename);

  const response = await fetch(inferenceUrl, {
    method: "POST",
    body: formData,
    signal: AbortSignal.timeout(getDetectionTimeoutMs()),
  });

  if (!response.ok) {
    throw { status: response.status, message: "Service YOLO gagal memproses gambar makanan", code: "AI_INFERENCE_FAILED" };
  }

  return response.json();
};

const isServiceError = (error: unknown): error is ServiceError => Boolean(error && typeof error === "object" && typeof (error as ServiceError).status === "number");

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

const toDetectionItem = (item: Record<string, unknown>): DetectionItem => {
  const displayLabel = item.label_display || item.labelDisplay || item.label_final || item.class_name || item.display || item.name || item.label || "Makanan Terdeteksi";

  return {
    label: normalizeFoodClass(item.label || item.label_final || item.class_name || item.class || item.name),
    labelDisplay: String(displayLabel),
    confidence: typeof item.confidence === "number" ? item.confidence : Number(item.score || item.probability || 0),
    boundingBox: item.bounding_box || item.boundingBox || item.bbox || (
      ["x1", "y1", "x2", "y2"].every((key) => typeof item[key] === "number")
        ? { x1: item.x1, y1: item.y1, x2: item.x2, y2: item.y2 }
        : undefined
    ),
  };
};

const toFiniteNumber = (value: unknown) => {
  const numberValue = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(numberValue) ? numberValue : null;
};

const scaleDetectionBoundingBox = (box: unknown, image: ImageForDetection) => {
  if (!box || typeof box !== "object") return box;

  const record = box as Record<string, unknown>;
  const rawLeft = toFiniteNumber(record.x1 ?? record.x);
  const rawTop = toFiniteNumber(record.y1 ?? record.y);
  const rawRight = toFiniteNumber(record.x2);
  const rawBottom = toFiniteNumber(record.y2);
  const rawWidth = toFiniteNumber(record.width);
  const rawHeight = toFiniteNumber(record.height);
  const left = rawLeft ?? 0;
  const top = rawTop ?? 0;
  const right = rawRight ?? (rawWidth !== null ? left + rawWidth : null);
  const bottom = rawBottom ?? (rawHeight !== null ? top + rawHeight : null);

  if (right === null || bottom === null || right <= left || bottom <= top) return box;

  const values = [left, top, right, bottom];
  const isNormalizedBox = values.every((value) => value >= 0 && value <= 1);
  const scaleX = isNormalizedBox ? image.sourceWidth : image.sourceWidth / image.detectionWidth;
  const scaleY = isNormalizedBox ? image.sourceHeight : image.sourceHeight / image.detectionHeight;

  const x1 = Math.round(left * scaleX);
  const y1 = Math.round(top * scaleY);
  const x2 = Math.round(right * scaleX);
  const y2 = Math.round(bottom * scaleY);

  return {
    x1: Math.max(0, Math.min(image.sourceWidth, x1)),
    y1: Math.max(0, Math.min(image.sourceHeight, y1)),
    x2: Math.max(0, Math.min(image.sourceWidth, x2)),
    y2: Math.max(0, Math.min(image.sourceHeight, y2)),
  };
};

const scaleDetectionBoundingBoxes = (result: FoodDetectionResult, image: ImageForDetection): FoodDetectionResult => ({
  ...result,
  detectedItems: result.detectedItems.map((item) => ({
    ...item,
    boundingBox: scaleDetectionBoundingBox(item.boundingBox, image),
  })),
});

const normalizeDetectionResponse = (payload: unknown): FoodDetectionResult => {
  const root = (payload && typeof payload === "object" && "data" in payload ? (payload as { data: unknown }).data : payload) as Record<string, unknown>;
  const rawItems = Array.isArray(root?.detected_items)
    ? root.detected_items
    : Array.isArray(root?.detectedItems)
      ? root.detectedItems
      : Array.isArray(root?.detections)
        ? root.detections
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
    modelVersion: String(root?.model_version || root?.modelVersion || "jivara-food-detection-hf"),
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

const runFoodDetection = async (scan: typeof foodScans.$inferSelect): Promise<FoodDetectionResult> => {
  const inferenceUrl = getAiInferenceUrl();

  if (!inferenceUrl) {
    if (shouldUseDevelopmentFallback()) return getDevelopmentDetectionResult();
    throw { status: 503, message: "Konfigurasi service AI belum tersedia", code: "AI_SERVICE_NOT_CONFIGURED" };
  }

  try {
    const startedAt = Date.now();
    const image = await fetchImageForDetection(resolvePublicImageUrl(scan.imageUrl));
    const payload = await postFoodDetectionMultipart(inferenceUrl, image);
    const result = scaleDetectionBoundingBoxes(normalizeDetectionResponse(payload), image);
    return {
      ...result,
      inferenceTimeMs: result.inferenceTimeMs || Date.now() - startedAt,
    };
  } catch (error) {
    if (shouldUseDevelopmentFallback()) return getDevelopmentDetectionResult();
    if (isServiceError(error)) throw error;
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

const getPatientDisplayName = async (patientId: string) => {
  const patientRows = await db
    .select({ fullName: users.fullName })
    .from(patients)
    .innerJoin(users, eq(patients.userId, users.id))
    .where(eq(patients.id, patientId))
    .limit(1);

  return patientRows[0]?.fullName || "Pasien";
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

  const [items, storedInteractions, activeMedicationData, patientName] = await Promise.all([
    db.select().from(detectedItems).where(eq(detectedItems.scanId, scanId)),
    db.select().from(interactionResults).where(eq(interactionResults.scanId, scanId)),
    getActivePatientMedications(scan.patientId),
    getPatientDisplayName(scan.patientId),
  ]);

  const patientMedications = activeMedicationData.names;
  const patientMedicationDetails = activeMedicationData.details;
  const activeMedicationNames = new Set(patientMedications.map((name) => name.toLocaleUpperCase("id-ID")));
  const interactions = storedInteractions.filter((interaction) => activeMedicationNames.has(interaction.medication.toLocaleUpperCase("id-ID")));
  const recommendedFoods = toFoodScoreArray(scan.recommendedFoods);
  const foodsToAvoid = toFoodScoreArray(scan.foodsToAvoid);
  const recommendationSummary = toRecommendationSummary(scan.recommendationSummary);
  const result = {
    ...mapScanSummary(scan),
    detectedItems: items,
    interactions,
    patientName,
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

  const detectionResult = await runFoodDetection(scan);

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
