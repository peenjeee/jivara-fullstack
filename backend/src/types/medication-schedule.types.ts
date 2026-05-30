export interface MedicationScheduleCreateDTO {
  patientId: string;
  drugName: string;
  registrationNumber?: string | null;
  compositionNormalized?: string | null;
  activeSubstances?: string | null;
  drugCategories?: string | null;
  dosage: string;
  medicineForm?: string;
  mealRule?: string;
  stock?: number;
  frequency: number;
  scheduledTimes: string[];
  instructions?: string;
  reminderEnabled?: boolean;
  isActive?: boolean;
  startDate?: string;
  endDate?: string | null;
}

export interface MedicationScheduleUpdateDTO {
  drugName?: string;
  registrationNumber?: string | null;
  compositionNormalized?: string | null;
  activeSubstances?: string | null;
  drugCategories?: string | null;
  dosage?: string;
  medicineForm?: string | null;
  mealRule?: string | null;
  stock?: number;
  frequency?: number;
  scheduledTimes?: string[];
  instructions?: string | null;
  reminderEnabled?: boolean;
  isActive?: boolean;
  startDate?: string;
  endDate?: string | null;
}

export interface MedicationScheduleListQuery {
  patient_id?: string;
  patientId?: string;
  patient_ids?: string;
  patientIds?: string;
  is_active?: string;
  isActive?: string;
  page?: string;
  limit?: string;
  search?: string;
  status?: string;
  adherenceStatus?: string;
}
