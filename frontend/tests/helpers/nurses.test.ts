import { describe, expect, it } from "vitest";
import { activityMatchesNurse, getAverageAdherence, getNextNurseId, getNurseByPatientId, getNurseInitials, getPatientsForNurse } from "@/helpers/nurses";
import type { NurseRecord, PatientNurseAssignment } from "@/lib/mocks/nurses";
import type { PatientRecord } from "@/lib/mocks/patients";

const nurses: NurseRecord[] = [
  { id: "NRS-001", fullName: "Siti Rahma", email: "siti@test.local", phone: "6281", gender: "Wanita", status: "Aktif", joinedAt: "01 Jan 2026", temporaryPassword: false },
  { id: "NRS-009", fullName: "Budi Santoso", email: "budi@test.local", phone: "6282", gender: "Pria", status: "Nonaktif", joinedAt: "02 Jan 2026", temporaryPassword: false },
];

const patients: PatientRecord[] = [
  { id: "P-1", name: "Andi", age: 40, gender: "Pria", status: "On Ideal Schedule", lastVisit: "Hari ini", adherence: 90, avatar: "A" },
  { id: "P-2", name: "Maya", age: 35, gender: "Wanita", status: "Lagging Behind", lastVisit: "Kemarin", adherence: 60, avatar: "M" },
];

const assignments: PatientNurseAssignment = { "P-1": "NRS-001", "P-2": "NRS-009" };

describe("nurse helpers", () => {
  it("creates initials from the first two words and falls back safely", () => {
    expect(getNurseInitials("Siti Rahma Wati")).toBe("SR");
    expect(getNurseInitials("   ")).toBe("NR");
  });

  it("generates the next nurse id from existing numeric ids", () => {
    expect(getNextNurseId(nurses)).toBe("NRS-010");
  });

  it("resolves assigned patients and assigned nurse", () => {
    expect(getPatientsForNurse(patients, assignments, "NRS-001")).toEqual([patients[0]]);
    expect(getNurseByPatientId(nurses, assignments, "P-2")?.fullName).toBe("Budi Santoso");
    expect(getNurseByPatientId(nurses, assignments, undefined)).toBeUndefined();
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
