import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import api from "@/lib/axios";
import { clearPatientDashboardCache, confirmMedicationScheduleViaApi, getConfirmedScheduleDates, getPatientActivitiesFromApi, getPatientDashboardData, getPatientScheduleData } from "@/lib/patientDashboardApi";
import type { PatientRecord } from "@/lib/mocks/patients";
import type { MedicationScheduleRecord } from "@/lib/mocks/schedules";
import { getFoodScansPageFromApi } from "@/lib/foodScanApi";
import { getSchedulesForPatientsFromApi } from "@/lib/scheduleApi";

const patient: PatientRecord = { id: "patient-1", name: "Budi", age: 50, gender: "Pria", status: "On Ideal Schedule", lastVisit: "Hari ini", adherence: 90, avatar: "BD" };
const schedule: MedicationScheduleRecord = { id: "schedule-1", patientId: "patient-1", patientName: "Budi", patientAvatar: "BD", medicineName: "Metformin", dose: "500 mg", medicineForm: "Tablet", stock: 10, frequency: "1 kali sehari", times: ["08:30"], mealRule: "Sesudah makan", startDate: "2026-05-09", reminderEnabled: true, status: "Aktif" };

vi.mock("@/lib/axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock("@/lib/patientApi", () => ({
  getCurrentPatientFromApi: vi.fn(async () => patient),
  getPatientsFromApi: vi.fn(async () => [patient]),
  getPatientDetailFromApi: vi.fn(async () => ({ patient, schedules: [], activities: [], scans: [] })),
  clearPatientsCache: vi.fn(),
}));

vi.mock("@/lib/scheduleApi", () => ({
  getSchedulesForPatientsFromApi: vi.fn(async () => [schedule, { ...schedule, id: "schedule-2", patientId: "other-patient" }]),
  getSchedulesFromApi: vi.fn(async () => [schedule, { ...schedule, id: "schedule-2", patientId: "other-patient" }]),
}));

vi.mock("@/lib/foodScanApi", () => ({
  getFoodScansPageFromApi: vi.fn(async () => ({ data: [], meta: { page: 1, limit: 100, total: 0 } })),
}));

const mockedGet = api.get as Mock;
const mockedPost = api.post as Mock;
const mockedGetFoodScansPage = getFoodScansPageFromApi as Mock;
const mockedGetSchedulesForPatients = getSchedulesForPatientsFromApi as Mock;

describe("patientDashboardApi", () => {
  beforeEach(() => {
    clearPatientDashboardCache();
    mockedGet.mockReset();
    mockedPost.mockReset();
    mockedGetSchedulesForPatients.mockReset();
    mockedGetFoodScansPage.mockReset();
    mockedGetSchedulesForPatients.mockResolvedValue([schedule, { ...schedule, id: "schedule-2", patientId: "other-patient" }]);
    mockedGetFoodScansPage.mockResolvedValue({ data: [], meta: { page: 1, limit: 100, total: 0 } });
  });

  it("groups confirmed schedule dates from medication logs", () => {
    expect(getConfirmedScheduleDates([
      { id: "log-1", scheduleId: "schedule-1", patientId: "patient-1", drugName: "Metformin", status: "confirmed", scheduledTime: "2026-05-09T08:00:00.000Z", confirmedAt: "2026-05-09T08:10:00.000Z" },
      { id: "log-2", scheduleId: "schedule-2", patientId: "patient-1", drugName: "Amlodipine", status: "missed", scheduledTime: "2026-05-09T20:00:00.000Z" },
    ])).toEqual({ "2026-05-09": ["schedule-1"] });
  });

  it("loads patient dashboard data and filters schedules to current patient", async () => {
    const log = { id: "log-1", scheduleId: "schedule-1", patientId: "patient-1", drugName: "Metformin", status: "confirmed", scheduledTime: "2026-05-09T08:00:00.000Z" };
    mockedGet.mockImplementation(async (url, config) => {
      if (url === "/medication-logs" && config?.params?.limit === 10) return { data: { data: [log] } };
      if (url === "/adherence") return { data: { data: { adherenceRate: 100, totalScheduled: 1, dailyBreakdown: [{ date: "2026-05-09", scheduled: 1, confirmed: 1 }] } } };
      return { data: { data: [], meta: { total: 0 } } };
    });

    const data = await getPatientDashboardData();

    expect(mockedGet).toHaveBeenCalledWith("/adherence", { params: { patient_id: "patient-1", period: "all" } });
    expect(mockedGet).toHaveBeenCalledWith("/medication-logs", { params: { patient_id: "patient-1", limit: 10 } });
    expect(mockedGet).not.toHaveBeenCalledWith("/medication-logs", expect.objectContaining({ params: expect.objectContaining({ start_date: expect.any(String), end_date: expect.any(String) }) }));
    expect(data.schedules).toEqual([schedule]);
    expect(data.medicationLogs).toHaveLength(1);
    expect(data.adherenceStats.dailyBreakdown.find((day) => day.date === "2026-05-09")).toMatchObject({ scheduled: 1, confirmed: 1 });
  });

  it("filters adherence days to the visible schedule window", async () => {
    const completedSchedule = { ...schedule, stock: 0, status: "Selesai" as const, endDate: "2026-05-19" };
    mockedGetSchedulesForPatients.mockResolvedValueOnce([completedSchedule]);
    mockedGet.mockImplementation(async (url, config) => {
      if (url === "/medication-logs" && config?.params?.limit === 10) return { data: { data: [] } };
      if (url === "/adherence") {
        return {
          data: {
            data: {
              adherenceRate: 50,
              totalScheduled: 2,
              dailyBreakdown: [
                { date: "2026-05-19", scheduled: 1, confirmed: 1 },
                { date: "2026-05-20", scheduled: 1, confirmed: 0 },
              ],
            },
          },
        };
      }
      return { data: { data: [], meta: { total: 0 } } };
    });

    const data = await getPatientDashboardData();

    expect(data.patient.adherence).toBe(100);
    expect(data.adherenceStats.totalScheduled).toBe(1);
    expect(data.adherenceStats.dailyBreakdown.find((day) => day.date === "2026-05-20")).toMatchObject({ scheduled: 0, confirmed: 0 });
  });

  it("calculates visible dashboard adherence as confirmed doses over scheduled doses", async () => {
    mockedGet.mockImplementation(async (url, config) => {
      if (url === "/medication-logs" && config?.params?.limit === 10) return { data: { data: [] } };
      if (url === "/adherence") {
        return {
          data: {
            data: {
              adherenceRate: 44,
              totalScheduled: 9,
              dailyBreakdown: [
                { date: "2026-05-09", scheduled: 12, confirmed: 3 },
              ],
            },
          },
        };
      }
      return { data: { data: [], meta: { total: 0 } } };
    });

    const data = await getPatientDashboardData();

    expect(data.patient.adherence).toBe(25);
    expect(data.adherenceStats.totalScheduled).toBe(12);
    expect(data.adherenceStats.totalConfirmed).toBe(3);
  });

  it("uses the latest medication log date as completed schedule end date", async () => {
    const completedSchedule = { ...schedule, stock: 0, status: "Selesai" as const, endDate: "2026-05-27" };
    mockedGetSchedulesForPatients.mockResolvedValueOnce([completedSchedule]);
    mockedGet.mockImplementation(async (url) => {
      if (url === "/medication-logs") {
        return {
          data: {
            data: [
              { id: "log-1", scheduleId: "schedule-1", patientId: "patient-1", drugName: "Metformin", status: "confirmed", scheduledTime: "2026-05-19T08:00:00.000Z" },
            ],
            meta: { total: 1 },
          },
        };
      }
      return { data: { data: [], meta: { total: 0 } } };
    });

    const data = await getPatientScheduleData(new Date(2026, 4, 1));

    expect(data.schedules[0]).toMatchObject({ endDate: "2026-05-19" });
  });

  it("maps medication logs to patient activities", async () => {
    mockedGet.mockResolvedValueOnce({ data: { data: [{ id: "log-1", scheduleId: "schedule-1", patientId: "patient-1", drugName: "Metformin", status: "missed", scheduledTime: "2026-05-09T08:00:00.000Z" }] } });
    mockedGet.mockResolvedValueOnce({ data: { data: { adherenceRate: 0, totalScheduled: 1, dailyBreakdown: [{ date: "2026-05-09", scheduled: 1, confirmed: 0 }] } } });

    const activities = await getPatientActivitiesFromApi();

    expect(activities[0]).toMatchObject({ title: "Obat terlewat", category: "Reminder", severity: "Kritis", patientName: "Budi" });
  });

  it("does not map pending or failed food scans to patient activities", async () => {
    mockedGet.mockResolvedValueOnce({ data: { data: [] } });
    mockedGetFoodScansPage.mockResolvedValueOnce({
      data: [
        { id: "scan-pending", patientId: "patient-1", foodName: "Makanan terdeteksi", image: "/food.jpg", scannedAt: "2026-05-09T08:00:00.000Z", risk: "Low Risk", hasDetectedFood: false, aiReasoning: "Pending", result: "Tidak ditemukan interaksi signifikan pada makanan yang terdeteksi.", recommendation: "-" },
        { id: "scan-ok", patientId: "patient-1", foodName: "Susu", image: "/milk.jpg", scannedAt: "2026-05-09T09:00:00.000Z", risk: "Low Risk", hasDetectedFood: true, aiReasoning: "Selesai", result: "Tidak ditemukan interaksi signifikan pada makanan yang terdeteksi.", recommendation: "-" },
      ],
      meta: { page: 1, limit: 100, total: 2 },
    });

    const activities = await getPatientActivitiesFromApi(new Date(2026, 4, 9));

    expect(activities.map((activity) => activity.scanId)).toEqual(["scan-ok"]);
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
