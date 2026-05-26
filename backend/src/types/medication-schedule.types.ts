export interface MedicationScheduleCreateDTO {
  patientId: string;
  prescriptionId?: string;
  drugName: string;
  dosage: string;
  stock?: number;
  frequency: number;
  scheduledTimes: string[];
  instructions?: string;
  reminderEnabled?: boolean;
  isActive?: boolean;
}

export interface MedicationScheduleUpdateDTO {
  prescriptionId?: string | null;
  drugName?: string;
  dosage?: string;
  stock?: number;
  frequency?: number;
  scheduledTimes?: string[];
  instructions?: string | null;
  reminderEnabled?: boolean;
  isActive?: boolean;
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
