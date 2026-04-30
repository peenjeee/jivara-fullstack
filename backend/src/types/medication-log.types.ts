export type MedicationLogStatus = "confirmed" | "missed" | "snoozed";

export interface MedicationLogCreateDTO {
  scheduleId: string;
  status: MedicationLogStatus;
  scheduledTime?: string;
  confirmedAt?: string;
  snoozeCount?: number;
}

export interface MedicationLogListQuery {
  patient_id?: string;
  patientId?: string;
  date?: string;
  status?: MedicationLogStatus;
  page?: string;
  limit?: string;
}
