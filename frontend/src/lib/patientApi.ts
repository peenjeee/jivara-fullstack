import api from "@/lib/axios";
import type { ActivityLogRecord } from "@/lib/mocks/activityLogs";
import type { PatientRecord, PatientStatus } from "@/lib/mocks/patients";
import type { MedicationScheduleRecord } from "@/lib/mocks/schedules";
import { getActivityDistribution, type PatientDetailData } from "@/helpers/patientDetails";
import type { AddPatientValues } from "@/components/patients/addPatientFormUtils";
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
  assignedNurses?: Array<{ id: string; name?: string | null }> | null;
  adherenceRateAll?: number | null;
  totalScheduledAll?: number | null;
  isActive?: boolean | null;
  createdAt?: string | null;
  lastLoginAt?: string | null;
  isMedicationComplete?: boolean;
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
    medicineForm?: string | null;
    mealRule?: string | null;
    stock?: number | null;
    frequency: number;
    scheduledTimes: unknown;
    instructions?: string | null;
    createdAt?: string | null;
  }>;
  activeMedicationsCount?: number;
  adherenceRateAll?: number;
  totalScheduledAll?: number;
  totalFoodScans?: number;
  totalInteractionWarnings?: number;
}

interface PaginatedResponse<T> {
  data: T[];
  meta?: { page?: number; limit?: number; total?: number };
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

interface PatientMedicationScheduleResponse {
  id: string;
  patientId: string;
  drugName: string;
  dosage: string;
  medicineForm?: string | null;
  mealRule?: string | null;
  stock?: number | null;
  frequency: number;
  scheduledTimes: unknown;
  instructions?: string | null;
  reminderEnabled?: boolean | null;
  isActive?: boolean | null;
  completedAt?: string | null;
  startDate?: string | null;
  endDate?: string | null;
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

const patientsCacheTtl = 30_000;
const patientAdherenceCacheVersion = "adherence-all-v1";
let patientsCache: { data: PatientRecord[]; expiresAt: number } | null = null;
let patientsRequest: Promise<PatientRecord[]> | null = null;
const patientListPageLimit = 100;
const patientPageCacheTtl = 10_000;
const patientPageCache = new Map<string, { data: PatientPage; expiresAt: number }>();
const patientPageRequests = new Map<string, Promise<PatientPage>>();

export type PatientPage = {
  patients: PatientRecord[];
  meta: { page: number; limit: number; total: number };
};

const patientDetailCache = new Map<string, { data: PatientDetailData; expiresAt: number }>();
const patientDetailRequests = new Map<string, Promise<PatientDetailData>>();
const patientDetailCacheTtl = 30_000;
const patientDetailPreviewLimit = 5;

const assignedPatientsCache = new Map<string, { data: PatientRecord[]; expiresAt: number }>();
const assignedPatientsRequests = new Map<string, Promise<PatientRecord[]>>();
const assignedPatientsCacheTtl = 30_000;
let currentPatientCache: { data: PatientRecord; expiresAt: number } | null = null;
let currentPatientRequest: Promise<PatientRecord> | null = null;

export const clearPatientsCache = () => {
  patientsCache = null;
  patientsRequest = null;
  patientPageCache.clear();
  patientPageRequests.clear();
  patientDetailCache.clear();
  patientDetailRequests.clear();
  assignedPatientsCache.clear();
  assignedPatientsRequests.clear();
  currentPatientCache = null;
  currentPatientRequest = null;
};

const clearPatientRelatedCaches = async () => {
  clearPatientsCache();
  await Promise.all([
    import("./dashboardApi").then(({ clearDashboardCache }) => clearDashboardCache()).catch(() => undefined),
    import("./scheduleApi").then(({ clearSchedulesCache }) => clearSchedulesCache()).catch(() => undefined),
    import("./patientDashboardApi").then(({ clearPatientDashboardCache }) => clearPatientDashboardCache()).catch(() => undefined),
  ]);
};

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

const getStatus = (adherence: number, isComplete = false): PatientStatus => {
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

const getPatientListAdherence = (patient: PatientListResponse, fallback = 100) => {
  if (!patient.totalScheduledAll) return 100;
  return Math.round(patient.adherenceRateAll ?? fallback);
};

const mapPatient = (patient: PatientListResponse, adherence = getPatientListAdherence(patient)): PatientRecord => ({
  id: patient.id,
  name: patient.fullName || patient.user?.fullName || "-",
  age: getAge(patient.dateOfBirth),
  gender: patient.gender === "female" ? "Wanita" : "Pria",
  phone: patient.phone ?? patient.user?.phone ?? undefined,
  email: patient.email ?? patient.user?.email ?? undefined,
  address: patient.address ?? undefined,
  status: patient.isActive === false ? "Nonaktif" : getStatus(adherence, patient.isMedicationComplete),
  lastVisit: formatDate(patient.lastLoginAt, "Belum pernah login"),
  adherence,
  avatar: getInitials(patient.fullName || patient.user?.fullName || "-"),
  assignedNurseId: patient.assignedNurseId ?? undefined,
  assignedNurses: patient.assignedNurses?.map((nurse) => ({ id: nurse.id, name: nurse.name || "Perawat" })) ?? [],
});

const mapMedication = (patient: PatientRecord, medication: PatientMedicationScheduleResponse): MedicationScheduleRecord => {
  const times = Array.isArray(medication.scheduledTimes) ? medication.scheduledTimes.filter((time): time is string => typeof time === "string") : [];
  const stock = Math.max(Number(medication.stock ?? 0), 0);

  return {
    id: medication.id,
    patientId: patient.id,
    patientName: patient.name,
    patientAvatar: patient.avatar,
    medicineName: medication.drugName,
    dose: medication.dosage,
    medicineForm: (medication.medicineForm as MedicationScheduleRecord["medicineForm"] | null | undefined) || "Tablet",
    stock,
    frequency: `${medication.frequency} kali sehari`,
    times,
    mealRule: (medication.mealRule as MedicationScheduleRecord["mealRule"] | null | undefined) || "Tidak tergantung makan",
    startDate: medication.startDate?.slice(0, 10) || medication.createdAt?.slice(0, 10) || new Date().toISOString().slice(0, 10),
    endDate: medication.endDate?.slice(0, 10) || medication.completedAt?.slice(0, 10) || undefined,
    reminderEnabled: medication.reminderEnabled ?? true,
    instructions: medication.instructions ?? undefined,
    status: stock <= 0 ? "Selesai" : medication.isActive === false ? "Nonaktif" : "Aktif",
  };
};

const getPatientSchedulesFromApi = async (patient: PatientRecord): Promise<MedicationScheduleRecord[]> => {
  const response = await api.get<PaginatedResponse<PatientMedicationScheduleResponse>>("/medication-schedules", {
    params: { patient_id: patient.id },
  });

  return response.data.data.map((schedule) => mapMedication(patient, schedule));
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
  read: false,
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

const getTotalFromPaginatedResponse = <T,>(response: PaginatedResponse<T>, fallback: number) => response.meta?.total ?? fallback;

const getPatientListPageFromApi = async (params: { page: number; status: "active"; nurseId?: string }): Promise<PatientPage> => {
  const response = await api.get<PaginatedResponse<PatientListResponse>>("/patients", {
    params: { page: params.page, limit: patientListPageLimit, status: params.status, ...(params.nurseId ? { nurseId: params.nurseId } : {}) },
  });
  const patients = response.data.data.map((patient) => mapPatient(patient));
  return {
    patients,
    meta: {
      page: response.data.meta?.page ?? params.page,
      limit: response.data.meta?.limit ?? patientListPageLimit,
      total: response.data.meta?.total ?? patients.length,
    },
  };
};

const getAllPatientListPagesFromApi = async (params: { status: "active"; nurseId?: string }) => {
  const firstPage = await getPatientListPageFromApi({ ...params, page: 1 });
  const totalPages = Math.ceil(firstPage.meta.total / firstPage.meta.limit);
  const remainingPages = totalPages > 1
    ? await Promise.all(Array.from({ length: totalPages - 1 }, (_, index) => getPatientListPageFromApi({ ...params, page: index + 2 })))
    : [];
  return [firstPage, ...remainingPages].flatMap((page) => page.patients);
};

const getPatientActivitiesFromApi = async (patient: PatientRecord, scans: PatientDetailData["scans"], totalFoodScans: number, limit = patientDetailPreviewLimit): Promise<Pick<PatientDetailData, "activities" | "activityDistribution">> => {
  const [logResponse, alertResponse] = await Promise.all([
    api.get<PaginatedResponse<MedicationLogResponse>>("/medication-logs", { params: { patient_id: patient.id, limit } }).catch(() => ({ data: { data: [] } })),
    api.get<PaginatedResponse<AlertResponse>>("/alerts", { params: { patient_id: patient.id, limit } }).catch(() => ({ data: { data: [] } })),
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
    read: false,
  }));

  const activities = [...medicationActivities, ...alertActivities, ...scanActivities]
    .sort((first, second) => Date.parse(second.timestamp) - Date.parse(first.timestamp));
  const activityDistribution: PatientDetailData["activityDistribution"] = [
    { label: "Reminder", value: getTotalFromPaginatedResponse(logResponse.data, medicationActivities.length) },
    { label: "Kepatuhan", value: getTotalFromPaginatedResponse(alertResponse.data, alertActivities.length) },
    { label: "Scan Makanan", value: totalFoodScans },
  ];

  return { activities, activityDistribution };
};

export const getPatientsFromApi = async () => {
  const now = Date.now();
  if (patientsCache && patientsCache.expiresAt > now) return patientsCache.data;
  if (patientsRequest) return patientsRequest;

  patientsRequest = getAllPatientListPagesFromApi({ status: "active" })
    .then((patients) => {
      patientsCache = { data: patients, expiresAt: Date.now() + patientsCacheTtl };
      return patients;
    })
    .finally(() => {
      patientsRequest = null;
    });

  return patientsRequest;
};

export const getCurrentPatientFromApi = async (): Promise<PatientRecord> => {
  const now = Date.now();
  if (currentPatientCache && currentPatientCache.expiresAt > now) return currentPatientCache.data;
  if (currentPatientRequest) return currentPatientRequest;

  currentPatientRequest = api.get<{ data: PatientDetailResponse }>("/patients/me")
    .then((response) => {
      const detail = response.data.data;
      const adherence = detail.activeMedicationsCount === 0
        ? 100
        : Math.round(detail.adherenceRateAll ?? 100);
      const patient = mapPatient({ ...detail, createdAt: detail.registeredAt ?? detail.createdAt }, adherence);
      currentPatientCache = { data: patient, expiresAt: Date.now() + patientsCacheTtl };
      return patient;
    })
    .finally(() => {
      currentPatientRequest = null;
    });

  return currentPatientRequest;
};

export const getPatientPageFromApi = async (params: { page?: number; limit?: number; search?: string; status?: "active" | "inactive" | "all"; adherenceStatus?: PatientStatus; nurseId?: string; forceRefresh?: boolean } = {}): Promise<PatientPage> => {
  const page = params.page || 1;
  const limit = params.limit || 20;
  const status = params.status || "active";
  const search = params.search?.trim() || "";
  const adherenceStatus = params.adherenceStatus || "";
  const nurseId = params.nurseId || "";
  const cacheKey = `${patientAdherenceCacheVersion}:${page}:${limit}:${status}:${search}:${adherenceStatus}:${nurseId}`;
  if (params.forceRefresh) {
    patientPageCache.delete(cacheKey);
    patientPageRequests.delete(cacheKey);
  }
  const now = Date.now();
  const cached = patientPageCache.get(cacheKey);
  if (cached && cached.expiresAt > now) return cached.data;
  const activeRequest = patientPageRequests.get(cacheKey);
  if (activeRequest) return activeRequest;

  const request = api.get<PaginatedResponse<PatientListResponse>>("/patients", {
    params: { page, limit, status, ...(search ? { search } : {}), ...(adherenceStatus ? { adherenceStatus } : {}), ...(nurseId ? { nurseId } : {}) },
  })
    .then((response) => {
      const patients = response.data.data.map((patient) => mapPatient(patient));
      const result = {
        patients,
        meta: {
          page: response.data.meta?.page ?? page,
          limit: response.data.meta?.limit ?? limit,
          total: response.data.meta?.total ?? patients.length,
        },
      };
      patientPageCache.set(cacheKey, { data: result, expiresAt: Date.now() + patientPageCacheTtl });
      return result;
    })
    .finally(() => {
      patientPageRequests.delete(cacheKey);
    });

  patientPageRequests.set(cacheKey, request);
  return request;
};

export const createPatientViaApi = async (values: AddPatientValues) => {
  const response = await api.post<SinglePatientResponse>("/patients", mapPatientPayload(values, true));
  await clearPatientRelatedCaches();
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
  await clearPatientRelatedCaches();
  const detail = response.data.data;
  return mapPatient({ ...detail, createdAt: detail.createdAt ?? undefined });
};

export const deactivatePatientViaApi = async (patientId: string) => {
  await api.delete(`/patients/${encodeURIComponent(patientId)}`);
  await clearPatientRelatedCaches();
};

export const activatePatientViaApi = async (patientId: string) => {
  const response = await api.put<SinglePatientResponse>(`/patients/${encodeURIComponent(patientId)}`, { isActive: true });
  await clearPatientRelatedCaches();
  return mapPatient(response.data.data);
};

export const getPatientDetailFromApi = async (patientId: string, options: { readonly forceRefresh?: boolean } = {}): Promise<PatientDetailData> => {
  const now = Date.now();
  if (options.forceRefresh) {
    patientDetailCache.delete(patientId);
    patientDetailRequests.delete(patientId);
  }
  const cached = patientDetailCache.get(patientId);
  if (cached && cached.expiresAt > now) return cached.data;
  const activeRequest = patientDetailRequests.get(patientId);
  if (activeRequest) return activeRequest;

  const request = (async () => {
    const response = await api.get<{ data: PatientDetailResponse }>(`/patients/${encodeURIComponent(patientId)}`);
    const detail = response.data.data;

    const patientFinal = mapPatient({ ...detail, createdAt: detail.registeredAt ?? detail.createdAt });
    const schedules = await getPatientSchedulesFromApi(patientFinal)
      .catch(() => (detail.activeMedications?.map((medication) => mapMedication(patientFinal, { ...medication, patientId: patientFinal.id, stock: 1, reminderEnabled: true, isActive: true })) ?? []));

    const scans = detail.totalFoodScans === 0
      ? []
      : await getFoodScansForPatientFromApi(patientId, patientDetailPreviewLimit).catch(() => []);
    const activityResult = await getPatientActivitiesFromApi(patientFinal, scans, detail.totalFoodScans ?? scans.length, patientDetailPreviewLimit)
      .catch(() => ({ activities: [], activityDistribution: getActivityDistribution([]) }));

    const result = { patient: patientFinal, schedules, activities: activityResult.activities, activityDistribution: activityResult.activityDistribution, scans };
    patientDetailCache.set(patientId, { data: result, expiresAt: Date.now() + patientDetailCacheTtl });
    return result;
  })().finally(() => {
    patientDetailRequests.delete(patientId);
  });

  patientDetailRequests.set(patientId, request);
  return request;
};

export const getPatientsAssignedToNurseFromApi = async (nurseId: string) => {
  const now = Date.now();
  const cached = assignedPatientsCache.get(nurseId);
  if (cached && cached.expiresAt > now) return cached.data;
  const activeRequest = assignedPatientsRequests.get(nurseId);
  if (activeRequest) return activeRequest;

  const request = getAllPatientListPagesFromApi({ status: "active", nurseId })
    .then((patients) => {
      assignedPatientsCache.set(nurseId, { data: patients, expiresAt: Date.now() + assignedPatientsCacheTtl });
      return patients;
    })
    .finally(() => {
      assignedPatientsRequests.delete(nurseId);
    });

  assignedPatientsRequests.set(nurseId, request);
  return request;
};

export const assignPatientToNurseViaApi = async (patientId: string, nurseId: string) => {
  await assignPatientToNursesViaApi(patientId, [nurseId]);
};

export const assignPatientToNursesViaApi = async (patientId: string, nurseIds: readonly string[]) => {
  await api.put(`/patients/${encodeURIComponent(patientId)}/assign`, { nurseIds });
  await clearPatientRelatedCaches();
};

export const getInitialPatientDetail = (patientId: string): PatientDetailData => {
  return {
    patient: {
      id: patientId,
      name: "-",
      age: 0,
      gender: "Pria",
      status: "On Ideal Schedule",
      lastVisit: "Belum pernah login",
      adherence: 100,
      avatar: "PX",
    },
    schedules: [],
    activities: [],
    activityDistribution: getActivityDistribution([]),
    scans: [],
  };
};
