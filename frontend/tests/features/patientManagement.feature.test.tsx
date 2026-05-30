import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PatientListPage from "@/components/patients/PatientListPage";
import { getNursesFromApi } from "@/lib/nurseApi";
import { assignPatientToNursesViaApi, createPatientViaApi, deactivatePatientViaApi, getPatientPageFromApi, getPatientsFromApi } from "@/lib/patientApi";
import { showConfirm, showError, showToast } from "@/lib/swal";
import { useNurseStore } from "@/store/nurses";
import type { PatientRecord } from "@/lib/mocks/patients";
import type { NurseRecord } from "@/lib/mocks/nurses";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/patients",
}));

vi.mock("@/lib/patientApi", () => ({
  assignPatientToNursesViaApi: vi.fn(),
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

const nurses: NurseRecord[] = [
  { id: "NRS-01", fullName: "Nurse Jivara", email: "nurse@jivara.id", phone: "628111", gender: "Wanita", status: "Aktif", joinedAt: "Hari ini", temporaryPassword: false },
  { id: "NRS-02", fullName: "Dimas Pradana", email: "dimas@jivara.id", phone: "628222", gender: "Pria", status: "Nonaktif", joinedAt: "Hari ini", temporaryPassword: false },
];

const newPatient: PatientRecord = { id: "JVR-03", name: "Rina Hartati", age: 45, gender: "Wanita", status: "On Ideal Schedule", lastVisit: "Baru ditambahkan", adherence: 100, avatar: "RH" };

describe("patient management feature", () => {
  beforeEach(() => {
    push.mockClear();
    vi.mocked(getPatientPageFromApi).mockReset();
    vi.mocked(getPatientsFromApi).mockReset();
    vi.mocked(getNursesFromApi).mockReset();
    vi.mocked(createPatientViaApi).mockReset();
    vi.mocked(assignPatientToNursesViaApi).mockReset();
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

  it("opens nurse assignment modal after admin creates a patient", async () => {
    vi.mocked(getPatientPageFromApi)
      .mockResolvedValueOnce({ patients, meta: { page: 1, limit: 10, total: patients.length } })
      .mockResolvedValueOnce({ patients: [newPatient, ...patients], meta: { page: 1, limit: 10, total: patients.length + 1 } })
      .mockResolvedValueOnce({ patients: [{ ...newPatient, assignedNurseId: "NRS-01", assignedNurses: [{ id: "NRS-01", name: "Nurse Jivara" }] }, ...patients], meta: { page: 1, limit: 10, total: patients.length + 1 } });
    vi.mocked(getNursesFromApi).mockResolvedValueOnce(nurses);
    vi.mocked(createPatientViaApi).mockResolvedValueOnce(newPatient);
    vi.mocked(assignPatientToNursesViaApi).mockResolvedValueOnce(undefined);

    render(<PatientListPage canAssignNurses />);

    expect(await screen.findAllByText("Budi Santoso")).not.toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "Tambah Pasien Baru" }));

    fireEvent.change(screen.getByLabelText("Nama Lengkap"), { target: { value: "Rina Hartati" } });
    fireEvent.change(screen.getByLabelText("Umur pasien"), { target: { value: "45" } });
    fireEvent.click(screen.getByLabelText("Kelamin Wanita"));
    fireEvent.change(screen.getByLabelText("Nomor Telepon"), { target: { value: "628123456789" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "rina@jivara.id" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password123" } });
    fireEvent.change(screen.getByLabelText("Alamat"), { target: { value: "Jl. Sehat No. 1" } });
    fireEvent.click(screen.getByRole("button", { name: /Simpan Pasien/i }));

    expect(await screen.findByText("Pilih satu atau lebih perawat yang menangani Rina Hartati.")).toBeInTheDocument();
    expect(screen.getByText("Nurse Jivara")).toBeInTheDocument();
    expect(screen.queryByText("Dimas Pradana")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Pilih Nurse Jivara" }));
    fireEvent.click(screen.getByRole("button", { name: /Simpan Perawat/i }));

    await waitFor(() => expect(assignPatientToNursesViaApi).toHaveBeenCalledWith("JVR-03", ["NRS-01"]));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith("Perawat pasien berhasil diperbarui."));
  });
});
