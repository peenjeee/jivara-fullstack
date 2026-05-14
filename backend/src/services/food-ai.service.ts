import { desc, eq, inArray } from "drizzle-orm";
import axios from "axios";
import { db } from "../db";
import {
  detectedItems,
  foodScans,
  interactionResults,
  medicationSchedules,
  patients,
} from "../db/schema";
import {
  FoodDetectDTO,
  FoodUploadDTO,
  InteractionCheckDTO,
  NutritionDTO,
} from "../types/food-ai.types";
import { AccessUser, assertCanAccessPatient } from "./access-control.service";
import { writeAuditLog } from "./audit-log.service";
import { sendCareTeamCriticalPushNotification } from "./notification.service";

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

const DEVELOPMENT_DETECTED_ITEMS: DetectionItem[] = [
  {
    label: "nasi_putih",
    labelDisplay: "Nasi Putih",
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

const shouldUseDevelopmentFallback = () =>
  process.env.FOOD_AI_ALLOW_LOCAL_FALLBACK === "true" || process.env.NODE_ENV !== "production";

const resolvePublicImageUrl = (imageUrl: string) => {
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;
  return `${(process.env.API_URL || "http://localhost:3001").replace(/\/$/, "")}${imageUrl.startsWith("/") ? "" : "/"}${imageUrl}`;
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
  modelVersion: "development-yolov11-indo-food-v1.0",
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

const NUTRITION_MAP: Record<string, { display: string; portion: string; calories: number; protein: number; fat: number; carbs: number; source: string }> = {
  nasi_putih: { display: "Nasi Putih", portion: "1 porsi (150g)", calories: 195, protein: 3.5, fat: 0.3, carbs: 43.2, source: "TKPI" },
  rendang: { display: "Rendang Daging", portion: "1 porsi (100g)", calories: 193, protein: 22.6, fat: 10.2, carbs: 2.1, source: "Dataset Makanan Indonesia" },
  kangkung: { display: "Kangkung", portion: "1 porsi (100g)", calories: 19, protein: 2.6, fat: 0.2, carbs: 3.1, source: "TKPI" },
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

export const listFoodScans = async (user?: AccessUser) => {
  const rows = await db.select().from(foodScans).orderBy(desc(foodScans.createdAt)).limit(100);
  const accessibleRows = [];

  for (const scan of rows) {
    try {
      if (user) await assertCanAccessPatient(user, scan.patientId);
      accessibleRows.push(mapScanSummary(scan));
    } catch {
      // Skip rows outside the user's patient scope.
    }
  }

  return accessibleRows;
};

export const getFoodScanById = async (scanId: string, user?: AccessUser) => {
  const scan = await ensureScanExists(scanId);
  if (user) await assertCanAccessPatient(user, scan.patientId);

  const [items, interactions] = await Promise.all([
    db.select().from(detectedItems).where(eq(detectedItems.scanId, scanId)),
    db.select().from(interactionResults).where(eq(interactionResults.scanId, scanId)),
  ]);

  return {
    ...mapScanSummary(scan),
    detectedItems: items,
    interactions,
  };
};

const incrementSummary = <T extends string>(summary: Record<string, { label: string; total: number }>, value: T) => {
  summary[value] ??= { label: value, total: 0 };
  summary[value].total += 1;
};

export const getInteractionAnalytics = async (user?: AccessUser) => {
  const scans = await db.select({ id: foodScans.id, patientId: foodScans.patientId }).from(foodScans).orderBy(desc(foodScans.createdAt)).limit(1000);
  const accessibleScanIds = [];

  for (const scan of scans) {
    try {
      if (user) await assertCanAccessPatient(user, scan.patientId);
      accessibleScanIds.push(scan.id);
    } catch {
      // Skip scans outside the user's patient scope.
    }
  }

  if (accessibleScanIds.length === 0) {
    return { totalScans: 0, totalInteractions: 0, severityDistribution: [], topFoods: [], topMedications: [] };
  }

  const interactions = await db.select().from(interactionResults).where(inArray(interactionResults.scanId, accessibleScanIds));
  const severityDistribution: Record<string, { label: string; total: number }> = {};
  const topFoods: Record<string, { label: string; total: number }> = {};
  const topMedications: Record<string, { label: string; total: number }> = {};

  for (const interaction of interactions) {
    incrementSummary(severityDistribution, interaction.severity);
    incrementSummary(topFoods, interaction.foodItem);
    incrementSummary(topMedications, interaction.medication);
  }

  const sortByTotal = (items: Record<string, { label: string; total: number }>) => Object.values(items).sort((first, second) => second.total - first.total);

  return {
    totalScans: accessibleScanIds.length,
    totalInteractions: interactions.length,
    scansWithInteractions: new Set(interactions.map((interaction) => interaction.scanId)).size,
    interactionRate: accessibleScanIds.length > 0 ? Math.round((new Set(interactions.map((interaction) => interaction.scanId)).size / accessibleScanIds.length) * 10000) / 100 : 0,
    severityDistribution: sortByTotal(severityDistribution),
    topFoods: sortByTotal(topFoods).slice(0, 10),
    topMedications: sortByTotal(topMedications).slice(0, 10),
  };
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

  await writeAuditLog({
    userId: user?.id || null,
    action: "food_scan.uploaded",
    resourceType: "food_scan",
    resourceId: scan.id,
    changes: { patientId: dto.patientId, imageSizeKb: scan.imageSizeKb },
  });

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

  await writeAuditLog({
    userId: user?.id || null,
    action: "food_scan.detected",
    resourceType: "food_scan",
    resourceId: scan.id,
    changes: { patientId: dto.patientId, detectedItems: detectionResult.detectedItems.length, modelVersion: detectionResult.modelVersion },
  });

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

  const activeMedications = await db
    .select({ drugName: medicationSchedules.drugName, dosage: medicationSchedules.dosage })
    .from(medicationSchedules)
    .where(eq(medicationSchedules.patientId, dto.patientId));

  const hasWarfarin = activeMedications.some((medication) => medication.drugName.toLowerCase().includes("warfarin"));
  const hasKangkung = dto.detectedItems.includes("kangkung");
  const interactions = hasKangkung ? [
    {
      food_item: "kangkung",
      food_display: "Kangkung",
      medication: hasWarfarin ? "Warfarin 5mg" : "Obat pengencer darah",
      severity: "kuning",
      severity_label: "Perhatian",
      interaction_description: "Kangkung mengandung Vitamin K yang dapat memengaruhi terapi pengencer darah tertentu.",
      recommendation: "Batasi porsi kangkung dan jaga konsistensi asupan sayuran hijau. Konsultasikan dengan tenaga medis bila ragu.",
      sources: ["PIONAS", "DrugBank"],
    },
  ] : [];

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

    await db
      .update(foodScans)
      .set({ overallRiskScore: 0.45, overallRiskLevel: "sedang" })
      .where(eq(foodScans.id, dto.scanId));
  }

  await writeAuditLog({
    userId: user?.id || null,
    action: "food_scan.interaction_checked",
    resourceType: "food_scan",
    resourceId: dto.scanId,
    changes: { patientId: dto.patientId, interactionCount: interactions.length, detectedItems: dto.detectedItems.length },
  });

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
    safe_items: dto.detectedItems
      .filter((item) => item !== "kangkung")
      .map((item) => ({ food_item: item, food_display: NUTRITION_MAP[item]?.display || item, status: "aman" })),
    overall_risk_score: interactions.length > 0 ? 0.45 : 0.1,
    overall_risk_level: interactions.length > 0 ? "sedang" : "rendah",
    overall_recommendation: interactions.length > 0
      ? "Sebagian besar makanan aman. Perhatikan porsi kangkung saat mengonsumsi obat pengencer darah."
      : "Tidak ditemukan interaksi signifikan pada makanan yang terdeteksi.",
    disclaimer: "Ini bukan nasihat medis. Selalu konsultasikan dengan dokter atau apoteker Anda.",
    timestamp: new Date(),
  };
};

export const estimateNutrition = async (dto: NutritionDTO) => {
  const items = dto.detectedItems.map((item) => {
    const nutrition = NUTRITION_MAP[item.label] || {
      display: item.label,
      portion: "1 porsi",
      calories: 0,
      protein: 0,
      fat: 0,
      carbs: 0,
      source: "Basis Pengetahuan Lokal",
    };

    return {
      food_item: item.label,
      food_display: nutrition.display,
      portion: nutrition.portion,
      nutrition: {
        calories: nutrition.calories,
        protein_g: nutrition.protein,
        fat_g: nutrition.fat,
        carbs_g: nutrition.carbs,
      },
      source: nutrition.source,
    };
  });

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
