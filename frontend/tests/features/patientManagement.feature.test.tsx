import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PatientListPage from "@/components/patients/PatientListPage";
import { getNursesFromApi } from "@/lib/nurseApi";
import { deactivatePatientViaApi, getPatientPageFromApi, getPatientsFromApi } from "@/lib/patientApi";
import { showConfirm, showError, showToast } from "@/lib/swal";
import { useNurseStore } from "@/store/nurses";
import type { PatientRecord } from "@/lib/mocks/patients";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/patients",
}));

vi.mock("@/lib/patientApi", () => ({
  createPatientViaApi: vi.fn(),
  deactivatePatientViaApi: vi.fn(),
  getPatientPageFromApi: vi.fn(),
  getPatientsFromApi: vi.fn(),
  updatePatientViaApi: vi.fn(),
}));

vi.mock("@/lib/nurseApi", () => ({
  getNursesFromApi: vi.fn(),
}));

vi.mock("@/lib/swal", () => ({
  showConfirm: vi.fn(),
  showError: vi.fn(),
  showToast: vi.fn(),
}));

const patients: PatientRecord[] = [
  { id: "JVR-01", name: "Budi Santoso", age: 50, gender: "Pria", status: "On Ideal Schedule", lastVisit: "Hari ini", adherence: 90, avatar: "BS" },
  { id: "JVR-02", name: "Ayu Lestari", age: 47, gender: "Wanita", status: "Need Special Attention", lastVisit: "Kemarin", adherence: 42, avatar: "AL" },
];

describe("patient management feature", () => {
  beforeEach(() => {
    push.mockClear();
    vi.mocked(getPatientPageFromApi).mockReset();
    vi.mocked(getPatientsFromApi).mockReset();
    vi.mocked(getNursesFromApi).mockReset();
    vi.mocked(deactivatePatientViaApi).mockReset();
    vi.mocked(showConfirm).mockReset();
    vi.mocked(showError).mockClear();
    vi.mocked(showToast).mockClear();
    useNurseStore.setState({ nurses: [] });
  });

  it("loads, searches, and opens patient detail", async () => {
    vi.mocked(getPatientPageFromApi)
      .mockResolvedValueOnce({ patients, meta: { page: 1, limit: 10, total: patients.length } })
      .mockResolvedValueOnce({ patients: [patients[1]], meta: { page: 1, limit: 10, total: 1 } });

    render(<PatientListPage />);

    expect(await screen.findAllByText("Budi Santoso")).not.toHaveLength(0);
    expect(getNursesFromApi).not.toHaveBeenCalled();
    fireEvent.change(screen.getByPlaceholderText("Cari nama pasien ..."), { target: { value: "Ayu" } });

    await waitFor(() => {
      expect(screen.queryAllByText("Budi Santoso")).toHaveLength(0);
    });
    expect(screen.getAllByText("Ayu Lestari")).not.toHaveLength(0);

    fireEvent.click(screen.getAllByRole("button", { name: "Lihat detail Ayu Lestari" })[0]);
    expect(push).toHaveBeenCalledWith("/patients/JVR-02");
  });

  it("deletes a patient after confirmation", async () => {
    vi.mocked(getPatientPageFromApi)
      .mockResolvedValueOnce({ patients, meta: { page: 1, limit: 10, total: patients.length } })
      .mockResolvedValueOnce({ patients, meta: { page: 1, limit: 10, total: patients.length } });
    vi.mocked(showConfirm).mockResolvedValueOnce({ isConfirmed: true, isDenied: false, isDismissed: false });
    vi.mocked(deactivatePatientViaApi).mockResolvedValueOnce(undefined);

    render(<PatientListPage canDeletePatients />);

    expect(await screen.findAllByText("Budi Santoso")).not.toHaveLength(0);
    fireEvent.click(screen.getAllByRole("button", { name: "Hapus Budi Santoso" })[0]);

    await waitFor(() => expect(deactivatePatientViaApi).toHaveBeenCalledWith("JVR-01"));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith("Pasien berhasil dihapus."));
  });

  it("shows empty state when patient API fails", async () => {
    vi.mocked(getPatientPageFromApi).mockRejectedValueOnce(new Error("network"));

    render(<PatientListPage />);

    expect(await screen.findAllByText("Tidak ada data pasien.")).not.toHaveLength(0);
  });
});
