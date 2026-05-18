export interface FoodUploadDTO {
  patientId: string;
  imageUrl?: string;
  imageSizeKb?: number;
  originalFilename?: string;
  mimeType?: string;
}

export interface FoodDetectDTO {
  imageId?: string;
  patientId: string;
}

export interface InteractionCheckDTO {
  patientId: string;
  scanId: string;
  detectedItems: string[];
}

export interface NutritionDTO {
  detectedItems: Array<{
    label: string;
    confidence?: number;
    portionGrams?: number;
  }>;
}
