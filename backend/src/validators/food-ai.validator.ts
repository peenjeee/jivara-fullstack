import { Request, Response, NextFunction } from "express";

const isMissing = (value: unknown) =>
  value === undefined || value === null || (typeof value === "string" && !value.trim());

const isValidUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const getAllowedImageUrlHosts = () => {
  const values = [
    process.env.API_URL,
    process.env.SUPABASE_STORAGE_PUBLIC_URL,
    process.env.SUPABASE_URL,
    process.env.SUPABASE_PROJECT_URL,
  ];

  return values.flatMap((value) => {
    if (!value) return [];
    try {
      return [new URL(value).host];
    } catch {
      return [];
    }
  });
};

const isAllowedFoodImageUrl = (value: string) => {
  if (value.startsWith("/uploads/food-scans/")) return true;
  if (!/^https?:\/\//i.test(value)) return false;

  try {
    const url = new URL(value);
    return getAllowedImageUrlHosts().includes(url.host);
  } catch {
    return false;
  }
};

export const validateFoodUpload = (req: Request, res: Response, next: NextFunction) => {
  const { patientId, patient_id: patientIdSnake } = req.body;
  const resolvedPatientId = patientId || patientIdSnake;

  if (isMissing(resolvedPatientId) || !isValidUuid(resolvedPatientId)) {
    return res.status(400).json({ status: "gagal", message: "patientId wajib berupa UUID valid", error_code: "VALIDATION_ERROR" });
  }

  if (!req.file && isMissing(req.body.imageUrl)) {
    return res.status(400).json({ status: "gagal", message: "File gambar atau imageUrl wajib diisi", error_code: "VALIDATION_ERROR" });
  }

  if (!req.file && typeof req.body.imageUrl === "string" && !isAllowedFoodImageUrl(req.body.imageUrl)) {
    return res.status(400).json({ status: "gagal", message: "imageUrl hanya boleh dari storage gambar Jivara", error_code: "INVALID_IMAGE_URL" });
  }

  req.body.patientId = resolvedPatientId;
  next();
};

export const validateFoodDetect = (req: Request, res: Response, next: NextFunction) => {
  const { patientId, patient_id: patientIdSnake, imageId, image_id: imageIdSnake } = req.body;
  const resolvedPatientId = patientId || patientIdSnake;
  const resolvedImageId = imageId || imageIdSnake;

  if (isMissing(resolvedPatientId) || !isValidUuid(resolvedPatientId)) {
    return res.status(400).json({ status: "gagal", message: "patientId wajib berupa UUID valid", error_code: "VALIDATION_ERROR" });
  }

  if (resolvedImageId && !isValidUuid(resolvedImageId)) {
    return res.status(400).json({ status: "gagal", message: "imageId tidak valid", error_code: "VALIDATION_ERROR" });
  }

  req.body.patientId = resolvedPatientId;
  req.body.imageId = resolvedImageId;
  next();
};

const normalizeBoolean = (value: unknown) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value.toLowerCase() === "true") return true;
    if (value.toLowerCase() === "false") return false;
  }
  return undefined;
};

export const validateInteractionCheck = (req: Request, res: Response, next: NextFunction) => {
  const {
    patientId,
    patient_id: patientIdSnake,
    scanId,
    scan_id: scanIdSnake,
    detectedItems,
    detected_items: detectedItemsSnake,
    includeRecommendations,
    include_recommendations: includeRecommendationsSnake,
  } = req.body;
  const resolvedPatientId = patientId || patientIdSnake;
  const resolvedScanId = scanId || scanIdSnake;
  const resolvedDetectedItems = detectedItems || detectedItemsSnake;
  const resolvedIncludeRecommendations = normalizeBoolean(includeRecommendations ?? includeRecommendationsSnake);

  if (isMissing(resolvedPatientId) || !isValidUuid(resolvedPatientId)) {
    return res.status(400).json({ status: "gagal", message: "patientId wajib berupa UUID valid", error_code: "VALIDATION_ERROR" });
  }

  if (isMissing(resolvedScanId) || !isValidUuid(resolvedScanId)) {
    return res.status(400).json({ status: "gagal", message: "scanId wajib berupa UUID valid", error_code: "VALIDATION_ERROR" });
  }

  if (!Array.isArray(resolvedDetectedItems) || resolvedDetectedItems.length === 0) {
    return res.status(400).json({ status: "gagal", message: "detectedItems wajib berupa array", error_code: "VALIDATION_ERROR" });
  }

  req.body.patientId = resolvedPatientId;
  req.body.scanId = resolvedScanId;
  req.body.detectedItems = resolvedDetectedItems;
  if (resolvedIncludeRecommendations !== undefined) {
    req.body.includeRecommendations = resolvedIncludeRecommendations;
  }
  next();
};

export const validateFoodRecommendations = (req: Request, res: Response, next: NextFunction) => {
  const { patientId, patient_id: patientIdSnake, scanId, scan_id: scanIdSnake, topN, top_n: topNSnake } = req.body;
  const resolvedPatientId = patientId || patientIdSnake;
  const resolvedScanId = scanId || scanIdSnake;
  const resolvedTopN = topN ?? topNSnake;

  if (isMissing(resolvedPatientId) || !isValidUuid(resolvedPatientId)) {
    return res.status(400).json({ status: "gagal", message: "patientId wajib berupa UUID valid", error_code: "VALIDATION_ERROR" });
  }

  if (isMissing(resolvedScanId) || !isValidUuid(resolvedScanId)) {
    return res.status(400).json({ status: "gagal", message: "scanId wajib berupa UUID valid", error_code: "VALIDATION_ERROR" });
  }

  if (resolvedTopN !== undefined && (!Number.isFinite(Number(resolvedTopN)) || Number(resolvedTopN) < 1)) {
    return res.status(400).json({ status: "gagal", message: "topN wajib berupa angka positif", error_code: "VALIDATION_ERROR" });
  }

  req.body.patientId = resolvedPatientId;
  req.body.scanId = resolvedScanId;
  if (resolvedTopN !== undefined) req.body.topN = Number(resolvedTopN);
  next();
};

export const validateNutrition = (req: Request, res: Response, next: NextFunction) => {
  const { scanId, scan_id: scanIdSnake, detectedItems, detected_items: detectedItemsSnake } = req.body;
  const resolvedScanId = scanId || scanIdSnake;
  const resolvedDetectedItems = detectedItems || detectedItemsSnake;

  if (resolvedScanId && !isValidUuid(resolvedScanId)) {
    return res.status(400).json({ status: "gagal", message: "scanId tidak valid", error_code: "VALIDATION_ERROR" });
  }

  if (!Array.isArray(resolvedDetectedItems) || resolvedDetectedItems.length === 0) {
    return res.status(400).json({ status: "gagal", message: "detectedItems wajib berupa array", error_code: "VALIDATION_ERROR" });
  }

  if (resolvedScanId) req.body.scanId = resolvedScanId;
  req.body.detectedItems = resolvedDetectedItems;
  next();
};
