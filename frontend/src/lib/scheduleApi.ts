import api from "@/lib/axios";
import type { MedicationScheduleRecord } from "@/lib/mocks/schedules";
import { getPatientsFromApi } from "@/lib/patientApi";
import type { PatientRecord, PatientStatus } from "@/lib/mocks/patients";
import type { ScheduleMedicineFormValues } from "@/components/schedule/scheduleFormUtils";

interface ScheduleResponse {
  id: string;
  patientId: string;
  drugName: string;
  dosage: string;
  stock?: number | null;
  frequency: number;
  scheduledTimes: unknown;
  instructions?: string | null;
  reminderEnabled?: boolean | null;
  isActive?: boolean | null;
  completedAt?: string | null;
  createdAt?: string | null;
}

interface SingleScheduleResponse {
  data: ScheduleResponse;
}

interface ScheduleListResponse {
  data: ScheduleResponse[];
}

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
  adherenceRateAll?: number | null;
  totalScheduledAll?: number | null;
  createdAt?: string | null;
  lastLoginAt?: string | null;
  isActive?: boolean | null;
  isMedicationComplete?: boolean;
}

interface SchedulePatientGroupsResponse {
  data: {
    patients: PatientListResponse[];
    schedules: ScheduleResponse[];
  };
  meta?: { page: number; limit: number; total: number; summary?: ScheduleSummary };
}

type ScheduleSummary = {
  active: number;
  completed: number;
  reminders: number;
};

export type SchedulePatientGroupsPage = {
  patients: PatientRecord[];
  schedules: MedicationScheduleRecord[];
  meta: { page: number; limit: number; total: number; summary?: ScheduleSummary };
};

const schedulesCacheTtl = 15_000;
const scheduleAdherenceCacheVersion = "adherence-all-v1";
let schedulesCache: { data: MedicationScheduleRecord[]; expiresAt: number } | null = null;
let schedulesRequest: Promise<MedicationScheduleRecord[]> | null = null;
const schedulePatientsCache = new Map<string, { data: MedicationScheduleRecord[]; expiresAt: number }>();
const schedulePatientsRequests = new Map<string, Promise<MedicationScheduleRecord[]>>();
const scheduleGroupsCache = new Map<string, { data: SchedulePatientGroupsPage; expiresAt: number }>();
const scheduleGroupsRequests = new Map<string, Promise<SchedulePatientGroupsPage>>();

export const clearSchedulesCache = () => {
  schedulesCache = null;
  schedulesRequest = null;
  schedulePatientsCache.clear();
  schedulePatientsRequests.clear();
  scheduleGroupsCache.clear();
  scheduleGroupsRequests.clear();
};

const clearScheduleRelatedCaches = async () => {
  clearSchedulesCache();
  await Promise.all([
    import("./dashboardApi").then(({ clearDashboardCache }) => clearDashboardCache()).catch(() => undefined),
    import("./patientApi").then(({ clearPatientsCache }) => clearPatientsCache()).catch(() => undefined),
    import("./patientDashboardApi").then(({ clearPatientDashboardCache }) => clearPatientDashboardCache()).catch(() => undefined),
  ]);
};

const notifyScheduleChanged = (patientIds: readonly string[]) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("jivara:schedule-changed", {
    detail: { patientIds: Array.from(new Set(patientIds)) },
  }));
};

const getScheduledTimes = (value: unknown) => Array.isArray(value)
  ? value.filter((time): time is string => typeof time === "string")
  : [];

const getFrequencyNumber = (value: string) => {
  const match = value.match(/\d+/);
  const parsed = match ? Number(match[0]) : 1;
  return Math.min(Math.max(Number.isInteger(parsed) ? parsed : 1, 1), 3);
};

const mapSchedule = (schedule: ScheduleResponse, patient?: PatientRecord): MedicationScheduleRecord => ({
  id: schedule.id,
  patientId: schedule.patientId,
  patientName: patient?.name ?? "Pasien tidak diketahui",
  patientAvatar: patient?.avatar ?? "PX",
  patientStatus: patient?.status,
  medicineName: schedule.drugName,
  dose: schedule.dosage,
  medicineForm: "Tablet",
  stock: Math.max(Number(schedule.stock ?? 0), 0),
  frequency: `${schedule.frequency} kali sehari`,
  times: getScheduledTimes(schedule.scheduledTimes),
  mealRule: "Tidak tergantung makan",
  startDate: schedule.createdAt?.slice(0, 10) || new Date().toISOString().slice(0, 10),
  endDate: schedule.completedAt?.slice(0, 10) || undefined,
  reminderEnabled: schedule.reminderEnabled ?? true,
  instructions: schedule.instructions ?? undefined,
  status: Number(schedule.stock ?? 0) <= 0 ? "Selesai" : schedule.isActive === false ? "Nonaktif" : "Aktif",
});

const mapMedicinePayload = (patientId: string, medicine: ScheduleMedicineFormValues, isActive = true) => ({
  patientId,
  drugName: medicine.medicineName,
  dosage: medicine.dose,
  stock: medicine.stock,
  frequency: getFrequencyNumber(medicine.frequency),
  scheduledTimes: [...medicine.times],
  instructions: medicine.instructions || null,
  reminderEnabled: medicine.reminderEnabled,
  isActive,
});

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

const getPatientStatus = (adherence: number, isComplete = false): PatientStatus => {
  if (isComplete) return "Complete";
  if (adherence < 50) return "Need Special Attention";
  if (adherence < 75) return "Lagging Behind";
  return "On Ideal Schedule";
};

const formatDate = (value?: string | null, fallback = "-") => {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
};

const mapPatient = (patient: PatientListResponse): PatientRecord => {
  const name = patient.fullName || patient.user?.fullName || "-";
  const adherence = patient.totalScheduledAll ? Math.round(patient.adherenceRateAll ?? 100) : 100;

  return {
    id: patient.id,
    name,
    age: getAge(patient.dateOfBirth),
    gender: patient.gender === "female" ? "Wanita" : "Pria",
    phone: patient.phone ?? patient.user?.phone ?? undefined,
    email: patient.email ?? patient.user?.email ?? undefined,
    address: patient.address ?? undefined,
    status: patient.isActive === false ? "Nonaktif" : getPatientStatus(adherence, patient.isMedicationComplete),
    lastVisit: formatDate(patient.lastLoginAt, "Belum pernah login"),
    adherence,
    avatar: getInitials(name),
    assignedNurseId: patient.assignedNurseId ?? undefined,
  };
};

export const getSchedulesFromApi = async (providedPatients?: readonly PatientRecord[]): Promise<MedicationScheduleRecord[]> => {
  if (!providedPatients) {
    const now = Date.now();
    if (schedulesCache && schedulesCache.expiresAt > now) return schedulesCache.data;
    if (schedulesRequest) return schedulesRequest;
  }

  const request = Promise.all([
    api.get<{ data: ScheduleResponse[] }>("/medication-schedules"),
    providedPatients ? Promise.resolve(providedPatients) : getPatientsFromApi(),
  ]).then(([scheduleResponse, patients]) => {
    const patientById = new Map(patients.map((patient) => [patient.id, patient]));
    const schedules = scheduleResponse.data.data.map((schedule) => mapSchedule(schedule, patientById.get(schedule.patientId)));
    if (!providedPatients) schedulesCache = { data: schedules, expiresAt: Date.now() + schedulesCacheTtl };
    return schedules;
  });

  if (providedPatients) return request;

  schedulesRequest = request.finally(() => {
    schedulesRequest = null;
  });

  return schedulesRequest;
};

export const getSchedulesForPatientsFromApi = async (
  patients: readonly PatientRecord[],
  options: { readonly limit?: number } = {},
): Promise<MedicationScheduleRecord[]> => {
  if (patients.length === 0) return [];

  const patientIds = patients.map((patient) => patient.id).sort();
  const patientIdsParam = patientIds.join(",");
  const limit = options.limit && options.limit > 0 ? Math.floor(options.limit) : undefined;
  const cacheKey = `${patientIdsParam}:${limit ?? "all"}`;
  const now = Date.now();
  const cached = schedulePatientsCache.get(cacheKey);
  if (cached && cached.expiresAt > now) return cached.data;
  const activeRequest = schedulePatientsRequests.get(cacheKey);
  if (activeRequest) return activeRequest;

  const patientById = new Map(patients.map((patient) => [patient.id, patient]));
  const request = api.get<{ data: ScheduleResponse[] }>("/medication-schedules", {
    params: { patient_ids: patientIdsParam, ...(limit ? { limit } : {}) },
  }).then((response) => {
    const schedules = response.data.data.map((schedule) => mapSchedule(schedule, patientById.get(schedule.patientId)));
    schedulePatientsCache.set(cacheKey, { data: schedules, expiresAt: Date.now() + schedulesCacheTtl });
    return schedules;
  }).finally(() => {
    schedulePatientsRequests.delete(cacheKey);
  });

  schedulePatientsRequests.set(cacheKey, request);
  return request;
};

export const getSchedulePatientGroupsPageFromApi = async (params: { page?: number; limit?: number; search?: string; status?: "active" | "inactive" | "all"; adherenceStatus?: PatientStatus; forceRefresh?: boolean } = {}): Promise<SchedulePatientGroupsPage> => {
  const page = params.page || 1;
  const limit = params.limit || 10;
  const search = params.search?.trim() || "";
  const status = params.status || "active";
  const adherenceStatus = params.adherenceStatus || "";
  const cacheKey = `${scheduleAdherenceCacheVersion}:${page}:${limit}:${status}:${search}:${adherenceStatus}`;

  if (params.forceRefresh) {
    scheduleGroupsCache.delete(cacheKey);
    scheduleGroupsRequests.delete(cacheKey);
  }

  const now = Date.now();
  const cached = scheduleGroupsCache.get(cacheKey);
  if (cached && cached.expiresAt > now) return cached.data;
  const activeRequest = scheduleGroupsRequests.get(cacheKey);
  if (activeRequest) return activeRequest;

  const request = api.get<SchedulePatientGroupsResponse>("/medication-schedules/patient-groups", {
    params: { page, limit, status, ...(search ? { search } : {}), ...(adherenceStatus ? { adherenceStatus } : {}) },
  }).then((response) => {
    const patients = response.data.data.patients.map(mapPatient);
    const patientById = new Map(patients.map((patient) => [patient.id, patient]));
    const schedules = response.data.data.schedules.map((schedule) => mapSchedule(schedule, patientById.get(schedule.patientId)));
    const result = {
      patients,
      schedules,
      meta: response.data.meta ?? { page, limit, total: patients.length },
    };
    scheduleGroupsCache.set(cacheKey, { data: result, expiresAt: Date.now() + schedulesCacheTtl });
    return result;
  }).finally(() => {
    scheduleGroupsRequests.delete(cacheKey);
  });

  scheduleGroupsRequests.set(cacheKey, request);
  return request;
};

export const createSchedulesViaApi = async (patientId: string, medicines: readonly ScheduleMedicineFormValues[], patients: readonly PatientRecord[]) => {
  const patientById = new Map(patients.map((patient) => [patient.id, patient]));
  const payloads = medicines.map((medicine) => mapMedicinePayload(patientId, medicine, medicine.status !== "Nonaktif"));
  const response = payloads.length === 1
    ? await api.post<SingleScheduleResponse>("/medication-schedules", payloads[0])
    : await api.post<ScheduleListResponse>("/medication-schedules/bulk", { schedules: payloads });
  await clearScheduleRelatedCaches();
  notifyScheduleChanged([patientId]);
  const schedules = Array.isArray(response.data.data) ? response.data.data : [response.data.data];
  return schedules.map((schedule) => mapSchedule(schedule, patientById.get(schedule.patientId)));
};

export const updateScheduleViaApi = async (scheduleId: string, patientId: string, medicine: ScheduleMedicineFormValues, patients: readonly PatientRecord[]) => {
  const patientById = new Map(patients.map((patient) => [patient.id, patient]));
  const response = await api.put<SingleScheduleResponse>(`/medication-schedules/${encodeURIComponent(scheduleId)}`, mapMedicinePayload(patientId, medicine, medicine.status !== "Nonaktif"));
  await clearScheduleRelatedCaches();
  notifyScheduleChanged([patientId]);
  return mapSchedule(response.data.data, patientById.get(response.data.data.patientId));
};

export const setScheduleActiveViaApi = async (schedule: MedicationScheduleRecord, isActive: boolean, patients: readonly PatientRecord[]) => {
  const patientById = new Map(patients.map((patient) => [patient.id, patient]));
  const response = await api.put<SingleScheduleResponse>(`/medication-schedules/${encodeURIComponent(schedule.id)}`, { isActive });
  await clearScheduleRelatedCaches();
  notifyScheduleChanged([schedule.patientId]);
  return mapSchedule(response.data.data, patientById.get(response.data.data.patientId));
};

export const deactivateScheduleViaApi = async (scheduleId: string) => {
  await api.delete(`/medication-schedules/${encodeURIComponent(scheduleId)}`);
  await clearScheduleRelatedCaches();
  notifyScheduleChanged([]);
};
