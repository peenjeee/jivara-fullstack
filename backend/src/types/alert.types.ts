export interface AlertListQuery {
  patient_id?: string;
  patientId?: string;
  status?: string;
  severity?: "warning" | "critical";
  page?: string;
  limit?: string;
}
