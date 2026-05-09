import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import api from "@/lib/axios";
import { createSchedulesViaApi, deactivateScheduleViaApi, getSchedulesFromApi, setScheduleActiveViaApi, updateScheduleViaApi } from "@/lib/scheduleApi";
import type { PatientRecord } from "@/lib/mocks/patients";
import type { MedicationScheduleRecord } from "@/lib/mocks/schedules";
import type { ScheduleMedicineFormValues } from "@/components/schedule/ScheduleForm";

vi.mock("@/lib/axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/lib/patientApi", () => ({
  getPatientsFromApi: vi.fn(async () => patients),
}));

const mockedGet = api.get as Mock;
const mockedPost = api.post as Mock;
const mockedPut = api.put as Mock;
const mockedDelete = api.delete as Mock;
const patients: PatientRecord[] = [{ id: "patient-1", name: "Budi", age: 50, gender: "Pria", status: "On Ideal Schedule", lastVisit: "Hari ini", adherence: 90, avatar: "BD" }];
const medicine: ScheduleMedicineFormValues = {
  medicineName: "Metformin",
  dose: "500 mg",
  medicineForm: "Tablet",
  stock: 10,
  frequency: "2 kali sehari",
  times: ["08:00", "20:00"],
  mealRule: "Sesudah makan",
  startDate: "2026-05-09",
  reminderEnabled: true,
  instructions: "Sesudah makan",
  status: "Aktif",
};
const scheduleResponse = { id: "schedule-1", patientId: "patient-1", drugName: "Metformin", dosage: "500 mg", frequency: 2, scheduledTimes: ["08:00", 20], instructions: "Sesudah makan", isActive: true, createdAt: "2026-05-09T08:00:00.000Z" };
const scheduleRecord: MedicationScheduleRecord = { id: "schedule-1", patientId: "patient-1", patientName: "Budi", patientAvatar: "BD", medicineName: "Metformin", dose: "500 mg", medicineForm: "Tablet", stock: 0, frequency: "2 kali sehari", times: ["08:00"], mealRule: "Tidak tergantung makan", startDate: "2026-05-09", reminderEnabled: true, status: "Aktif" };

describe("scheduleApi", () => {
  beforeEach(() => {
    mockedGet.mockReset();
    mockedPost.mockReset();
    mockedPut.mockReset();
    mockedDelete.mockReset();
  });

  it("loads and maps schedules with patient info", async () => {
    mockedGet.mockResolvedValueOnce({ data: { data: [scheduleResponse] } });

    const schedules = await getSchedulesFromApi();

    expect(mockedGet).toHaveBeenCalledWith("/medication-schedules");
    expect(schedules[0]).toMatchObject({ patientName: "Budi", medicineName: "Metformin", times: ["08:00"] });
  });

  it("creates schedules from medicine form values", async () => {
    mockedPost.mockResolvedValueOnce({ data: { data: scheduleResponse } });

    const schedules = await createSchedulesViaApi("patient-1", [medicine], patients);

    expect(mockedPost).toHaveBeenCalledWith("/medication-schedules", expect.objectContaining({ patientId: "patient-1", drugName: "Metformin", frequency: 2, scheduledTimes: ["08:00", "20:00"], isActive: true }));
    expect(schedules[0]).toMatchObject({ id: "schedule-1", patientName: "Budi" });
  });

  it("updates active state and deletes schedules", async () => {
    mockedPut
      .mockResolvedValueOnce({ data: { data: { ...scheduleResponse, isActive: false } } })
      .mockResolvedValueOnce({ data: { data: { ...scheduleResponse, isActive: false } } });

    await expect(updateScheduleViaApi("schedule/1", "patient-1", { ...medicine, status: "Nonaktif" }, patients)).resolves.toMatchObject({ status: "Nonaktif" });
    await expect(setScheduleActiveViaApi(scheduleRecord, false, patients)).resolves.toMatchObject({ status: "Nonaktif" });
    await deactivateScheduleViaApi("schedule/1");

    expect(mockedPut).toHaveBeenNthCalledWith(1, "/medication-schedules/schedule%2F1", expect.objectContaining({ isActive: false }));
    expect(mockedPut).toHaveBeenNthCalledWith(2, "/medication-schedules/schedule-1", { isActive: false });
    expect(mockedDelete).toHaveBeenCalledWith("/medication-schedules/schedule%2F1");
  });
});
