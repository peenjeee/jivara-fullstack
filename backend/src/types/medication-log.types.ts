export type MedicationLogStatus = "confirmed" | "missed" | "snoozed";

export interface MedicationLogCreateDTO {
  scheduleId: string;
  status: MedicationLogStatus;
  reminderJobId?: string;
  scheduledTime?: string;
  confirmedAt?: string;
  snoozeCount?: number;
}

export interface MedicationSnoozeDTO {
  reminderJobId: string;
  minutes: 10 | 20 | 30;
}

export interface MedicationLogListQuery {
  patient_id?: string;
  patientId?: string;
  date?: string;
  start_date?: string;
  startDate?: string;
  end_date?: string;
  endDate?: string;
  status?: MedicationLogStatus;
  page?: string;
  limit?: string;
}
