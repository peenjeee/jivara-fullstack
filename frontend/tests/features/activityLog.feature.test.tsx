import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ActivityLogPage, { __resetActivityLogPageViewCache } from "@/components/activity-log/ActivityLogPage";
import { getNotificationActivityPageFromApi } from "@/lib/notificationActivitiesApi";
import { getActivityReadIdsFromApi, markActivitiesReadViaApi } from "@/lib/activityReadApi";
import { getAuditActivityPageFromApi } from "@/lib/auditLogApi";
import { getPatientsFromApi } from "@/lib/patientApi";
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
}));

vi.mock("@/lib/patientApi", () => ({
  getPatientsFromApi: vi.fn(),
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
    vi.mocked(getPatientsFromApi).mockReset();
    vi.mocked(showToast).mockClear();
    useActivityLogStore.setState({ activities: [] });
    useNurseStore.setState({ nurses: [] });

    // Reset module-level cache in ActivityLogPage.tsx. This cache persists across
    // component unmounts, so test 1's state would otherwise pollute test 2.
    __resetActivityLogPageViewCache();
  });

  it("loads alert activities, filters critical items, and marks all as read", async () => {
    vi.mocked(getNotificationActivityPageFromApi).mockResolvedValue(paginated([activity]));
    vi.mocked(getAuditActivityPageFromApi).mockResolvedValue(paginated([]));
    vi.mocked(getActivityReadIdsFromApi).mockResolvedValue(new Set());
    vi.mocked(markActivitiesReadViaApi).mockResolvedValue(undefined);
    vi.mocked(getPatientsFromApi).mockResolvedValue([]);

    render(<ActivityLogPage />);

    expect(await screen.findByText("Kepatuhan kritis")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Kritis" }));
    expect(await screen.findByText("Budi belum minum obat.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /tandai semua dibaca/i }));

    await waitFor(() => {
      expect(markActivitiesReadViaApi).toHaveBeenCalledWith(["alert-1"]);
    });
    expect(showToast).toHaveBeenCalledWith("Semua aktivitas ditandai sudah dibaca.");

    await waitFor(() => {
      expect(useActivityLogStore.getState().activities.every((item) => item.read)).toBe(true);
    });
  });

  it("read-only mode combines audit and alert activities", async () => {
    vi.mocked(getNotificationActivityPageFromApi).mockResolvedValue(paginated([activity]));
    vi.mocked(getAuditActivityPageFromApi).mockResolvedValue(
      paginated([{ ...activity, id: "audit-1", title: "Patient Updated", category: "Administrasi", severity: "Sukses", read: true }])
    );
    vi.mocked(getActivityReadIdsFromApi).mockResolvedValue(new Set());
    vi.mocked(getPatientsFromApi).mockResolvedValue([]);

    render(<ActivityLogPage readOnly />);

    // First check "Kepatuhan kritis" renders (it should)
    expect(await screen.findByText("Kepatuhan kritis", {}, { timeout: 5000 })).toBeInTheDocument();

    // Now also verify store has both activities
    await waitFor(() => {
      expect(useActivityLogStore.getState().activities.length).toBe(2);
    }, { timeout: 5000 });

    // Check for "Patient Updated" — use more flexible matcher
    const patientUpdated = await screen.findByText((content) => content.includes("Patient"), {}, { timeout: 5000 });
    expect(patientUpdated).toBeInTheDocument();

    expect(screen.queryByRole("button", { name: /tandai semua dibaca/i })).not.toBeInTheDocument();
  });
});
