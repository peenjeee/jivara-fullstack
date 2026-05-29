import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminDashboardPage from "@/components/admin/AdminDashboardPage";
import AdminSettingsPage from "@/components/admin/AdminSettingsPage";
import NurseDashboardPage from "@/components/dashboard/NurseDashboardPage";
import NurseSettingsPage from "@/components/settings/NurseSettingsPage";
import PatientDashboardPage from "@/components/patient-dashboard/PatientDashboardPage";
import PatientSettingsPage from "@/components/settings/PatientSettingsPage";
import { getAdminDashboardData, getAdminDashboardStats, getNurseDashboardData } from "@/lib/dashboardApi";
import { getPatientDashboardData, getPatientDashboardOverviewData } from "@/lib/patientDashboardApi";
import { getAlertActivitiesFromApi } from "@/lib/alertsApi";
import { getAuditActivitiesFromApi } from "@/lib/auditLogApi";
import { getNursesFromApi } from "@/lib/nurseApi";
import { getPatientsFromApi } from "@/lib/patientApi";
import { getSchedulesFromApi } from "@/lib/scheduleApi";
import { useActivityLogStore } from "@/store/activityLog";
import { useNurseStore } from "@/store/nurses";
import { usePatientDashboardStore } from "@/store/patientDashboard";
import type { PatientRecord } from "@/lib/mocks/patients";
import type { MedicationScheduleRecord } from "@/lib/mocks/schedules";
import { UserRound } from "lucide-react";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/dashboard",
}));

vi.mock("@/components/ui/AppSplashScreen", () => ({
  useSplashScreen: () => ({ isSplashFinished: true }),
}));

vi.mock("@/lib/dashboardApi", () => ({
  emptyNurseDashboardData: { stats: [], patients: [] },
  getAdminDashboardData: vi.fn(),
  getAdminDashboardStats: vi.fn(),
  getNurseDashboardData: vi.fn(),
}));

vi.mock("@/lib/patientDashboardApi", () => ({
  getPatientDashboardData: vi.fn(),
  getPatientDashboardOverviewData: vi.fn(),
}));

vi.mock("@/lib/scheduleApi", () => ({
  getSchedulesFromApi: vi.fn(),
}));

vi.mock("@/lib/alertsApi", () => ({
  getAlertActivitiesFromApi: vi.fn(),
}));

vi.mock("@/lib/auditLogApi", () => ({
  getAuditActivitiesFromApi: vi.fn(),
}));

vi.mock("@/lib/nurseApi", () => ({
  getNursesFromApi: vi.fn(),
}));

vi.mock("@/lib/patientApi", () => ({
  getPatientsFromApi: vi.fn(),
}));

vi.mock("@/components/settings/ProfileSettingsForm", () => ({ default: () => <div>Form profil perawat</div> }));
vi.mock("@/components/settings/PatientProfileSettingsForm", () => ({ default: () => <div>Form profil pasien</div> }));
vi.mock("@/components/settings/SecuritySettingsForm", () => ({ default: () => <div>Form keamanan</div> }));
vi.mock("@/components/settings/NotificationSettingsForm", () => ({ default: () => <div>Form notifikasi perawat</div> }));
vi.mock("@/components/settings/PatientReminderSettingsForm", () => ({ default: () => <div>Form reminder pasien</div> }));
vi.mock("@/components/admin/AdminProfileSettingsForm", () => ({ default: () => <div>Form profil admin</div> }));
vi.mock("@/components/admin/AdminNotificationSettingsForm", () => ({ default: () => <div>Form notifikasi admin</div> }));

const patient: PatientRecord = {
  id: "JVR-01",
  name: "Budi Santoso",
  age: 50,
  gender: "Pria",
  status: "Need Special Attention",
  lastVisit: "Hari ini",
  adherence: 45,
  avatar: "BS",
};

const schedule: MedicationScheduleRecord = {
  id: "SCH-001",
  patientId: "JVR-01",
  patientName: "Budi Santoso",
  patientAvatar: "BS",
  medicineName: "Metformin",
  dose: "500 mg",
  medicineForm: "Tablet",
  stock: 12,
  frequency: "2 kali sehari",
  times: ["08:00"],
  mealRule: "Sesudah makan",
  startDate: "2026-05-09",
  reminderEnabled: true,
  status: "Aktif",
};

describe("role dashboard and settings features", () => {
  beforeEach(() => {
    push.mockClear();
    vi.mocked(getAdminDashboardData).mockReset();
    vi.mocked(getAdminDashboardStats).mockReset();
    vi.mocked(getNurseDashboardData).mockReset();
    vi.mocked(getPatientDashboardData).mockReset();
    vi.mocked(getPatientDashboardOverviewData).mockReset();
    vi.mocked(getSchedulesFromApi).mockReset();
    vi.mocked(getAlertActivitiesFromApi).mockReset();
    vi.mocked(getAuditActivitiesFromApi).mockReset();
    vi.mocked(getNursesFromApi).mockReset();
    vi.mocked(getPatientsFromApi).mockReset();
    useNurseStore.setState({ nurses: [] });
    useActivityLogStore.setState({ activities: [] });
    usePatientDashboardStore.getState().resetPatientDashboardState();
  });

  it("renders admin dashboard stats and admin settings sections", async () => {
    vi.mocked(getAdminDashboardData).mockResolvedValueOnce({
      stats: [
        { label: "Total Perawat", value: "-", tone: "neutral", color: "pine", icon: UserRound },
        { label: "Total Pasien", value: "12", tone: "safe", color: "leaf", icon: UserRound },
        { label: "Jadwal Aktif", value: "3", tone: "neutral", color: "lime", icon: UserRound },
      ],
      nurseFollowUps: [{
        nurse: {
          id: "NRS-001",
          fullName: "Ns. Luis Parisian V",
          email: "nurse1@jivara.test",
          phone: "6286056714045",
          gender: "Pria",
          status: "Nonaktif",
          joinedAt: "",
          temporaryPassword: false,
          assignedPatients: 8,
        },
        assignedPatientCount: 8,
        riskyPatientCount: 0,
      }],
      riskyPatients: [],
      priorityActivities: [],
      inactiveNurseReassignCount: 1,
    });
    vi.mocked(getSchedulesFromApi).mockResolvedValueOnce([schedule]);
    vi.mocked(getNursesFromApi).mockResolvedValueOnce([]);
    vi.mocked(getPatientsFromApi).mockResolvedValueOnce([patient]);
    vi.mocked(getAlertActivitiesFromApi).mockResolvedValueOnce([]);
    vi.mocked(getAuditActivitiesFromApi).mockResolvedValueOnce([]);

    render(<AdminDashboardPage />);

    expect(await screen.findByText("Dashboard Admin")).toBeInTheDocument();
    expect(await screen.findByText("Total Pasien")).toBeInTheDocument();
    expect(await screen.findByText("12")).toBeInTheDocument();
    expect(await screen.findByText("1 perawat nonaktif masih menangani pasien silahkan reassign.")).toBeInTheDocument();
    expect(await screen.findByText("8 pasien masih ditangani - silahkan reassign")).toBeInTheDocument();

    render(<AdminSettingsPage />);
    expect(screen.getByText("Pengaturan Admin")).toBeInTheDocument();
    expect(screen.getByText("Form profil admin")).toBeInTheDocument();
    expect(screen.getByText("Form notifikasi admin")).toBeInTheDocument();
  });

  it("renders nurse dashboard patients, opens patient detail, and nurse settings", async () => {
    vi.mocked(getNurseDashboardData).mockResolvedValueOnce({
      stats: [{ label: "Total Pasien", value: "1", tone: "safe", color: "pine", icon: UserRound }],
      patients: [patient],
    });

    render(<NurseDashboardPage />);

    expect(await screen.findByText("Ringkasan Pasien")).toBeInTheDocument();
    expect(screen.getAllByText("Budi Santoso")).not.toHaveLength(0);
    fireEvent.click(screen.getAllByRole("button", { name: "Lihat detail Budi Santoso" })[0]);
    expect(push).toHaveBeenCalledWith("/patients/JVR-01");

    render(<NurseSettingsPage />);
    expect(screen.getByText("Pengaturan")).toBeInTheDocument();
    expect(screen.getByText("Form profil perawat")).toBeInTheDocument();
    expect(screen.getByText("Form notifikasi perawat")).toBeInTheDocument();
  });

  it("renders patient dashboard summary and patient settings", async () => {
    const completedSchedule = { ...schedule, status: "Selesai" as const, endDate: "2026-05-19" };
    vi.mocked(getPatientDashboardOverviewData).mockResolvedValueOnce({
      patient: { ...patient, name: "Pasien Budi", adherence: 82, status: "On Ideal Schedule" },
      schedules: [completedSchedule],
      adherenceStats: {
        adherenceRate: 82,
        totalScheduled: 3,
        dailyBreakdown: [
          { date: "2026-05-15", scheduled: 1, confirmed: 1 },
          { date: "2026-05-20", scheduled: 2, confirmed: 0 },
        ],
      },
    });
    vi.mocked(getPatientDashboardData).mockResolvedValueOnce({
      patient: { ...patient, name: "Pasien Budi", adherence: 82, status: "On Ideal Schedule" },
      schedules: [completedSchedule],
      medicationLogs: [],
      adherenceStats: { adherenceRate: 82, totalScheduled: 1, dailyBreakdown: [{ date: "2026-05-15", scheduled: 1, confirmed: 1 }] },
    });

    render(<PatientDashboardPage />);

    await waitFor(() => expect(screen.getByText(/Pasien Budi/)).toBeInTheDocument());
    expect(screen.getByText("Obat Aktif Saya")).toBeInTheDocument();
    expect(screen.getByText("Kepatuhan Keseluruhan Saya")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /20 Mei 2026 - Belum ada data/i })).toBeInTheDocument();

    render(<PatientSettingsPage />);
    expect(screen.getByText("Profil Saya")).toBeInTheDocument();
    expect(screen.getByText("Form profil pasien")).toBeInTheDocument();
    expect(screen.getByText("Form reminder pasien")).toBeInTheDocument();
  });
});
