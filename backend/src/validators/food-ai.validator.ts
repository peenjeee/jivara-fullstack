import { Request, Response, NextFunction } from "express";

const isMissing = (value: unknown) =>
  value === undefined || value === null || (typeof value === "string" && !value.trim());

const isValidUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export const validateFoodUpload = (req: Request, res: Response, next: NextFunction) => {
  const { patientId, patient_id: patientIdSnake } = req.body;
  const resolvedPatientId = patientId || patientIdSnake;

  if (isMissing(resolvedPatientId) || !isValidUuid(resolvedPatientId)) {
    return res.status(400).json({ status: "error", message: "patientId wajib berupa UUID valid", error_code: "VALIDATION_ERROR" });
  }

  req.body.patientId = resolvedPatientId;
  next();
};

export const validateFoodDetect = (req: Request, res: Response, next: NextFunction) => {
  const { patientId, patient_id: patientIdSnake, imageId, image_id: imageIdSnake } = req.body;
  const resolvedPatientId = patientId || patientIdSnake;
  const resolvedImageId = imageId || imageIdSnake;

  if (isMissing(resolvedPatientId) || !isValidUuid(resolvedPatientId)) {
    return res.status(400).json({ status: "error", message: "patientId wajib berupa UUID valid", error_code: "VALIDATION_ERROR" });
  }

  if (resolvedImageId && !isValidUuid(resolvedImageId)) {
    return res.status(400).json({ status: "error", message: "imageId tidak valid", error_code: "VALIDATION_ERROR" });
  }

  req.body.patientId = resolvedPatientId;
  req.body.imageId = resolvedImageId;
  next();
};

export const validateInteractionCheck = (req: Request, res: Response, next: NextFunction) => {
  const { patientId, patient_id: patientIdSnake, scanId, scan_id: scanIdSnake, detectedItems, detected_items: detectedItemsSnake } = req.body;
  const resolvedPatientId = patientId || patientIdSnake;
  const resolvedScanId = scanId || scanIdSnake;
  const resolvedDetectedItems = detectedItems || detectedItemsSnake;

  if (isMissing(resolvedPatientId) || !isValidUuid(resolvedPatientId)) {
    return res.status(400).json({ status: "error", message: "patientId wajib berupa UUID valid", error_code: "VALIDATION_ERROR" });
  }

  if (isMissing(resolvedScanId) || !isValidUuid(resolvedScanId)) {
    return res.status(400).json({ status: "error", message: "scanId wajib berupa UUID valid", error_code: "VALIDATION_ERROR" });
  }

  if (!Array.isArray(resolvedDetectedItems) || resolvedDetectedItems.length === 0) {
    return res.status(400).json({ status: "error", message: "detectedItems wajib berupa array", error_code: "VALIDATION_ERROR" });
  }

  req.body.patientId = resolvedPatientId;
  req.body.scanId = resolvedScanId;
  req.body.detectedItems = resolvedDetectedItems;
  next();
};

export const validateNutrition = (req: Request, res: Response, next: NextFunction) => {
  const { detectedItems, detected_items: detectedItemsSnake } = req.body;
  const resolvedDetectedItems = detectedItems || detectedItemsSnake;

  if (!Array.isArray(resolvedDetectedItems) || resolvedDetectedItems.length === 0) {
    return res.status(400).json({ status: "error", message: "detectedItems wajib berupa array", error_code: "VALIDATION_ERROR" });
  }

  req.body.detectedItems = resolvedDetectedItems;
  next();
};
