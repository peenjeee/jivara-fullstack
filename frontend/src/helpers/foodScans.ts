import type { FoodScanRecord, FoodScanRisk } from "@/lib/mocks/foodScans";
import type { MedicationScheduleRecord } from "@/lib/mocks/schedules";

export interface AnalyzedMedicationDetail {
  readonly drugName: string;
  readonly registrationNumber?: string | null;
  readonly compositionNormalized?: string | null;
  readonly activeSubstances?: string | null;
  readonly drugCategories?: string | null;
  readonly medicineForm?: string | null;
}

export interface FoodDrugInteraction {
  readonly schedule: MedicationScheduleRecord;
  readonly risk: FoodScanRisk;
  readonly reasoning: string;
  readonly recommendation: string;
}

export interface FoodNutritionItem {
  readonly foodItem: string;
  readonly foodDisplay: string;
  readonly portion: string;
  readonly nutrition: {
    readonly calories: number;
    readonly proteinG: number;
    readonly fatG: number;
    readonly carbsG: number;
  };
  readonly source: string;
}

export interface FoodNutritionTotal {
  readonly calories: number;
  readonly proteinG: number;
  readonly fatG: number;
  readonly carbsG: number;
}

export interface FoodRecommendation {
  readonly foodName: string;
  readonly severityScore: number;
  readonly riskLevel: string;
  readonly worstCategory?: string | null;
}

export interface FoodSafeItem {
  readonly foodItem: string;
  readonly foodDisplay: string;
  readonly status: string;
}

export interface FoodScanAnalysis {
  readonly scan: FoodScanRecord;
  readonly patientName?: string;
  readonly analyzedMedicationCount?: number;
  readonly analyzedMedications?: readonly string[];
  readonly analyzedMedicationDetails?: readonly AnalyzedMedicationDetail[];
  readonly schedules: readonly MedicationScheduleRecord[];
  readonly interactions: readonly FoodDrugInteraction[];
  readonly nutritionItems?: readonly FoodNutritionItem[];
  readonly nutritionTotal?: FoodNutritionTotal;
  readonly safeFoods?: readonly FoodSafeItem[];
  readonly recommendedFoods?: readonly FoodRecommendation[];
  readonly foodsToAvoid?: readonly FoodRecommendation[];
  readonly disclaimer?: string;
  readonly overallRisk: FoodScanRisk;
}
