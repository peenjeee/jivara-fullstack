export interface AdherenceQuery {
  patient_id?: string;
  patientId?: string;
  nurse_id?: string;
  nurseId?: string;
  period?: "7d" | "14d" | "30d" | "90d" | "1y" | "all";
}
