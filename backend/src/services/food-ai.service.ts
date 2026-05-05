import { eq } from "drizzle-orm";
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

const MOCK_DETECTED_ITEMS = [
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

export const uploadFoodImage = async (dto: FoodUploadDTO, user?: AccessUser) => {
  await ensurePatientExists(dto.patientId);
  if (user) await assertCanAccessPatient(user, dto.patientId);

  const [scan] = await db
    .insert(foodScans)
    .values({
      patientId: dto.patientId,
      imageUrl: dto.imageUrl || `https://storage.jivara.app/scans/mock-${Date.now()}.jpg`,
      imageSizeKb: dto.imageSizeKb || 450,
      modelVersion: "mock-yolov11-indo-food-v1.0",
    })
    .returning();

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
        imageUrl: `https://storage.jivara.app/scans/mock-${Date.now()}.jpg`,
        imageSizeKb: 450,
        modelVersion: "mock-yolov11-indo-food-v1.0",
      })
      .returning())[0];

  const existingItems = await db.select({ id: detectedItems.id }).from(detectedItems).where(eq(detectedItems.scanId, scan.id)).limit(1);
  if (existingItems.length === 0) {
    await db.insert(detectedItems).values(MOCK_DETECTED_ITEMS.map((item) => ({
      scanId: scan.id,
      label: item.label,
      labelDisplay: item.labelDisplay,
      confidence: item.confidence,
      boundingBox: item.boundingBox,
    })));
  }

  await db
    .update(foodScans)
    .set({ inferenceTimeMs: 1840, modelVersion: "mock-yolov11-indo-food-v1.0" })
    .where(eq(foodScans.id, scan.id));

  return {
    scan_id: scan.id,
    detected_items: MOCK_DETECTED_ITEMS.map((item) => ({
      label: item.label,
      label_display: item.labelDisplay,
      confidence: item.confidence,
      bounding_box: item.boundingBox,
    })),
    low_confidence_items: [
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
    inference_time_ms: 1840,
    model_version: "mock-yolov11-indo-food-v1.0",
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
      source: "Basis Pengetahuan Mock",
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
