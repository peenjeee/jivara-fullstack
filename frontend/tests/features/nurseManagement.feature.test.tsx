import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import NurseDetailPage from "@/components/admin/NurseDetailPage";
import NurseListPage from "@/components/admin/NurseListPage";
import { getNurseByIdFromApi, getNursesFromApi, getNursesPageFromApi, updateNurseViaApi } from "@/lib/nurseApi";
import { getAuditActivityPageFromApi } from "@/lib/auditLogApi";
import { getNotificationActivityPageFromApi } from "@/lib/notificationActivitiesApi";
import { getPatientPageFromApi } from "@/lib/patientApi";
import { getSchedulesForPatientsFromApi } from "@/lib/scheduleApi";
import { showConfirm, showToast, showWarning } from "@/lib/swal";
import { useAuthStore } from "@/store/auth";
import { useNurseStore } from "@/store/nurses";
import type { NurseRecord } from "@/lib/mocks/nurses";
import type { PatientRecord } from "@/lib/mocks/patients";

const push = vi.fn();
const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace }),
  usePathname: () => "/nurses",
}));

vi.mock("@/lib/nurseApi", () => ({
  createNurseViaApi: vi.fn(),
  deactivateNurseViaApi: vi.fn(),
  getNurseByIdFromApi: vi.fn(),
  getNursesFromApi: vi.fn(),
  getNursesPageFromApi: vi.fn(),
  updateNurseViaApi: vi.fn(),
}));

vi.mock("@/lib/auditLogApi", () => ({
  getAuditActivityPageFromApi: vi.fn(),
}));

vi.mock("@/lib/notificationActivitiesApi", () => ({
  getNotificationActivityPageFromApi: vi.fn(),
}));

vi.mock("@/lib/patientApi", () => ({
  assignPatientToNurseViaApi: vi.fn(),
  getPatientPageFromApi: vi.fn(),
}));

vi.mock("@/lib/scheduleApi", () => ({
  getSchedulesForPatientsFromApi: vi.fn(),
}));

vi.mock("@/lib/swal", () => ({
  showConfirm: vi.fn(),
  showError: vi.fn(),
  showToast: vi.fn(),
  showWarning: vi.fn(),
}));

const nurse: NurseRecord = {
  id: "NRS-001",
  fullName: "Suster Nina",
  email: "nina@test.local",
  phone: "6281",
  gender: "Wanita",
  status: "Aktif",
  joinedAt: "09 Mei 2026",
  temporaryPassword: false,
};

const inactiveNurse: NurseRecord = {
  ...nurse,
  fullName: "Ns. Luis Parisian V",
  email: "nurse1@jivara.test",
  phone: "6286056714045",
  gender: "Pria",
  status: "Nonaktif",
  assignedPatients: 8,
};

const makePatient = (id: string, name: string, status: PatientRecord["status"], adherence?: number): PatientRecord => ({
  id,
  name,
  age: 50,
  gender: "Pria",
  status,
  lastVisit: "27 Mei 2026",
  adherence: adherence ?? (status === "Complete" ? 7 : 100),
  avatar: name.slice(0, 2).toUpperCase(),
  assignedNurseId: "NRS-001",
});

describe("nurse management feature", () => {
  beforeEach(() => {
    push.mockClear();
    replace.mockClear();
    vi.mocked(getNurseByIdFromApi).mockReset();
    vi.mocked(getNursesFromApi).mockReset();
    vi.mocked(getNursesPageFromApi).mockReset();
    vi.mocked(updateNurseViaApi).mockReset();
    vi.mocked(getPatientPageFromApi).mockReset();
    vi.mocked(getSchedulesForPatientsFromApi).mockReset();
    vi.mocked(getAuditActivityPageFromApi).mockReset();
    vi.mocked(getNotificationActivityPageFromApi).mockReset();
    vi.mocked(showConfirm).mockReset();
    vi.mocked(showToast).mockClear();
    vi.mocked(showWarning).mockClear();
    useAuthStore.setState({ user: { id: "admin-1", fullName: "Admin", email: "admin@test.local", role: "admin", accountStatus: "active", age: 30 }, isAuthenticated: true, hasHydrated: true });
    useNurseStore.setState({ nurses: [] });
  });

  it("loads nurses, searches, and opens detail", async () => {
    vi.mocked(getNursesFromApi).mockResolvedValue([nurse]);
    vi.mocked(getNursesPageFromApi).mockResolvedValue({ nurses: [nurse], meta: { page: 1, limit: 10, total: 1 } });

    render(<NurseListPage />);

    expect(await screen.findAllByText("Suster Nina")).not.toHaveLength(0);
    fireEvent.change(screen.getByPlaceholderText("Cari perawat ..."), { target: { value: "Nina" } });
    expect(screen.getAllByText("Suster Nina")).not.toHaveLength(0);

    fireEvent.click(screen.getAllByRole("button", { name: "Lihat detail Suster Nina" })[0]);
    expect(push).toHaveBeenCalledWith("/nurses/NRS-001");
  });

  it("toggles nurse status after confirmation", async () => {
    vi.mocked(getNursesFromApi).mockResolvedValue([nurse]);
    vi.mocked(getNursesPageFromApi).mockResolvedValue({ nurses: [nurse], meta: { page: 1, limit: 10, total: 1 } });
    vi.mocked(showConfirm).mockResolvedValueOnce({ isConfirmed: true, isDenied: false, isDismissed: false });
    vi.mocked(updateNurseViaApi).mockResolvedValueOnce({ ...nurse, status: "Nonaktif" });

    render(<NurseListPage />);

    expect(await screen.findAllByText("Suster Nina")).not.toHaveLength(0);
    fireEvent.click(screen.getAllByRole("button", { name: "Nonaktifkan Suster Nina" })[0]);

    await waitFor(() => expect(updateNurseViaApi).toHaveBeenCalledWith("NRS-001", expect.objectContaining({ status: "Nonaktif" })));
    expect(showToast).toHaveBeenCalledWith("Status perawat menjadi Nonaktif.");
  });

  it("counts handled patients and average adherence with their own status rules in nurse detail", async () => {
    const patients = [
      makePatient("patient-1", "Rama Danadipa Putra Wijaya", "On Ideal Schedule", 100),
      makePatient("patient-2", "Panji Ihsanudin Fajri", "Lagging Behind", 100),
      makePatient("patient-3", "Britney Bins-Oberbrunner", "Complete", 20),
      makePatient("patient-4", "Phillip Little", "Nonaktif", 20),
    ];
    vi.mocked(getNurseByIdFromApi).mockResolvedValue(inactiveNurse);
    vi.mocked(getPatientPageFromApi).mockResolvedValue({ patients, meta: { page: 1, limit: 1000, total: 4 } });
    vi.mocked(getSchedulesForPatientsFromApi).mockResolvedValue([]);
    vi.mocked(getAuditActivityPageFromApi).mockResolvedValue({ activities: [], meta: { page: 1, limit: 10, total: 0 } });
    vi.mocked(getNotificationActivityPageFromApi).mockResolvedValue({ activities: [], meta: { page: 1, limit: 10, total: 0 } });

    render(<NurseDetailPage nurseId="NRS-001" />);

    expect(await screen.findByText("Ns. Luis Parisian V")).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByText("Pasien Ditangani")[0].closest("article")).toHaveTextContent("2"));
    expect(screen.getByText("Rata-rata Kepatuhan Pasien").closest("article")).toHaveTextContent("60%");
    expect(screen.getByText("Perawat nonaktif ini masih memiliki 2 pasien aktif.")).toBeInTheDocument();
    await waitFor(() => expect(getPatientPageFromApi).toHaveBeenCalledWith(expect.objectContaining({ status: "all", nurseId: "NRS-001" })));
  });

  it("redirects patient role away from nurse management", async () => {
    useAuthStore.setState({ user: { id: "patient-1", fullName: "Pasien", email: "patient@test.local", role: "patient", accountStatus: "active", age: 30 }, isAuthenticated: true, hasHydrated: true });

    render(<NurseListPage />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/dashboard"));
  });
});
