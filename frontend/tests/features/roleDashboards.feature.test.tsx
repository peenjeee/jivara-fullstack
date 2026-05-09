import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminDashboardPage from "@/components/admin/AdminDashboardPage";
import AdminSettingsPage from "@/components/admin/AdminSettingsPage";
import NurseDashboardPage from "@/components/dashboard/NurseDashboardPage";
import NurseSettingsPage from "@/components/settings/NurseSettingsPage";
import PatientDashboardPage from "@/components/patient-dashboard/PatientDashboardPage";
import PatientSettingsPage from "@/components/settings/PatientSettingsPage";
import { getAdminDashboardStats, getNurseDashboardData } from "@/lib/dashboardApi";
import { getPatientDashboardData } from "@/lib/patientDashboardApi";
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

vi.mock("@/lib/dashboardApi", async () => {
  const actual = await vi.importActual<typeof import("@/lib/dashboardApi")>("@/lib/dashboardApi");
  return {
    ...actual,
    getAdminDashboardStats: vi.fn(),
    getNurseDashboardData: vi.fn(),
  };
});

vi.mock("@/lib/patientDashboardApi", () => ({
  getPatientDashboardData: vi.fn(),
}));

vi.mock("@/lib/scheduleApi", () => ({
  getSchedulesFromApi: vi.fn(),
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
    vi.mocked(getAdminDashboardStats).mockReset();
    vi.mocked(getNurseDashboardData).mockReset();
    vi.mocked(getPatientDashboardData).mockReset();
    vi.mocked(getSchedulesFromApi).mockReset();
    useNurseStore.setState({ nurses: [], assignments: {} });
    useActivityLogStore.setState({ activities: [] });
    usePatientDashboardStore.getState().resetPatientDashboardState();
  });

  it("renders admin dashboard stats and admin settings sections", async () => {
    vi.mocked(getAdminDashboardStats).mockResolvedValueOnce({
      stats: [
        { label: "Total Perawat", value: "-", tone: "neutral", color: "pine", icon: UserRound },
        { label: "Total Pasien", value: "12", tone: "safe", color: "leaf", icon: UserRound },
        { label: "Jadwal Aktif", value: "3", tone: "neutral", color: "lime", icon: UserRound },
      ],
    });
    vi.mocked(getSchedulesFromApi).mockResolvedValueOnce([schedule]);

    render(<AdminDashboardPage />);

    expect(await screen.findByText("Dashboard Admin")).toBeInTheDocument();
    expect(await screen.findByText("Total Pasien")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();

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
    vi.mocked(getPatientDashboardData).mockResolvedValueOnce({
      patient: { ...patient, name: "Pasien Budi", adherence: 82, status: "On Ideal Schedule" },
      schedules: [schedule],
      medicationLogs: [],
    });

    render(<PatientDashboardPage />);

    await waitFor(() => expect(screen.getByText(/Pasien Budi/)).toBeInTheDocument());
    expect(screen.getByText("Obat Aktif")).toBeInTheDocument();
    expect(screen.getByText("Kepatuhan Saya")).toBeInTheDocument();

    render(<PatientSettingsPage />);
    expect(screen.getByText("Profil Saya")).toBeInTheDocument();
    expect(screen.getByText("Form profil pasien")).toBeInTheDocument();
    expect(screen.getByText("Form reminder pasien")).toBeInTheDocument();
  });
});
