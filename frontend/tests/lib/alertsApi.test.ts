import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import api from "@/lib/axios";
import { getAlertActivitiesFromApi, resolveAlertViaApi } from "@/lib/alertsApi";

vi.mock("@/lib/axios", () => ({
  default: {
    get: vi.fn(),
    patch: vi.fn(),
  },
}));

const mockedGet = api.get as Mock;
const mockedPatch = api.patch as Mock;

describe("alertsApi", () => {
  beforeEach(() => {
    mockedGet.mockReset();
    mockedPatch.mockReset();
  });

  it("maps alerts to unread activity records", async () => {
    mockedGet.mockResolvedValueOnce({
      data: {
        data: [{
          id: "alert-1",
          patientId: "JVR-001",
          patientName: "Budi",
          scheduleId: "SCH-001",
          drugName: "Metformin",
          dosage: "500 mg",
          scheduledTime: "2026-05-09T08:00:00.000Z",
          status: "missed",
          severity: "critical",
          message: "Pasien belum minum obat",
        }],
      },
    });

    const activities = await getAlertActivitiesFromApi();

    expect(mockedGet).toHaveBeenCalledWith("/alerts", { params: { page: 1, limit: 100 } });
    expect(activities[0]).toMatchObject({ title: "Dosis obat terlewat", category: "Kepatuhan", severity: "Kritis", read: false, medicineName: "Metformin 500 mg" });
  });

  it("resolves alert with encoded id", async () => {
    await resolveAlertViaApi("alert/1");

    expect(mockedPatch).toHaveBeenCalledWith("/alerts/alert%2F1/resolve");
  });
});
