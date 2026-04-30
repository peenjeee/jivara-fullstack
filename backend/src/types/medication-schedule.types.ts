export interface MedicationScheduleCreateDTO {
  patientId: string;
  prescriptionId?: string;
  drugName: string;
  dosage: string;
  frequency: number;
  scheduledTimes: string[];
  instructions?: string;
}

export interface MedicationScheduleUpdateDTO {
  prescriptionId?: string | null;
  drugName?: string;
  dosage?: string;
  frequency?: number;
  scheduledTimes?: string[];
  instructions?: string | null;
  isActive?: boolean;
}

export interface MedicationScheduleListQuery {
  patient_id?: string;
  patientId?: string;
  is_active?: string;
  isActive?: string;
}
