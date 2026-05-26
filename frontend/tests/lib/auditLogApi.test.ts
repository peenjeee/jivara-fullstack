import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "@/lib/axios";
import { clearAuditLogCache, getAuditActivitiesFromApi, getSuperAdminApprovalActivitiesFromApi } from "@/lib/auditLogApi";

vi.mock("@/lib/axios", () => ({
  default: {
    get: vi.fn(),
  },
}));

const mockedGet = vi.mocked(api.get);

describe("auditLogApi", () => {
  beforeEach(() => {
    mockedGet.mockReset();
    clearAuditLogCache();
  });

  it("maps generic audit logs to activity records", async () => {
    mockedGet.mockResolvedValueOnce({ data: { data: [{ id: "1", userName: "Admin", action: "patient.updated", resourceType: "patient", resourceId: "patient-123456", createdAt: "2026-05-09T08:00:00.000Z" }] } });

    const activities = await getAuditActivitiesFromApi();

    expect(mockedGet).toHaveBeenCalledWith("/audit-logs", { params: { page: 1, limit: 100 } });
    expect(activities[0]).toMatchObject({ title: "Patient Updated", category: "Kepatuhan", severity: "Peringatan", patientId: "patient-123456" });
  });

  it("maps nurse references from audit log changes", async () => {
    mockedGet.mockResolvedValueOnce({
      data: {
        data: [
          { id: "assign", userName: "Admin", action: "patient.assigned", resourceType: "patient", resourceId: "patient-1", changes: { nurseId: "nurse-1" }, createdAt: "2026-05-09T08:00:00.000Z" },
          { id: "update", userName: "Admin", action: "patient.updated", resourceType: "patient", resourceId: "patient-2", changes: { requested: { assignedNurseId: "nurse-2" } }, createdAt: "2026-05-09T08:00:00.000Z" },
          { id: "diff", userName: "Admin", action: "patient.updated", resourceType: "patient", resourceId: "patient-3", changes: { assignedNurseId: { from: "old-nurse", to: "nurse-3" } }, createdAt: "2026-05-09T08:00:00.000Z" },
        ],
      },
    });

    const activities = await getAuditActivitiesFromApi();

    expect(activities.map((activity) => activity.targetNurseId)).toEqual(["nurse-1", "nurse-2", "nurse-3"]);
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

    expect(mockedGet).toHaveBeenCalledWith("/audit-logs", { params: { page: 1, limit: 100, user_role: "super_admin" } });
    expect(activities).toHaveLength(1);
    expect(activities[0]).toMatchObject({ id: "approve", title: "Admin disetujui", category: "Administrasi", severity: "Sukses" });
    expect(activities[0]?.description).toContain("Admin A");
  });

  it("can bypass the cached super-admin approval activity snapshot", async () => {
    mockedGet
      .mockResolvedValueOnce({ data: { data: [] } })
      .mockResolvedValueOnce({
        data: {
          data: [
            {
              id: "approve",
              userName: "Super Admin",
              action: "admin.approved",
              resourceType: "admin_approval",
              resourceId: "admin-1",
              changes: { after: { fullName: "Admin A" } },
              createdAt: "2026-05-09T08:00:00.000Z",
            },
          ],
        },
      });

    expect(await getSuperAdminApprovalActivitiesFromApi()).toHaveLength(0);
    const refreshedActivities = await getSuperAdminApprovalActivitiesFromApi({ forceRefresh: true });

    expect(mockedGet).toHaveBeenCalledTimes(2);
    expect(refreshedActivities).toHaveLength(1);
  });
});
