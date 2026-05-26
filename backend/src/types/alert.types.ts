export interface AlertListQuery {
  patient_id?: string;
  patientId?: string;
  status?: string;
  severity?: "warning" | "critical";
  date?: string;
  start_date?: string;
  startDate?: string;
  end_date?: string;
  endDate?: string;
  page?: string;
  limit?: string;
}
