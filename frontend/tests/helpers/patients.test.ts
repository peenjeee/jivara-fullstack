import { describe, expect, it } from "vitest";
import { getNextPatientOrder } from "@/helpers/patients";
import type { PatientRecord } from "@/lib/mocks/patients";

const basePatient: PatientRecord = {
  id: "JVR-001",
  name: "Pasien Test",
  age: 40,
  gender: "Pria",
  status: "On Ideal Schedule",
  lastVisit: "Hari ini",
  adherence: 90,
  avatar: "PT",
};

describe("patient helpers", () => {
  it("returns next order from highest valid JVR id", () => {
    expect(getNextPatientOrder([
      { ...basePatient, id: "JVR-004" },
      { ...basePatient, id: "legacy" },
      { ...basePatient, id: "JVR-012" },
    ])).toBe(13);
  });

  it("starts at one when patient list is empty", () => {
    expect(getNextPatientOrder([])).toBe(1);
  });
});
