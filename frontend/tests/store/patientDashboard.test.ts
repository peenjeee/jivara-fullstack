import { beforeEach, describe, expect, it } from "vitest";
import { usePatientDashboardStore } from "@/store/patientDashboard";
import type { FoodScanRecord } from "@/lib/mocks/foodScans";

const scan: FoodScanRecord = {
  id: "scan-1",
  patientId: "JVR-001",
  foodName: "Susu",
  image: "/scan.jpg",
  scannedAt: "2026-05-09T08:00:00.000Z",
  risk: "High Risk",
  aiReasoning: "Potensi interaksi",
  result: "Berisiko",
  recommendation: "Beri jeda konsumsi",
};

describe("patient dashboard store", () => {
  beforeEach(() => {
    usePatientDashboardStore.getState().resetPatientDashboardState();
  });

  it("stores the latest food scan", () => {
    usePatientDashboardStore.getState().setLastScan(scan);

    expect(usePatientDashboardStore.getState().lastScan).toEqual(scan);
  });

  it("confirms medicine only once", () => {
    usePatientDashboardStore.getState().confirmMedicine("med-1");
    usePatientDashboardStore.getState().confirmMedicine("med-1");

    expect(usePatientDashboardStore.getState().confirmedMedicineIds).toEqual(["med-1"]);
  });

  it("confirms schedule for a date and mirrors it to confirmed medicines", () => {
    usePatientDashboardStore.getState().confirmScheduleForDate("2026-05-09", "schedule-1");
    usePatientDashboardStore.getState().confirmScheduleForDate("2026-05-09", "schedule-1");

    expect(usePatientDashboardStore.getState().confirmedScheduleDates).toEqual({ "2026-05-09": ["schedule-1"] });
    expect(usePatientDashboardStore.getState().confirmedMedicineIds).toEqual(["schedule-1"]);
  });

  it("resets dashboard state", () => {
    usePatientDashboardStore.getState().setLastScan(scan);
    usePatientDashboardStore.getState().setConfirmedScheduleDates({ "2026-05-09": ["schedule-1"] });
    usePatientDashboardStore.getState().confirmMedicine("med-1");

    usePatientDashboardStore.getState().resetPatientDashboardState();

    expect(usePatientDashboardStore.getState()).toMatchObject({
      lastScan: null,
      confirmedMedicineIds: [],
      confirmedScheduleDates: {},
    });
  });
});
