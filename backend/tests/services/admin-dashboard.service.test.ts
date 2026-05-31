import { describe, expect, it, vi } from "vitest";

vi.mock("../../src/db", () => ({ db: {} }));
vi.mock("../../src/services/access-control.service", () => ({
  getOrganizationIdForUser: vi.fn(),
  patientScopeCondition: vi.fn(),
  scopedPatientFilter: vi.fn(),
}));
vi.mock("../../src/services/adherence.service", () => ({ buildAdherenceStatsByPatientId: vi.fn() }));
vi.mock("../../src/services/medication-schedule.service", () => ({ getMedicationScheduleSummaryForPatients: vi.fn() }));

import { buildNurseFollowUps, selectCurrentPatientAssignmentRows } from "../../src/services/admin-dashboard.service";

describe("admin dashboard service", () => {
  it("uses the last inactive assignment when a nurse was deactivated before reassign", () => {
    const rows = selectCurrentPatientAssignmentRows([
      { id: "patient-1", assignedNurseId: "inactive-nurse", assignmentIsActive: false, assignmentAssignedAt: new Date("2026-05-01T00:00:00.000Z") },
      { id: "patient-2", assignedNurseId: "inactive-nurse", assignmentIsActive: false, assignmentAssignedAt: new Date("2026-05-02T00:00:00.000Z") },
    ]);

    expect(rows.map((row) => row.assignedNurseId)).toEqual(["inactive-nurse", "inactive-nurse"]);
  });

  it("ignores stale inactive assignments after a patient is reassigned", () => {
    const rows = selectCurrentPatientAssignmentRows([
      { id: "patient-1", assignedNurseId: "inactive-nurse", assignmentIsActive: false, assignmentAssignedAt: new Date("2026-05-01T00:00:00.000Z") },
      { id: "patient-1", assignedNurseId: "active-nurse", assignmentIsActive: true, assignmentAssignedAt: new Date("2026-05-03T00:00:00.000Z") },
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0].assignedNurseId).toBe("active-nurse");
  });

  it("includes inactive nurses that still have assigned active patients", () => {
    const followUps = buildNurseFollowUps(
      [
        { id: "inactive-nurse", fullName: "Ns. Non Aktif", email: "inactive@test.local", phone: null, gender: "male", isActive: false },
        { id: "active-nurse", fullName: "Ns. Aman", email: "active@test.local", phone: null, gender: "female", isActive: true },
      ],
      new Map([
        ["inactive-nurse", new Set(["patient-1", "patient-2"])],
        ["active-nurse", new Set(["patient-3"])],
      ]),
      new Map(),
    );

    expect(followUps).toHaveLength(1);
    expect(followUps[0]).toMatchObject({
      nurse: { id: "inactive-nurse", status: "Nonaktif", assignedPatients: 2 },
      assignedPatientCount: 2,
      riskyPatientCount: 0,
    });
  });

  it("prioritizes inactive nurses needing reassign before active nurses with risky patients", () => {
    const followUps = buildNurseFollowUps(
      [
        { id: "active-risky", fullName: "Ns. Risiko", email: "risk@test.local", phone: null, gender: "female", isActive: true },
        { id: "inactive-nurse", fullName: "Ns. Non Aktif", email: "inactive@test.local", phone: null, gender: "male", isActive: false },
      ],
      new Map([
        ["active-risky", new Set(["patient-1", "patient-2", "patient-3"])],
        ["inactive-nurse", new Set(["patient-4"])],
      ]),
      new Map([["active-risky", 3]]),
    );

    expect(followUps.map((item) => item.nurse.id)).toEqual(["inactive-nurse", "active-risky"]);
  });
});
