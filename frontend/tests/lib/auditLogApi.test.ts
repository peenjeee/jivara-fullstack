import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "@/lib/axios";
import { getAuditActivitiesFromApi, getSuperAdminApprovalActivitiesFromApi } from "@/lib/auditLogApi";

vi.mock("@/lib/axios", () => ({
  default: {
    get: vi.fn(),
  },
}));

const mockedGet = vi.mocked(api.get);

describe("auditLogApi", () => {
  beforeEach(() => {
    mockedGet.mockReset();
  });

  it("maps generic audit logs to activity records", async () => {
    mockedGet.mockResolvedValueOnce({ data: { data: [{ id: "1", userName: "Admin", action: "patient.updated", resourceType: "patient", resourceId: "patient-123456", createdAt: "2026-05-09T08:00:00.000Z" }] } });

    const activities = await getAuditActivitiesFromApi();

    expect(mockedGet).toHaveBeenCalledWith("/audit-logs", { params: { limit: 100 } });
    expect(activities[0]).toMatchObject({ title: "Patient Updated", category: "Kepatuhan", severity: "Peringatan", patientId: "patient-123456" });
  });

  it("returns only super admin approval/account events", async () => {
    mockedGet.mockResolvedValueOnce({
      data: {
        data: [
          { id: "approve", userName: "Super Admin", action: "admin.approved", resourceType: "admin_approval", resourceId: "admin-1", changes: { after: { fullName: "Admin A", email: "a@test.local" } }, createdAt: "2026-05-09T08:00:00.000Z" },
          { id: "patient", userName: "Admin", action: "patient.updated", resourceType: "patient", resourceId: "patient-1", createdAt: "2026-05-09T08:00:00.000Z" },
        ],
      },
    });

    const activities = await getSuperAdminApprovalActivitiesFromApi();

    expect(activities).toHaveLength(1);
    expect(activities[0]).toMatchObject({ id: "approve", title: "Admin disetujui", category: "Administrasi", severity: "Sukses" });
    expect(activities[0]?.description).toContain("Admin A");
  });
});
