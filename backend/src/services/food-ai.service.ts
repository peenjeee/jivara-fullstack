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
import { deleteCachedByPrefix, getCached, invalidateAdherenceCache, invalidateDashboardCache, invalidatePatientReadCache, setCached } from "./cache.service";
import { sendCareTeamCriticalPushNotification } from "./notification.service";
import { getAppDateRangeFromQuery } from "../utils/app-timezone";

const FOOD_SCAN_CACHE_PREFIX = "food-scans:";
const FOOD_SCAN_CACHE_TTL_MS = Number(process.env.FOOD_SCAN_CACHE_TTL_MS || 15_000);

const invalidateFoodScanDependentCaches = () => {
  deleteCachedByPrefix(FOOD_SCAN_CACHE_PREFIX);
  invalidatePatientReadCache();
  invalidateAdherenceCache();
  invalidateDashboardCache();
};

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
  boundingBoxImageWidth?: number;
  boundingBoxImageHeight?: number;
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

type NutritionUnavailableItem = {
  food_item: string;
  reason: string;
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
  return "https://food-detection.jivara.web.id/detect";
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

const uniqueDetectedLabels = (items: readonly unknown[]): string[] => Array.from(items.reduce<Map<string, string>>((labels, item) => {
  const label = normalizeDetectedLabel(item).trim();
  if (!label) return labels;

  const key = label.toLocaleLowerCase("id-ID");
  if (!labels.has(key)) labels.set(key, label);
  return labels;
}, new Map<string, string>()).values());

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

const isAttentionRiskLevel = (riskLevel?: string | null) => {
  const normalized = String(riskLevel || "").trim().toLocaleLowerCase("id-ID");
  return ["sedang", "menengah", "moderate", "medium", "tinggi", "kritis", "critical", "high"].includes(normalized);
};

const getOverallRecommendationText = (riskLevel?: string | null) => isAttentionRiskLevel(riskLevel)
  ? "Ditemukan potensi interaksi obat-makanan. Ikuti alternatif makanan aman dari rekomendasi AI."
  : "Tidak ditemukan interaksi signifikan pada makanan yang terdeteksi.";

type FoodInteractionResult = {
  food_item: string;
  food_display: string;
  medication: string;
  severity: string;
  severity_label: string;
  interaction_description: string;
  recommendation: string;
  sources: string[];
};

const getInteractionResultKey = (interaction: FoodInteractionResult) => [
  interaction.food_item,
  interaction.medication,
  interaction.severity,
  interaction.interaction_description,
  interaction.recommendation,
].map((value) => value.trim().toLocaleLowerCase("id-ID")).join("|");

const dedupeInteractionResults = (interactions: FoodInteractionResult[]) => Array.from(interactions.reduce((uniqueInteractions, interaction) => {
  const key = getInteractionResultKey(interaction);
  if (!uniqueInteractions.has(key)) uniqueInteractions.set(key, interaction);
  return uniqueInteractions;
}, new Map<string, FoodInteractionResult>()).values());

const getReasoningTimeoutMs = () => Number(process.env.FOOD_REASONING_TIMEOUT_MS || process.env.FOOD_AI_TIMEOUT_MS || 10000);

const getDetectionTimeoutMs = () => Number(process.env.FOOD_AI_TIMEOUT_MS || 25000);

const getDetectionImageMaxSize = () => Number(process.env.FOOD_AI_IMAGE_MAX_SIZE || 1280);

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

const isTimeoutError = (error: unknown) => error instanceof DOMException && ["AbortError", "TimeoutError"].includes(error.name);

const getFallbackInteraction = (yoloClass: string): ReasoningInteractionResponse => ({
  detected_food: yoloClass,
  highest_severity: 0,
  status: "fallback",
  detailed_predictions: [],
  llm_reasoning: "Service AI reasoning sedang tidak tersedia untuk makanan ini, jadi tidak ada prediksi interaksi spesifik yang dapat dipastikan pada percobaan ini.",
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
  } catch {
    return getFallbackInteraction(yoloClass);
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

const toNutritionItem = (nutrition: ReasoningNutritionResponse) => ({
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
});

const toUnavailableNutritionItem = (item: NutritionDTO["detectedItems"][number], error: unknown): NutritionUnavailableItem => {
  const message = error && typeof error === "object" && "message" in error && typeof (error as { message?: unknown }).message === "string"
    ? (error as { message: string }).message
    : "Data gizi belum tersedia untuk label makanan ini.";

  return {
    food_item: item.label,
    reason: message,
  };
};

const toFiniteNumber = (value: unknown) => {
  const numberValue = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(numberValue) ? numberValue : null;
};

const getBoxNumber = (record: Record<string, unknown>, ...keys: string[]) => {
  for (const key of keys) {
    const value = toFiniteNumber(record[key]);
    if (value !== null) return value;
  }

  return null;
};

const normalizeBoundingBoxPayload = (box: unknown, formatHint = "") => {
  if (Array.isArray(box) && box.length >= 4) {
    const values = box.slice(0, 4).map(toFiniteNumber);
    if (values.some((value) => value === null)) return box;
    const [first, second, third, fourth] = values as [number, number, number, number];
    return formatHint.includes("xywh")
      ? { x: first, y: second, width: third, height: fourth }
      : { x1: first, y1: second, x2: third, y2: fourth };
  }

  return box;
};

const getDetectionBoundingBox = (item: Record<string, unknown>) => {
  const formatHint = String(item.box_format || item.bbox_format || item.format || "").toLowerCase();
  const directBox = item.bounding_box ?? item.boundingBox ?? item.bbox ?? item.box;
  if (directBox !== undefined && directBox !== null) return normalizeBoundingBoxPayload(directBox, formatHint);

  const x1 = getBoxNumber(item, "x1", "xmin", "left");
  const y1 = getBoxNumber(item, "y1", "ymin", "top");
  const x2 = getBoxNumber(item, "x2", "xmax", "right");
  const y2 = getBoxNumber(item, "y2", "ymax", "bottom");
  if (x1 !== null && y1 !== null && x2 !== null && y2 !== null) return { x1, y1, x2, y2 };

  const x = getBoxNumber(item, "x");
  const y = getBoxNumber(item, "y");
  const width = getBoxNumber(item, "width", "w");
  const height = getBoxNumber(item, "height", "h");
  if (x !== null && y !== null && width !== null && height !== null) {
    return formatHint.includes("center") || formatHint.includes("cxcy")
      ? { cx: x, cy: y, width, height }
      : { x, y, width, height };
  }

  const cx = getBoxNumber(item, "cx", "centerX", "xCenter", "x_center");
  const cy = getBoxNumber(item, "cy", "centerY", "yCenter", "y_center");
  if (cx !== null && cy !== null && width !== null && height !== null) return { cx, cy, width, height };

  return undefined;
};

const getDetectionResponseImageSize = (root: Record<string, unknown>) => {
  const directSize = root.image_size ?? root.imageSize ?? root.input_size ?? root.inputSize;
  const directRecord = directSize && typeof directSize === "object" && !Array.isArray(directSize)
    ? directSize as Record<string, unknown>
    : null;
  const width = directRecord
    ? getBoxNumber(directRecord, "width", "w")
    : getBoxNumber(root, "image_width", "imageWidth", "input_width", "inputWidth", "width");
  const height = directRecord
    ? getBoxNumber(directRecord, "height", "h")
    : getBoxNumber(root, "image_height", "imageHeight", "input_height", "inputHeight", "height");

  return width !== null && height !== null && width > 0 && height > 0
    ? { width, height }
    : null;
};

const toDetectionItem = (item: Record<string, unknown>): DetectionItem => {
  const displayLabel = item.label_display || item.labelDisplay || item.label_final || item.class_name || item.display || item.name || item.label || "Makanan Terdeteksi";
  const rawConfidence = typeof item.confidence === "number" ? item.confidence : Number(item.score || item.probability || 0);

  return {
    label: normalizeFoodClass(item.label || item.label_final || item.class_name || item.class || item.name),
    labelDisplay: String(displayLabel),
    confidence: rawConfidence > 1 ? rawConfidence / 100 : rawConfidence,
    boundingBox: getDetectionBoundingBox(item),
  };
};

const scaleDetectionBoundingBox = (box: unknown, image: ImageForDetection, coordinateWidth: number, coordinateHeight: number) => {
  if (!box || typeof box !== "object") return box;

  const record = box as Record<string, unknown>;
  const rawWidth = getBoxNumber(record, "width", "w");
  const rawHeight = getBoxNumber(record, "height", "h");
  const rawCenterX = getBoxNumber(record, "cx", "centerX", "xCenter", "x_center");
  const rawCenterY = getBoxNumber(record, "cy", "centerY", "yCenter", "y_center");
  const usesCenterPoint = rawCenterX !== null && rawCenterY !== null && rawWidth !== null && rawHeight !== null;
  const rawLeft = usesCenterPoint ? rawCenterX - rawWidth / 2 : getBoxNumber(record, "x1", "xmin", "left", "x");
  const rawTop = usesCenterPoint ? rawCenterY - rawHeight / 2 : getBoxNumber(record, "y1", "ymin", "top", "y");
  const rawRight = getBoxNumber(record, "x2", "xmax", "right");
  const rawBottom = getBoxNumber(record, "y2", "ymax", "bottom");
  const left = rawLeft ?? 0;
  const top = rawTop ?? 0;
  const right = rawRight ?? (rawWidth !== null ? left + rawWidth : null);
  const bottom = rawBottom ?? (rawHeight !== null ? top + rawHeight : null);

  if (right === null || bottom === null || right <= left || bottom <= top) return box;

  const values = [left, top, right, bottom];
  const isNormalizedBox = values.every((value) => value >= 0 && value <= 1);
  const scaledLeft = isNormalizedBox ? left * coordinateWidth : left;
  const scaledTop = isNormalizedBox ? top * coordinateHeight : top;
  const scaledRight = isNormalizedBox ? right * coordinateWidth : right;
  const scaledBottom = isNormalizedBox ? bottom * coordinateHeight : bottom;

  const x1 = Math.round(scaledLeft);
  const y1 = Math.round(scaledTop);
  const x2 = Math.round(scaledRight);
  const y2 = Math.round(scaledBottom);

  return {
    x1: Math.max(0, Math.min(coordinateWidth, x1)),
    y1: Math.max(0, Math.min(coordinateHeight, y1)),
    x2: Math.max(0, Math.min(coordinateWidth, x2)),
    y2: Math.max(0, Math.min(coordinateHeight, y2)),
    imageWidth: coordinateWidth,
    imageHeight: coordinateHeight,
  };
};

const getDetectionBoxAreaRatio = (box: unknown, image: ImageForDetection) => {
  if (!box || typeof box !== "object") return 0;
  const record = box as Record<string, unknown>;
  const x1 = getBoxNumber(record, "x1");
  const y1 = getBoxNumber(record, "y1");
  const x2 = getBoxNumber(record, "x2");
  const y2 = getBoxNumber(record, "y2");
  const imageWidth = getBoxNumber(record, "imageWidth", "image_width", "coordinateWidth", "coordinate_width") ?? image.sourceWidth;
  const imageHeight = getBoxNumber(record, "imageHeight", "image_height", "coordinateHeight", "coordinate_height") ?? image.sourceHeight;
  if (x1 === null || y1 === null || x2 === null || y2 === null) return 0;
  const area = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const imageArea = imageWidth * imageHeight;
  return imageArea > 0 ? area / imageArea : 0;
};

const pruneDuplicateDetections = (items: DetectionItem[], image: ImageForDetection) => {
  const byLabel = new Map<string, DetectionItem>();

  for (const item of items) {
    const areaRatio = getDetectionBoxAreaRatio(item.boundingBox, image);
    if (areaRatio > 0.72 && item.confidence < 0.5) continue;

    const existing = byLabel.get(item.label);
    if (!existing || item.confidence > existing.confidence) {
      byLabel.set(item.label, item);
    }
  }

  return [...byLabel.values()];
};

const scaleDetectionBoundingBoxes = (result: FoodDetectionResult, image: ImageForDetection): FoodDetectionResult => ({
  ...result,
  detectedItems: pruneDuplicateDetections(
    result.detectedItems.map((item) => ({
      ...item,
      boundingBox: scaleDetectionBoundingBox(
        item.boundingBox,
        image,
        result.boundingBoxImageWidth || image.detectionWidth,
        result.boundingBoxImageHeight || image.detectionHeight,
      ),
    })),
    image,
  ),
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
  const imageSize = getDetectionResponseImageSize(root);

  return {
    detectedItems,
    lowConfidenceItems: Array.isArray(root?.low_confidence_items) ? root.low_confidence_items : [],
    inferenceTimeMs: typeof root?.inference_time_ms === "number" ? root.inference_time_ms : Number(root?.inferenceTimeMs || 0),
    modelVersion: String(root?.model_version || root?.modelVersion || "jivara-food-detection-hf"),
    boundingBoxImageWidth: imageSize?.width,
    boundingBoxImageHeight: imageSize?.height,
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
    if (isTimeoutError(error)) {
      throw { status: 503, message: "AI deteksi sedang lambat, coba ulang beberapa saat lagi.", code: "AI_INFERENCE_TIMEOUT" };
    }
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
  overallRecommendation: getOverallRecommendationText(scan.overallRiskLevel),
  createdAt: scan.createdAt,
});

export const listFoodScans = async (query: { page?: string; limit?: string; patient_id?: string; patientId?: string; date?: string; start_date?: string; startDate?: string; end_date?: string; endDate?: string } = {}, user?: AccessUser) => {
  const cacheKey = `food-scans:list:${user?.id || "anon"}:${query.patientId || query.patient_id || "all"}:${query.date || query.startDate || query.start_date || "all"}:${query.endDate || query.end_date || "all"}:${query.page || 1}:${query.limit || 20}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const page = Math.max(Number(query.page || 1), 1);
  const limit = Math.min(Math.max(Number(query.limit || 20), 1), 100);
  const offset = (page - 1) * limit;
  const patientId = query.patientId || query.patient_id;
  const dateRange = getAppDateRangeFromQuery(query);
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
    nutritionItems: scan.nutritionItems || [],
    nutritionTotal: scan.nutritionTotal || null,
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

  invalidateFoodScanDependentCaches();

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

  await db.delete(detectedItems).where(eq(detectedItems.scanId, scan.id));
  if (detectionResult.detectedItems.length > 0) {
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

  invalidateFoodScanDependentCaches();

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

  const detectedLabels = uniqueDetectedLabels(dto.detectedItems);
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
  const interactions = dedupeInteractionResults(interactionChecks.flatMap((check) => check.detailed_predictions
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
    }))));
  const highestSeverity = Math.max(0, ...interactionChecks.map((check) => check.highest_severity));
  const overallRiskLevel = mapRiskScoreToLevel(highestSeverity);

  const hasAttentionInteraction = isAttentionRiskLevel(overallRiskLevel);

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
      attentionRequired: hasAttentionInteraction,
    },
  });

  invalidateFoodScanDependentCaches();

  if (hasAttentionInteraction) {
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
    overall_recommendation: getOverallRecommendationText(overallRiskLevel),
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

  invalidateFoodScanDependentCaches();

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

export const estimateNutrition = async (dto: NutritionDTO, user?: AccessUser) => {
  const nutritionResults = await Promise.allSettled(dto.detectedItems.map((item) => getFoodNutrition(item.label, item.portionGrams || 100)));
  const items = nutritionResults.flatMap((result) => result.status === "fulfilled" ? [toNutritionItem(result.value)] : []);
  const unavailable_items = nutritionResults.flatMap((result, index) => result.status === "rejected" ? [toUnavailableNutritionItem(dto.detectedItems[index], result.reason)] : []);
  const total = {
    calories: items.reduce((sum, item) => sum + item.nutrition.calories, 0),
    protein_g: Number(items.reduce((sum, item) => sum + item.nutrition.protein_g, 0).toFixed(1)),
    fat_g: Number(items.reduce((sum, item) => sum + item.nutrition.fat_g, 0).toFixed(1)),
    carbs_g: Number(items.reduce((sum, item) => sum + item.nutrition.carbs_g, 0).toFixed(1)),
  };

  if (dto.scanId) {
    const scan = await ensureScanExists(dto.scanId);
    if (user) await assertCanAccessPatient(user, scan.patientId);
    await db.update(foodScans).set({ nutritionItems: items, nutritionTotal: total }).where(eq(foodScans.id, dto.scanId));
    invalidateFoodScanDependentCaches();
  }

  return {
    items,
    unavailable_items,
    total,
  };
};
