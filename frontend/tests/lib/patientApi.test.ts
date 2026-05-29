import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import api from "@/lib/axios";
import {
  assignPatientToNurseViaApi,
  clearPatientsCache,
  createPatientViaApi,
  deactivatePatientViaApi,
  getInitialPatientDetail,
  getPatientDetailFromApi,
  getPatientsAssignedToNurseFromApi,
  getPatientsFromApi,
  updatePatientViaApi,
} from "@/lib/patientApi";
import type { AddPatientValues } from "@/components/patients/addPatientFormUtils";

vi.mock("@/lib/axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockedGet = api.get as Mock;
const mockedPost = api.post as Mock;
const mockedPut = api.put as Mock;
const mockedDelete = api.delete as Mock;
const patientValues: AddPatientValues = {
  fullName: "Budi Santoso",
  age: 50,
  gender: "Pria",
  phone: "6281",
  email: "budi@test.local",
  password: "secret123",
  address: "Jakarta",
};

const patientResponse = {
  id: "patient-1",
  fullName: "Budi Santoso",
  email: "budi@test.local",
  phone: "6281",
  dateOfBirth: "1976-01-01",
  gender: "male",
  address: "Jakarta",
  createdAt: "2026-05-09T08:00:00.000Z",
};

describe("patientApi", () => {
  beforeEach(() => {
    mockedGet.mockReset();
    mockedPost.mockReset();
    mockedPut.mockReset();
    mockedDelete.mockReset();
    clearPatientsCache();
  });

  it("maps patient list response", async () => {
    mockedGet.mockResolvedValueOnce({ data: { data: [patientResponse] } });
    mockedGet.mockResolvedValueOnce({ data: { data: { adherenceRate: 100, totalScheduled: 0 } } });

    const patients = await getPatientsFromApi();

    expect(mockedGet).toHaveBeenCalledWith("/patients", { params: { page: 1, limit: 100, status: "active" } });
    expect(patients[0]).toMatchObject({ id: "patient-1", name: "Budi Santoso", gender: "Pria", adherence: 100, avatar: "BS" });
  });

  it("loads every active patient page when a full list is needed", async () => {
    mockedGet
      .mockResolvedValueOnce({
        data: {
          data: [{ ...patientResponse, id: "patient-1", fullName: "Budi Santoso" }],
          meta: { page: 1, limit: 100, total: 101 },
        },
      })
      .mockResolvedValueOnce({
        data: {
          data: [{ ...patientResponse, id: "patient-2", fullName: "Siti Aminah" }],
          meta: { page: 2, limit: 100, total: 101 },
        },
      });

    const patients = await getPatientsFromApi();

    expect(mockedGet).toHaveBeenNthCalledWith(1, "/patients", { params: { page: 1, limit: 100, status: "active" } });
    expect(mockedGet).toHaveBeenNthCalledWith(2, "/patients", { params: { page: 2, limit: 100, status: "active" } });
    expect(patients.map((patient) => patient.id)).toEqual(["patient-1", "patient-2"]);
  });

  it("loads patient detail with active medication mapping", async () => {
    mockedGet.mockResolvedValueOnce({
      data: {
        data: {
          ...patientResponse,
          registeredAt: "2026-05-01T08:00:00.000Z",
          adherenceRateAll: 66.4,
          totalScheduledAll: 10,
          activeMedications: [{ id: "med-1", drugName: "Metformin", dosage: "500 mg", frequency: 2, scheduledTimes: ["08:00", 10], instructions: "Sesudah makan", createdAt: "2026-05-02T08:00:00.000Z" }],
        },
      },
    });

    const detail = await getPatientDetailFromApi("patient-1");

    expect(mockedGet).toHaveBeenCalledWith("/patients/patient-1");
    expect(detail.patient).toMatchObject({ id: "patient-1", adherence: 66, status: "Lagging Behind" });
    expect(detail.schedules[0]).toMatchObject({ id: "med-1", medicineName: "Metformin", times: ["08:00"] });
  });

  it("keeps patient detail status consistent with the patient detail response", async () => {
    mockedGet
      .mockResolvedValueOnce({
        data: {
          data: {
            ...patientResponse,
            registeredAt: "2026-05-01T08:00:00.000Z",
            adherenceRateAll: 100,
            totalScheduledAll: 2,
            activeMedications: [],
            activeMedicationsCount: 0,
          },
        },
      })
      .mockResolvedValueOnce({ data: { data: [] } });

    const detail = await getPatientDetailFromApi("patient-1");

    expect(detail.patient).toMatchObject({ id: "patient-1", adherence: 100, status: "On Ideal Schedule" });
    expect(mockedGet).not.toHaveBeenCalledWith("/adherence", expect.anything());
  });

  it("creates, updates, deletes, and assigns patients", async () => {
    mockedPost.mockResolvedValueOnce({ data: { data: { id: "patient-1", user: { fullName: "Budi Santoso", email: "budi@test.local", phone: "6281" } } } });
    mockedPut.mockResolvedValueOnce({ data: { data: patientResponse } });

    await expect(createPatientViaApi(patientValues)).resolves.toMatchObject({ id: "patient-1" });
    await expect(updatePatientViaApi("patient/1", patientValues)).resolves.toMatchObject({ id: "patient-1" });
    await deactivatePatientViaApi("patient/1");
    await assignPatientToNurseViaApi("patient/1", "nurse-1");

    expect(mockedPost).toHaveBeenCalledWith("/patients", expect.objectContaining({ fullName: "Budi Santoso", gender: "male", password: "secret123" }));
    expect(mockedGet).not.toHaveBeenCalledWith("/patients/patient-1");
    expect(mockedPut).toHaveBeenNthCalledWith(1, "/patients/patient%2F1", expect.not.objectContaining({ password: expect.anything() }));
    expect(mockedDelete).toHaveBeenCalledWith("/patients/patient%2F1");
    expect(mockedPut).toHaveBeenNthCalledWith(2, "/patients/patient%2F1/assign", { nurseIds: ["nurse-1"] });
  });

  it("loads patients assigned to a nurse with a server-side filter", async () => {
    mockedGet.mockResolvedValueOnce({ data: { data: [{ ...patientResponse, id: "patient-1", assignedNurseId: "nurse-1" }] } });
    mockedGet.mockResolvedValueOnce({ data: { data: { adherenceRate: 100, totalScheduled: 0 } } });

    const patients = await getPatientsAssignedToNurseFromApi("nurse-1");

    expect(mockedGet).toHaveBeenCalledWith("/patients", { params: { page: 1, limit: 100, status: "active", nurseId: "nurse-1" } });
    expect(patients).toHaveLength(1);
    expect(patients[0]?.id).toBe("patient-1");
  });

  it("returns initial patient detail fallback", () => {
    expect(getInitialPatientDetail("patient-x")).toMatchObject({ patient: { id: "patient-x", name: "-" }, schedules: [], activities: [], scans: [] });
  });
});
