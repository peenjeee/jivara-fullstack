import api from "@/lib/axios";
import type { ActivityLogRecord } from "@/lib/mocks/activityLogs";
import type { PatientRecord, PatientStatus } from "@/lib/mocks/patients";
import type { MedicationScheduleRecord } from "@/lib/mocks/schedules";
import type { PatientDetailData } from "@/helpers/patientDetails";
import type { AddPatientValues } from "@/components/patients/AddPatientForm";
import { getFoodScansForPatientFromApi } from "@/lib/foodScanApi";

interface PatientListResponse {
  id: string;
  user?: {
    fullName?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  address?: string | null;
  assignedNurseId?: string | null;
  isActive?: boolean | null;
  createdAt?: string | null;
}

interface SinglePatientResponse {
  data: PatientListResponse & {
    user?: {
      fullName?: string | null;
      email?: string | null;
      phone?: string | null;
    } | null;
  };
}

interface PatientDetailResponse extends PatientListResponse {
  registeredAt?: string | null;
  assignedNurseId?: string | null;
  assignedNurse?: { id: string; name: string } | null;
  activeMedications?: Array<{
    id: string;
    drugName: string;
    dosage: string;
    frequency: number;
    scheduledTimes: unknown;
    instructions?: string | null;
    createdAt?: string | null;
  }>;
  activeMedicationsCount?: number;
  adherenceRate7d?: number;
  adherenceRate30d?: number;
  totalFoodScans?: number;
  totalInteractionWarnings?: number;
}

interface PaginatedResponse<T> {
  data: T[];
  meta?: { total?: number };
}

interface MedicationLogResponse {
  id: string;
  scheduleId: string;
  patientId: string;
  drugName: string;
  status: string;
  scheduledTime: string;
  confirmedAt?: string | null;
  createdAt?: string | null;
}

interface AlertResponse {
  id: string;
  patientId: string;
  patientName: string;
  scheduleId: string;
  drugName: string;
  dosage: string;
  scheduledTime: string;
  status: string;
  severity: "warning" | "critical";
  message: string;
  updatedAt?: string | null;
  createdAt?: string | null;
}

const getAge = (dateOfBirth?: string | null) => {
  if (!dateOfBirth) return 0;
  const birthDate = new Date(dateOfBirth);
  if (Number.isNaN(birthDate.getTime())) return 0;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const hasBirthdayPassed = today.getMonth() > birthDate.getMonth() || today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate();
  if (!hasBirthdayPassed) age -= 1;
  return Math.max(age, 0);
};

const getInitials = (name: string) => name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "PX";

const getStatus = (adherence: number): PatientStatus => {
  if (adherence < 50) return "Need Special Attention";
  if (adherence < 75) return "Lagging Behind";
  return "On Ideal Schedule";
};

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
};

const getDateOfBirthFromAge = (age: number) => {
  const date = new Date();
  date.setFullYear(date.getFullYear() - age, 0, 1);
  return date.toISOString().slice(0, 10);
};

const mapGenderToApi = (gender: AddPatientValues["gender"]) => gender === "Wanita" ? "female" : "male";

const mapPatientPayload = (values: AddPatientValues, includePassword: boolean) => ({
  fullName: values.fullName,
  email: values.email,
  phone: values.phone,
  dateOfBirth: getDateOfBirthFromAge(values.age),
  gender: mapGenderToApi(values.gender),
  address: values.address,
  ...(includePassword ? { password: values.password } : {}),
});

const mapPatient = (patient: PatientListResponse, adherence = 100): PatientRecord => ({
  id: patient.id,
  name: patient.fullName || patient.user?.fullName || "-",
  age: getAge(patient.dateOfBirth),
  gender: patient.gender === "female" ? "Wanita" : "Pria",
  phone: patient.phone ?? patient.user?.phone ?? undefined,
  email: patient.email ?? patient.user?.email ?? undefined,
  address: patient.address ?? undefined,
  status: getStatus(adherence),
  lastVisit: formatDate(patient.createdAt),
  adherence,
  avatar: getInitials(patient.fullName || patient.user?.fullName || "-"),
});

const mapMedication = (patient: PatientRecord, medication: NonNullable<PatientDetailResponse["activeMedications"]>[number]): MedicationScheduleRecord => {
  const times = Array.isArray(medication.scheduledTimes) ? medication.scheduledTimes.filter((time): time is string => typeof time === "string") : [];

  return {
    id: medication.id,
    patientId: patient.id,
    patientName: patient.name,
    patientAvatar: patient.avatar,
    medicineName: medication.drugName,
    dose: medication.dosage,
    medicineForm: "Tablet",
    stock: 0,
    frequency: `${medication.frequency} kali sehari`,
    times,
    mealRule: "Tidak tergantung makan",
    startDate: medication.createdAt?.slice(0, 10) || new Date().toISOString().slice(0, 10),
    reminderEnabled: true,
    instructions: medication.instructions ?? undefined,
    status: "Aktif",
  };
};

const mapMedicationLogActivity = (log: MedicationLogResponse, patient: PatientRecord): ActivityLogRecord => ({
  id: `medication-log-${log.id}`,
  title: log.status === "confirmed" ? "Obat dikonfirmasi" : log.status === "missed" ? "Obat terlewat" : log.status === "snoozed" ? "Reminder ditunda" : "Aktivitas obat",
  description: `${log.drugName} berstatus ${log.status}.`,
  category: "Reminder",
  severity: log.status === "missed" ? "Kritis" : log.status === "snoozed" ? "Peringatan" : log.status === "confirmed" ? "Sukses" : "Info",
  timestamp: log.confirmedAt || log.createdAt || log.scheduledTime,
  patientId: log.patientId,
  patientName: patient.name,
  patientAvatar: patient.avatar,
  scheduleId: log.scheduleId,
  medicineName: log.drugName,
  read: true,
});

const mapAlertActivity = (alert: AlertResponse, patient: PatientRecord): ActivityLogRecord => ({
  id: `alert-${alert.id}`,
  title: alert.severity === "critical" ? "Kepatuhan kritis" : "Peringatan kepatuhan",
  description: alert.message,
  category: "Kepatuhan",
  severity: alert.severity === "critical" ? "Kritis" : "Peringatan",
  timestamp: alert.updatedAt || alert.createdAt || alert.scheduledTime,
  patientId: alert.patientId,
  patientName: alert.patientName || patient.name,
  patientAvatar: patient.avatar,
  scheduleId: alert.scheduleId,
  medicineName: `${alert.drugName} ${alert.dosage}`,
  read: false,
});

const getPatientActivitiesFromApi = async (patient: PatientRecord, scans: PatientDetailData["scans"]): Promise<ActivityLogRecord[]> => {
  const [logResponse, alertResponse] = await Promise.all([
    api.get<PaginatedResponse<MedicationLogResponse>>("/medication-logs", { params: { patient_id: patient.id, limit: 100 } }).catch(() => ({ data: { data: [] } })),
    api.get<PaginatedResponse<AlertResponse>>("/alerts", { params: { patient_id: patient.id, limit: 100 } }).catch(() => ({ data: { data: [] } })),
  ]);

  const medicationActivities = logResponse.data.data.map((log) => mapMedicationLogActivity(log, patient));
  const alertActivities = alertResponse.data.data.map((alert) => mapAlertActivity(alert, patient));
  const scanActivities = scans.map((scan): ActivityLogRecord => ({
    id: `food-scan-${scan.id}`,
    title: scan.risk === "High Risk" ? "Scan makanan berisiko" : "Scan makanan selesai",
    description: scan.result,
    category: "Scan Makanan",
    severity: scan.risk === "High Risk" ? "Peringatan" : "Sukses",
    timestamp: scan.scannedAt,
    patientId: scan.patientId,
    patientName: patient.name,
    patientAvatar: patient.avatar,
    scanId: scan.id,
    read: true,
  }));

  return [...medicationActivities, ...alertActivities, ...scanActivities]
    .sort((first, second) => Date.parse(second.timestamp) - Date.parse(first.timestamp));
};

export const getPatientsFromApi = async () => {
  const response = await api.get<PaginatedResponse<PatientListResponse>>("/patients", { params: { limit: 100, status: "active" } });
  const patients = response.data.data.map((patient) => mapPatient(patient, 100));
  return patients;
};

export const createPatientViaApi = async (values: AddPatientValues) => {
  const response = await api.post<SinglePatientResponse>("/patients", mapPatientPayload(values, true));
  const created = response.data.data;

  return mapPatient({
    ...created,
    fullName: created.fullName || created.user?.fullName || values.fullName,
    email: created.email || created.user?.email || values.email,
    phone: created.phone || created.user?.phone || values.phone,
    dateOfBirth: created.dateOfBirth || getDateOfBirthFromAge(values.age),
    gender: created.gender || mapGenderToApi(values.gender),
    address: created.address || values.address,
    createdAt: created.createdAt ?? new Date().toISOString(),
  });
};

export const updatePatientViaApi = async (patientId: string, values: AddPatientValues) => {
  const response = await api.put<SinglePatientResponse>(`/patients/${encodeURIComponent(patientId)}`, mapPatientPayload(values, false));
  const detail = response.data.data;
  return mapPatient({ ...detail, createdAt: detail.createdAt ?? undefined });
};

export const deactivatePatientViaApi = async (patientId: string) => {
  await api.delete(`/patients/${encodeURIComponent(patientId)}`);
};

export const getPatientDetailFromApi = async (patientId: string): Promise<PatientDetailData> => {
  const response = await api.get<{ data: PatientDetailResponse }>(`/patients/${patientId}`);
  const detail = response.data.data;
  const adherence = Math.round(detail.adherenceRate30d ?? detail.adherenceRate7d ?? 100);
  const patient = mapPatient({ ...detail, createdAt: detail.registeredAt ?? detail.createdAt }, adherence);
  const schedules = detail.activeMedications?.map((medication) => mapMedication(patient, medication)) ?? [];
  const scans = await getFoodScansForPatientFromApi(patientId).catch(() => []);
  const activities = await getPatientActivitiesFromApi(patient, scans).catch(() => []);

  return {
    patient,
    schedules,
    activities,
    scans,
  };
};

export const getPatientsAssignedToNurseFromApi = async (nurseId: string) => {
  const response = await api.get<PaginatedResponse<PatientListResponse>>("/patients", { params: { limit: 100, status: "active", nurseId } });
  return response.data.data.map((patient) => mapPatient(patient, 100));
};

export const assignPatientToNurseViaApi = async (patientId: string, nurseId: string) => {
  await api.put(`/patients/${encodeURIComponent(patientId)}/assign`, { nurseId });
};

export const getInitialPatientDetail = (patientId: string): PatientDetailData => {
  return {
    patient: {
      id: patientId,
      name: "-",
      age: 0,
      gender: "Pria",
      status: "On Ideal Schedule",
      lastVisit: "-",
      adherence: 100,
      avatar: "PX",
    },
    schedules: [],
    activities: [],
    scans: [],
  };
};
