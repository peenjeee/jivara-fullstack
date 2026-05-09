import { AlertTriangle, CalendarClock, CheckCircle2, UserRound, UsersRound } from "lucide-react";
import type { SummaryCardItem } from "@/components/ui/SummaryCard";
import api from "@/lib/axios";
import type { PatientRecord, PatientStatus } from "@/lib/mocks/patients";

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
}

interface PaginatedResponse<T> {
  data: T[];
  meta?: {
    total?: number;
  };
}

interface AlertResponse {
  id: string;
  status: string;
  severity: "warning" | "critical";
}

interface AggregateAdherenceResponse {
  totalActivePatients: number;
  averageAdherenceRate: number;
  totalScheduled: number;
}

export interface NurseDashboardData {
  stats: SummaryCardItem[];
  patients: PatientRecord[];
}

export interface AdminDashboardStatsData {
  stats: SummaryCardItem[];
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

const getStatusFromAlerts = (criticalAlerts: number, warningAlerts: number): PatientStatus => {
  if (criticalAlerts > 0) return "Need Special Attention";
  if (warningAlerts > 0) return "Lagging Behind";
  return "On Ideal Schedule";
};

const mapPatient = (patient: PatientListResponse): PatientRecord => ({
  id: patient.id,
  name: patient.fullName,
  age: getAge(patient.dateOfBirth),
  gender: patient.gender === "female" ? "Wanita" : "Pria",
  phone: patient.phone ?? undefined,
  email: patient.email ?? undefined,
  address: patient.address ?? undefined,
  status: "On Ideal Schedule",
  lastVisit: patient.createdAt ? new Date(patient.createdAt).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "-",
  adherence: 100,
  avatar: getInitials(patient.fullName),
});

export const getNurseDashboardData = async (): Promise<NurseDashboardData> => {
  const [patientsResponse, alertsResponse] = await Promise.all([
    api.get<PaginatedResponse<PatientListResponse>>("/patients", { params: { limit: 5, status: "active" } }),
    api.get<PaginatedResponse<AlertResponse>>("/alerts", { params: { limit: 100 } }),
  ]);

  const alerts = alertsResponse.data.data;
  const criticalAlerts = alerts.filter((alert) => alert.severity === "critical" || alert.status === "missed").length;
  const warningAlerts = Math.max(alerts.length - criticalAlerts, 0);
  const totalPatients = patientsResponse.data.meta?.total ?? patientsResponse.data.data.length;
  const alertStatus = getStatusFromAlerts(criticalAlerts, warningAlerts);
  const patients = patientsResponse.data.data.map((patient, index) => ({
    ...mapPatient(patient),
    status: index === 0 ? alertStatus : "On Ideal Schedule",
    adherence: alertStatus === "Need Special Attention" && index === 0 ? 45 : alertStatus === "Lagging Behind" && index === 0 ? 65 : 90,
  }));

  return {
    stats: [
      { label: "Total Pasien", value: String(totalPatients), helper: "", tone: "safe", color: "pine", icon: UsersRound },
      { label: "Peringatan Kritis", value: String(criticalAlerts), helper: warningAlerts > 0 ? `${warningAlerts} peringatan aktif` : "", tone: criticalAlerts > 0 ? "critical" : "safe", color: "lime", icon: AlertTriangle },
      { label: "Kepatuhan Keseluruhan", value: criticalAlerts > 0 ? "Perlu dicek" : "Stabil", helper: "Berdasarkan alert aktif", tone: criticalAlerts > 0 ? "warning" : "safe", color: "leaf", icon: CheckCircle2, progress: criticalAlerts > 0 ? 67 : 90 },
    ],
    patients,
  };
};

export const getAdminDashboardStats = async (): Promise<AdminDashboardStatsData> => {
  const response = await api.get<{ data: AggregateAdherenceResponse }>("/adherence/aggregate", { params: { period: "30d" } });
  const aggregate = response.data.data;

  return {
    stats: [
      { label: "Total Perawat", value: "-", tone: "neutral", color: "pine", icon: UsersRound },
      { label: "Total Pasien", value: String(aggregate.totalActivePatients), tone: "safe", color: "leaf", icon: UserRound },
      { label: "Jadwal Aktif", value: String(aggregate.totalScheduled), tone: "neutral", color: "lime", icon: CalendarClock },
    ],
  };
};

export const emptyNurseDashboardData: NurseDashboardData = {
  stats: [],
  patients: [],
};
