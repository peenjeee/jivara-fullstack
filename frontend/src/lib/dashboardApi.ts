import { AlertTriangle, CalendarClock, CheckCircle2, UserRound, UsersRound } from "lucide-react";
import type { SummaryCardItem } from "@/components/ui/SummaryCard";
import api from "@/lib/axios";
import type { ActivityLogRecord } from "@/lib/mocks/activityLogs";
import type { NurseRecord } from "@/lib/mocks/nurses";
import type { PatientRecord, PatientStatus } from "@/lib/mocks/patients";
import { getNursesFromApi } from "@/lib/nurseApi";

interface PatientListResponse {
  id: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  address?: string | null;
  isActive?: boolean | null;
  createdAt?: string | null;
  lastLoginAt?: string | null;
  adherenceRate7d?: number | null;
  adherenceRate30d?: number | null;
  totalScheduled30d?: number | null;
  isMedicationComplete?: boolean;
}

interface PaginatedResponse<T> {
  data: T[];
  meta?: {
    total?: number;
    summary?: {
      warningCritical?: number;
    };
  };
}

interface AggregateAdherenceResponse {
  totalActivePatients: number;
  averageAdherenceRate: number;
  totalScheduled: number;
  totalActiveSchedules?: number;
}

interface NurseDashboardSummaryResponse {
  totalActivePatients: number;
  warningCriticalNotifications: number;
  overallAdherence: number;
}

export interface NurseDashboardData {
  stats: SummaryCardItem[];
  patients: PatientRecord[];
}

export interface AdminDashboardStatsData {
  stats: SummaryCardItem[];
}

export type AdminDashboardRiskyPatient = PatientRecord & {
  readonly assignedNurseName?: string;
};

interface AdminDashboardResponse {
  summary: {
    totalNurses: number;
    totalActivePatients: number;
    totalActiveSchedules: number;
  };
  nurseFollowUps: Array<{
    nurse: NurseRecord;
    assignedPatientCount: number;
    riskyPatientCount: number;
  }>;
  riskyPatients: AdminDashboardRiskyPatient[];
  priorityActivities: ActivityLogRecord[];
}

export interface AdminDashboardData extends AdminDashboardStatsData {
  nurseFollowUps: AdminDashboardResponse["nurseFollowUps"];
  riskyPatients: AdminDashboardRiskyPatient[];
  priorityActivities: ActivityLogRecord[];
}

const nurseDashboardCacheTtl = 15_000;
let nurseDashboardCache: { data: NurseDashboardData; expiresAt: number } | null = null;
let nurseDashboardRequest: Promise<NurseDashboardData> | null = null;

const adminDashboardCacheTtl = 15_000;
const adminDashboardCache = new Map<string, { data: AdminDashboardStatsData; expiresAt: number }>();
const adminDashboardRequests = new Map<string, Promise<AdminDashboardStatsData>>();
let fullAdminDashboardCache: { data: AdminDashboardData; expiresAt: number } | null = null;
let fullAdminDashboardRequest: Promise<AdminDashboardData> | null = null;

export const clearDashboardCache = () => {
  nurseDashboardCache = null;
  nurseDashboardRequest = null;
  adminDashboardCache.clear();
  adminDashboardRequests.clear();
  fullAdminDashboardCache = null;
  fullAdminDashboardRequest = null;
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

const formatDate = (value?: string | null, fallback = "-") => {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
};

const getStatusFromAdherence = (adherence: number, isComplete = false): PatientStatus => {
  if (isComplete) return "Complete";
  if (adherence < 50) return "Need Special Attention";
  if (adherence < 75) return "Lagging Behind";
  return "On Ideal Schedule";
};

const mapPatient = (patient: PatientListResponse, adherence: number, status: PatientStatus): PatientRecord => ({
  id: patient.id,
  name: patient.fullName,
  age: getAge(patient.dateOfBirth),
  gender: patient.gender === "female" ? "Wanita" : "Pria",
  phone: patient.phone ?? undefined,
  email: patient.email ?? undefined,
  address: patient.address ?? undefined,
  status,
  lastVisit: formatDate(patient.lastLoginAt, "Belum pernah login"),
  adherence,
  avatar: getInitials(patient.fullName),
});

const getPatientListAdherence = (patient: PatientListResponse) => {
  if (!patient.totalScheduled30d) return 100;
  return Math.round(patient.adherenceRate30d ?? patient.adherenceRate7d ?? 0);
};

export const getNurseDashboardData = async (): Promise<NurseDashboardData> => {
  const now = Date.now();
  if (nurseDashboardCache && nurseDashboardCache.expiresAt > now) return nurseDashboardCache.data;
  if (nurseDashboardRequest) return nurseDashboardRequest;

  nurseDashboardRequest = (async () => {
    const [patientsResponse, summaryResponse] = await Promise.all([
      api.get<PaginatedResponse<PatientListResponse>>("/patients", { params: { limit: 5, status: "active" } }),
      api.get<{ data: NurseDashboardSummaryResponse }>("/admin-dashboard/nurse-summary"),
    ]);

    const summary = summaryResponse.data.data;
    const totalWarningCriticalAlerts = summary.warningCriticalNotifications;
    const totalPatients = summary.totalActivePatients ?? patientsResponse.data.meta?.total ?? patientsResponse.data.data.length;
    const patientAdherence = patientsResponse.data.data.map(getPatientListAdherence);
    const averageAdherenceRate = Math.round(summary.overallAdherence ?? 0);
    const patients = patientsResponse.data.data.map((patient, index) => {
      const adherence = patientAdherence[index] ?? 0;
      return mapPatient(patient, adherence, getStatusFromAdherence(adherence, patient.isMedicationComplete));
    });

    const result: NurseDashboardData = {
      stats: [
        { label: "Total Pasien Saya", value: String(totalPatients), helper: "", tone: "safe", color: "pine", icon: UsersRound },
        { label: "Notifikasi Peringatan Pasien", value: String(totalWarningCriticalAlerts), helper: totalWarningCriticalAlerts > 0 ? "peringatan/kritis aktif" : "", tone: totalWarningCriticalAlerts > 0 ? "warning" : "safe", color: "lime", icon: AlertTriangle },
        { label: "Kepatuhan Pasien Keseluruhan", value: `${averageAdherenceRate}%`, helper: "Semua periode", tone: averageAdherenceRate >= 80 ? "safe" : averageAdherenceRate >= 60 ? "warning" : "critical", color: "leaf", icon: CheckCircle2, progress: averageAdherenceRate },
      ],
      patients,
    };
    nurseDashboardCache = { data: result, expiresAt: Date.now() + nurseDashboardCacheTtl };
    return result;
  })().finally(() => {
    nurseDashboardRequest = null;
  });

  return nurseDashboardRequest;
};

export const getAdminDashboardStats = async (params: { nurseTotal?: number } = {}): Promise<AdminDashboardStatsData> => {
  const cacheKey = `nurses:${params.nurseTotal ?? "all"}`;
  const now = Date.now();
  const cached = adminDashboardCache.get(cacheKey);
  if (cached && cached.expiresAt > now) return cached.data;
  const activeRequest = adminDashboardRequests.get(cacheKey);
  if (activeRequest) return activeRequest;

  const request = (async () => {
    const [response, nurses] = await Promise.all([
      api.get<{ data: AggregateAdherenceResponse }>("/adherence/aggregate"),
      params.nurseTotal === undefined ? getNursesFromApi() : Promise.resolve([]),
    ]);
    const aggregate = response.data.data;
    const nurseTotal = params.nurseTotal ?? nurses.length;

    const result: AdminDashboardStatsData = {
      stats: [
        { label: "Total Perawat Saya", value: String(nurseTotal), tone: "neutral", color: "pine", icon: UsersRound },
        { label: "Total Pasien Saya", value: String(aggregate.totalActivePatients), tone: "safe", color: "leaf", icon: UserRound },
        { label: "Jadwal Pasien Aktif", value: String(aggregate.totalActiveSchedules ?? aggregate.totalScheduled), tone: "neutral", color: "lime", icon: CalendarClock },
      ],
    };
    adminDashboardCache.set(cacheKey, { data: result, expiresAt: Date.now() + adminDashboardCacheTtl });
    return result;
  })().finally(() => {
    adminDashboardRequests.delete(cacheKey);
  });

  adminDashboardRequests.set(cacheKey, request);
  return request;
};

export const getAdminDashboardData = async (): Promise<AdminDashboardData> => {
  const now = Date.now();
  if (fullAdminDashboardCache && fullAdminDashboardCache.expiresAt > now) return fullAdminDashboardCache.data;
  if (fullAdminDashboardRequest) return fullAdminDashboardRequest;

  fullAdminDashboardRequest = (async () => {
    const response = await api.get<{ data: AdminDashboardResponse }>("/admin-dashboard");
    const { summary, nurseFollowUps, riskyPatients, priorityActivities } = response.data.data;

    const result: AdminDashboardData = {
      stats: [
        { label: "Total Perawat Saya", value: String(summary.totalNurses), tone: "neutral", color: "pine", icon: UsersRound },
        { label: "Total Pasien Saya", value: String(summary.totalActivePatients), tone: "safe", color: "leaf", icon: UserRound },
        { label: "Jadwal Pasien Aktif", value: String(summary.totalActiveSchedules), tone: "neutral", color: "lime", icon: CalendarClock },
      ],
      nurseFollowUps,
      riskyPatients,
      priorityActivities,
    };

    fullAdminDashboardCache = { data: result, expiresAt: Date.now() + adminDashboardCacheTtl };
    return result;
  })().finally(() => {
    fullAdminDashboardRequest = null;
  });

  return fullAdminDashboardRequest;
};

export const emptyNurseDashboardData: NurseDashboardData = {
  stats: [],
  patients: [],
};
