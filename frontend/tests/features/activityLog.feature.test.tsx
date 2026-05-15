import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ActivityLogPage from "@/components/activity-log/ActivityLogPage";
import { getAlertActivitiesFromApi, resolveAlertViaApi } from "@/lib/alertsApi";
import { getActivityReadIdsFromApi, markActivitiesReadViaApi } from "@/lib/activityReadApi";
import { getAuditActivitiesFromApi } from "@/lib/auditLogApi";
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

vi.mock("@/lib/alertsApi", () => ({
  getAlertActivitiesFromApi: vi.fn(),
  resolveAlertViaApi: vi.fn(),
}));

vi.mock("@/lib/auditLogApi", () => ({
  getAuditActivitiesFromApi: vi.fn(),
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

describe("activity log feature", () => {
  beforeEach(() => {
    push.mockClear();
    vi.mocked(getAlertActivitiesFromApi).mockReset();
    vi.mocked(getAuditActivitiesFromApi).mockReset();
    vi.mocked(getActivityReadIdsFromApi).mockReset();
    vi.mocked(markActivitiesReadViaApi).mockReset();
    vi.mocked(getPatientsFromApi).mockReset();
    vi.mocked(resolveAlertViaApi).mockReset();
    vi.mocked(showToast).mockClear();
    useActivityLogStore.setState({ activities: [] });
    useNurseStore.setState({ nurses: [] });
  });

  it("loads alert activities, filters critical items, and marks all as read", async () => {
    vi.mocked(getAlertActivitiesFromApi).mockResolvedValueOnce([activity]);
    vi.mocked(getAuditActivitiesFromApi).mockResolvedValueOnce([]);
    vi.mocked(getActivityReadIdsFromApi).mockResolvedValueOnce(new Set());
    vi.mocked(markActivitiesReadViaApi).mockResolvedValue(undefined);
    vi.mocked(getPatientsFromApi).mockResolvedValueOnce([]);
    vi.mocked(resolveAlertViaApi).mockResolvedValue(undefined);

    render(<ActivityLogPage />);

    expect(await screen.findByText("Kepatuhan kritis")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Kritis" }));
    expect(screen.getByText("Budi belum minum obat.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /tandai semua dibaca/i }));

    await waitFor(() => expect(resolveAlertViaApi).toHaveBeenCalledWith("alert-1"));
    expect(markActivitiesReadViaApi).toHaveBeenCalledWith(["alert-1"]);
    expect(showToast).toHaveBeenCalledWith("Semua aktivitas ditandai sudah dibaca.");
    expect(useActivityLogStore.getState().activities.every((item) => item.read)).toBe(true);
  });

  it("read-only mode combines audit and alert activities", async () => {
    vi.mocked(getAlertActivitiesFromApi).mockResolvedValueOnce([activity]);
    vi.mocked(getAuditActivitiesFromApi).mockResolvedValueOnce([{ ...activity, id: "audit-1", title: "Patient Updated", category: "Administrasi", severity: "Sukses", read: true }]);
    vi.mocked(getActivityReadIdsFromApi).mockResolvedValueOnce(new Set());
    vi.mocked(getPatientsFromApi).mockResolvedValueOnce([]);

    render(<ActivityLogPage readOnly />);

    expect(await screen.findByText("Kepatuhan kritis")).toBeInTheDocument();
    expect(screen.getByText("Patient Updated")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /tandai semua dibaca/i })).not.toBeInTheDocument();
  });
});
