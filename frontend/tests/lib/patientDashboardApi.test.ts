import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import api from "@/lib/axios";
import { confirmMedicationScheduleViaApi, getConfirmedScheduleDates, getPatientActivitiesFromApi, getPatientDashboardData } from "@/lib/patientDashboardApi";
import type { PatientRecord } from "@/lib/mocks/patients";
import type { MedicationScheduleRecord } from "@/lib/mocks/schedules";

const patient: PatientRecord = { id: "patient-1", name: "Budi", age: 50, gender: "Pria", status: "On Ideal Schedule", lastVisit: "Hari ini", adherence: 90, avatar: "BD" };
const schedule: MedicationScheduleRecord = { id: "schedule-1", patientId: "patient-1", patientName: "Budi", patientAvatar: "BD", medicineName: "Metformin", dose: "500 mg", medicineForm: "Tablet", stock: 10, frequency: "1 kali sehari", times: ["08:30"], mealRule: "Sesudah makan", startDate: "2026-05-09", reminderEnabled: true, status: "Aktif" };

vi.mock("@/lib/axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock("@/lib/patientApi", () => ({
  getPatientsFromApi: vi.fn(async () => [patient]),
  getPatientDetailFromApi: vi.fn(async () => ({ patient, schedules: [], activities: [], scans: [] })),
}));

vi.mock("@/lib/scheduleApi", () => ({
  getSchedulesFromApi: vi.fn(async () => [schedule, { ...schedule, id: "schedule-2", patientId: "other-patient" }]),
}));

const mockedGet = api.get as Mock;
const mockedPost = api.post as Mock;

describe("patientDashboardApi", () => {
  beforeEach(() => {
    mockedGet.mockReset();
    mockedPost.mockReset();
  });

  it("groups confirmed schedule dates from medication logs", () => {
    expect(getConfirmedScheduleDates([
      { id: "log-1", scheduleId: "schedule-1", patientId: "patient-1", drugName: "Metformin", status: "confirmed", scheduledTime: "2026-05-09T08:00:00.000Z", confirmedAt: "2026-05-09T08:10:00.000Z" },
      { id: "log-2", scheduleId: "schedule-2", patientId: "patient-1", drugName: "Amlodipine", status: "missed", scheduledTime: "2026-05-09T20:00:00.000Z" },
    ])).toEqual({ "2026-05-09": ["schedule-1"] });
  });

  it("loads patient dashboard data and filters schedules to current patient", async () => {
    mockedGet.mockResolvedValueOnce({ data: { data: [{ id: "log-1", scheduleId: "schedule-1", patientId: "patient-1", drugName: "Metformin", status: "confirmed", scheduledTime: "2026-05-09T08:00:00.000Z" }] } });

    const data = await getPatientDashboardData();

    expect(mockedGet).toHaveBeenCalledWith("/medication-logs", { params: { patient_id: "patient-1", limit: 100 } });
    expect(data.schedules).toEqual([schedule]);
    expect(data.medicationLogs).toHaveLength(1);
  });

  it("maps medication logs to patient activities", async () => {
    mockedGet.mockResolvedValueOnce({ data: { data: [{ id: "log-1", scheduleId: "schedule-1", patientId: "patient-1", drugName: "Metformin", status: "missed", scheduledTime: "2026-05-09T08:00:00.000Z" }] } });

    const activities = await getPatientActivitiesFromApi();

    expect(activities[0]).toMatchObject({ title: "Obat terlewat", category: "Reminder", severity: "Kritis", patientName: "Budi" });
  });

  it("posts medication confirmation with selected date and schedule time", async () => {
    await confirmMedicationScheduleViaApi(schedule, new Date(2026, 4, 9));

    expect(mockedPost).toHaveBeenCalledWith("/medication-logs", expect.objectContaining({
      scheduleId: "schedule-1",
      status: "confirmed",
      scheduledTime: expect.stringContaining("2026-05-09T"),
      confirmedAt: expect.any(String),
    }));
  });
});
