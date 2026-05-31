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
  includeRecommendations?: boolean;
}

export interface FoodRecommendationDTO {
  patientId: string;
  scanId: string;
  topN?: number;
}

export interface NutritionDTO {
  scanId?: string;
  detectedItems: Array<{
    label: string;
    confidence?: number;
    portionGrams?: number;
  }>;
}
