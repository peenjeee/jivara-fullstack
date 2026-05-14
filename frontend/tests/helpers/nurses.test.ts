import { describe, expect, it } from "vitest";
import { activityMatchesNurse, getAverageAdherence, getNurseInitials } from "@/helpers/nurses";
import type { PatientRecord } from "@/lib/mocks/patients";

const patients: PatientRecord[] = [
  { id: "P-1", name: "Andi", age: 40, gender: "Pria", status: "On Ideal Schedule", lastVisit: "Hari ini", adherence: 90, avatar: "A" },
  { id: "P-2", name: "Maya", age: 35, gender: "Wanita", status: "Lagging Behind", lastVisit: "Kemarin", adherence: 60, avatar: "M" },
];

const assignments: Record<string, string> = { "P-1": "NRS-001", "P-2": "NRS-009" };

describe("nurse helpers", () => {
  it("creates initials from the first two words and falls back safely", () => {
    expect(getNurseInitials("Siti Rahma Wati")).toBe("SR");
    expect(getNurseInitials("   ")).toBe("NR");
  });

  it("matches nurse activity by source, target, or assigned patient", () => {
    expect(activityMatchesNurse({ id: "A", title: "", description: "", category: "Administrasi", severity: "Info", timestamp: new Date().toISOString(), sourceNurseId: "NRS-001", read: true }, assignments, "NRS-001")).toBe(true);
    expect(activityMatchesNurse({ id: "B", title: "", description: "", category: "Reminder", severity: "Info", timestamp: new Date().toISOString(), patientId: "P-2", read: true }, assignments, "NRS-009")).toBe(true);
  });

  it("calculates average adherence with empty-list guard", () => {
    expect(getAverageAdherence(patients)).toBe(75);
    expect(getAverageAdherence([])).toBe(0);
  });
});
