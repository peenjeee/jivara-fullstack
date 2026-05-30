import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SchedulePage from "@/components/schedule/SchedulePage";
import { getPatientsFromApi } from "@/lib/patientApi";
import { getMedicineCatalogFromApi, getSchedulePatientGroupsPageFromApi, getSchedulesFromApi, setScheduleActiveViaApi } from "@/lib/scheduleApi";
import { showToast } from "@/lib/swal";
import type { PatientRecord } from "@/lib/mocks/patients";
import type { MedicationScheduleRecord } from "@/lib/mocks/schedules";

vi.mock("next/navigation", () => ({
  usePathname: () => "/schedule",
}));

vi.mock("@/lib/patientApi", () => ({
  getPatientsFromApi: vi.fn(),
}));

vi.mock("@/lib/scheduleApi", () => ({
  createSchedulesViaApi: vi.fn(),
  deactivateScheduleViaApi: vi.fn(),
  getMedicineCatalogFromApi: vi.fn(),
  getSchedulePatientGroupsPageFromApi: vi.fn(),
  getSchedulesFromApi: vi.fn(),
  setScheduleActiveViaApi: vi.fn(),
  updateScheduleViaApi: vi.fn(),
}));

vi.mock("@/lib/swal", () => ({
  showConfirm: vi.fn(),
  showError: vi.fn(),
  showToast: vi.fn(),
}));

const patients: PatientRecord[] = [{ id: "JVR-01", name: "Budi Santoso", age: 50, gender: "Pria", status: "On Ideal Schedule", lastVisit: "Hari ini", adherence: 90, avatar: "BS" }];
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

describe("schedule management feature", () => {
  beforeEach(() => {
    vi.mocked(getPatientsFromApi).mockReset();
    vi.mocked(getSchedulesFromApi).mockReset();
    vi.mocked(getSchedulePatientGroupsPageFromApi).mockReset();
    vi.mocked(setScheduleActiveViaApi).mockReset();
    vi.mocked(getMedicineCatalogFromApi).mockReset();
    vi.mocked(getMedicineCatalogFromApi).mockResolvedValue([]);
    vi.mocked(showToast).mockClear();
  });

  it("loads schedules and filters by patient or medicine", async () => {
    vi.mocked(getPatientsFromApi).mockResolvedValueOnce(patients);
    vi.mocked(getSchedulePatientGroupsPageFromApi)
      .mockResolvedValueOnce({
        patients: [patients[0]],
        schedules: [schedule],
        meta: { page: 1, limit: 10, total: 1, summary: { active: 1, completed: 0, reminders: 0 } },
      })
      .mockResolvedValueOnce({
        patients: [],
        schedules: [],
        meta: { page: 1, limit: 10, total: 0, summary: { active: 0, completed: 0, reminders: 0 } },
      });

    render(<SchedulePage />);

    expect(await screen.findAllByText("Budi Santoso")).not.toHaveLength(0);
    expect(screen.getAllByText("Jadwal Obat Aktif")).not.toHaveLength(0);

    fireEvent.change(screen.getByPlaceholderText("Cari nama pasien ..."), { target: { value: "zzz" } });
    expect(await screen.findAllByText("Tidak ada data jadwal.")).not.toHaveLength(0);
  });

  it("shows patients without medicines in the schedule list", async () => {
    vi.mocked(getPatientsFromApi).mockResolvedValueOnce(patients);
    vi.mocked(getSchedulePatientGroupsPageFromApi).mockResolvedValueOnce({
      patients: [patients[0]],
      schedules: [],
      meta: { page: 1, limit: 10, total: 1, summary: { active: 0, completed: 0, reminders: 0 } },
    });

    render(<SchedulePage />);

    expect(await screen.findAllByText("Budi Santoso")).not.toHaveLength(0);
    expect(screen.getAllByText("0 obat")).not.toHaveLength(0);
    expect(screen.getAllByText("0 item")).not.toHaveLength(0);

    fireEvent.click(screen.getAllByRole("button", { name: "Lihat detail Budi Santoso" })[0]);
    expect(await screen.findByText("Belum ada jadwal obat untuk pasien ini.")).toBeInTheDocument();
  });

  it("uses the full patient list in the add schedule modal", async () => {
    const allPatients = [
      patients[0],
      { ...patients[0], id: "JVR-02", name: "Siti Aminah", avatar: "SA" },
      { ...patients[0], id: "JVR-03", name: "Rina Lestari", avatar: "RL" },
    ];
    vi.mocked(getPatientsFromApi).mockResolvedValueOnce(allPatients);
    vi.mocked(getSchedulePatientGroupsPageFromApi).mockResolvedValueOnce({
      patients: [patients[0]],
      schedules: [],
      meta: { page: 1, limit: 10, total: 1, summary: { active: 0, completed: 0, reminders: 0 } },
    });

    render(<SchedulePage />);

    expect(await screen.findAllByText("Budi Santoso")).not.toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: /Tambah Jadwal/i }));
    fireEvent.click(screen.getByRole("button", { name: /Pilih pasien/i }));

    expect(await screen.findByRole("option", { name: "Siti Aminah" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Rina Lestari" })).toBeInTheDocument();
  });

  it("opens schedule detail and toggles schedule status", async () => {
    vi.mocked(getPatientsFromApi).mockResolvedValueOnce(patients);
    vi.mocked(getSchedulePatientGroupsPageFromApi)
      .mockResolvedValueOnce({
        patients: [patients[0]],
        schedules: [schedule],
        meta: { page: 1, limit: 10, total: 1, summary: { active: 1, completed: 0, reminders: 0 } },
      })
      .mockResolvedValueOnce({
        patients: [patients[0]],
        schedules: [{ ...schedule, status: "Nonaktif", reminderEnabled: false }],
        meta: { page: 1, limit: 10, total: 1, summary: { active: 0, completed: 1, reminders: 0 } },
      });
    vi.mocked(setScheduleActiveViaApi).mockResolvedValueOnce({ ...schedule, status: "Nonaktif", reminderEnabled: false });

    render(<SchedulePage />);

    expect(await screen.findAllByText("Budi Santoso")).not.toHaveLength(0);
    fireEvent.click(screen.getAllByRole("button", { name: "Lihat detail Budi Santoso" })[0]);
    expect(await screen.findByText("Metformin")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Nonaktifkan jadwal" }));

    await waitFor(() => expect(setScheduleActiveViaApi).toHaveBeenCalledWith(schedule, false, patients));
    expect(showToast).toHaveBeenCalledWith("Jadwal berhasil dinonaktifkan.");
  });
});
