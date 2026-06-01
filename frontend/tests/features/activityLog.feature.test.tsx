import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ActivityLogPage, { __resetActivityLogPageViewCache } from "@/components/activity-log/ActivityLogPage";
import { getNotificationActivityPageFromApi } from "@/lib/notificationActivitiesApi";
import { getActivityReadIdsFromApi, markActivitiesReadViaApi, markAllUnreadViaApi } from "@/lib/activityReadApi";
import { getAuditActivityPageFromApi } from "@/lib/auditLogApi";
import { getPatientsAssignedToNurseFromApi } from "@/lib/patientApi";
import { showToast } from "@/lib/swal";
import { useActivityLogStore } from "@/store/activityLog";
import { useNurseStore } from "@/store/nurses";
import type { ActivityLogRecord } from "@/lib/mocks/activityLogs";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/activity-log",
}));

vi.mock("@/lib/notificationActivitiesApi", () => ({
  getNotificationActivityPageFromApi: vi.fn(),
}));

vi.mock("@/lib/auditLogApi", () => ({
  getAuditActivityPageFromApi: vi.fn(),
}));

vi.mock("@/lib/activityReadApi", () => ({
  getActivityReadIdsFromApi: vi.fn(),
  markActivitiesReadViaApi: vi.fn(),
  markAllUnreadViaApi: vi.fn(),
}));

vi.mock("@/lib/patientApi", () => ({
  getPatientsAssignedToNurseFromApi: vi.fn(),
}));

vi.mock("@/lib/axios", () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: { data: [] } }),
    post: vi.fn().mockResolvedValue({ data: { data: [] } }),
  },
}));

vi.mock("@/lib/swal", () => ({
  showToast: vi.fn(),
}));

vi.mock("@/components/food-scan", () => ({
  FoodScanDetailModal: () => null,
}));

const activity: ActivityLogRecord = {
  id: "alert-1",
  title: "Kepatuhan kritis",
  description: "Budi belum minum obat.",
  category: "Kepatuhan",
  severity: "Kritis",
  timestamp: new Date().toISOString(),
  patientId: "JVR-01",
  patientName: "Budi Santoso",
  medicineName: "Metformin",
  read: false,
};

const paginated = (activities: ActivityLogRecord[]) => ({
  activities,
  meta: { page: 1, limit: 10, total: activities.length },
});

describe("activity log feature", () => {
  beforeEach(() => {
    push.mockClear();
    vi.mocked(getNotificationActivityPageFromApi).mockReset();
    vi.mocked(getAuditActivityPageFromApi).mockReset();
    vi.mocked(getActivityReadIdsFromApi).mockReset();
    vi.mocked(markActivitiesReadViaApi).mockReset();
    vi.mocked(markAllUnreadViaApi).mockReset();
    vi.mocked(getPatientsAssignedToNurseFromApi).mockReset();
    vi.mocked(showToast).mockClear();
    useActivityLogStore.setState({ activities: [] });
    useNurseStore.setState({ nurses: [] });

    // Reset module-level cache in ActivityLogPage.tsx. This cache persists across
    // component unmounts, so test 1's state would otherwise pollute test 2.
    __resetActivityLogPageViewCache();
  });

  it("loads audit activities, filters critical items, and marks all as read", async () => {
    vi.mocked(getNotificationActivityPageFromApi).mockResolvedValue(paginated([]));
    vi.mocked(getAuditActivityPageFromApi).mockResolvedValue(paginated([activity]));
    vi.mocked(getActivityReadIdsFromApi).mockResolvedValue(new Set());
    vi.mocked(markActivitiesReadViaApi).mockResolvedValue(undefined);
    vi.mocked(markAllUnreadViaApi).mockResolvedValue(undefined);
    vi.mocked(getPatientsAssignedToNurseFromApi).mockResolvedValue([]);

    render(<ActivityLogPage />);

    expect(await screen.findByText("Kepatuhan kritis")).toBeInTheDocument();
    expect(getActivityReadIdsFromApi).toHaveBeenCalledWith({ activityIds: ["alert-1"], limit: 1 });
    expect(getNotificationActivityPageFromApi).not.toHaveBeenCalled();
    expect(getPatientsAssignedToNurseFromApi).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Kritis" }));
    expect(await screen.findByText("Budi belum minum obat.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /tandai semua dibaca/i }));

    await waitFor(() => {
      expect(markAllUnreadViaApi).toHaveBeenCalledOnce();
    });
    expect(showToast).toHaveBeenCalledWith("Semua aktivitas ditandai sudah dibaca.");

    await waitFor(() => {
      expect(useActivityLogStore.getState().activities.every((item) => item.read)).toBe(true);
    });
  });

  it("read-only admin mode only renders audit activities", async () => {
    vi.mocked(getNotificationActivityPageFromApi).mockResolvedValue(paginated([activity]));
    vi.mocked(getAuditActivityPageFromApi).mockResolvedValue(
      paginated([{ ...activity, id: "audit-1", title: "Patient Updated", category: "Administrasi", severity: "Sukses", read: true }])
    );
    vi.mocked(getActivityReadIdsFromApi).mockResolvedValue(new Set());
    vi.mocked(getPatientsAssignedToNurseFromApi).mockResolvedValue([]);

    render(<ActivityLogPage readOnly auditUserRole="admin" />);

    expect(await screen.findByText("Patient Updated")).toBeInTheDocument();
    expect(screen.queryByText("Kepatuhan kritis")).not.toBeInTheDocument();

    await waitFor(() => {
      expect(useActivityLogStore.getState().activities).toHaveLength(1);
    });

    expect(getNotificationActivityPageFromApi).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: /tandai semua dibaca/i })).not.toBeInTheDocument();
    expect(getActivityReadIdsFromApi).not.toHaveBeenCalled();
  });

  it("keeps cached page 1 when returning to nurse activity log", async () => {
    const oldActivity = { ...activity, id: "audit-old", title: "Patient Updated Lama", read: true };
    const latestActivity = { ...activity, id: "audit-new", title: "Patient Updated Terbaru", read: false };
    let auditCallCount = 0;

    vi.mocked(getNotificationActivityPageFromApi).mockResolvedValue(paginated([]));
    vi.mocked(getAuditActivityPageFromApi).mockImplementation(() => {
      auditCallCount += 1;
      return Promise.resolve(paginated(auditCallCount <= 2 ? [oldActivity] : [latestActivity]));
    });
    vi.mocked(getActivityReadIdsFromApi).mockResolvedValue(new Set());
    vi.mocked(getPatientsAssignedToNurseFromApi).mockResolvedValue([]);

    const firstRender = render(<ActivityLogPage auditUserRole="nurse" showNurseFilter={false} />);
    expect(await screen.findByText("Patient Updated Lama")).toBeInTheDocument();

    firstRender.unmount();
    vi.mocked(getAuditActivityPageFromApi).mockClear();
    render(<ActivityLogPage auditUserRole="nurse" showNurseFilter={false} />);

    expect(await screen.findByText("Patient Updated Lama")).toBeInTheDocument();
    expect(screen.queryByText("Patient Updated Terbaru")).not.toBeInTheDocument();
    expect(getAuditActivityPageFromApi).not.toHaveBeenCalledWith(expect.objectContaining({ page: 1, limit: 10, userRole: "nurse", forceRefresh: true }));
  });
});
