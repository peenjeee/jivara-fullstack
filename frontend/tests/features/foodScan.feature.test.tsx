import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import FoodScanPage from "@/components/food-scan/FoodScanPage";
import { scanFoodImage } from "@/lib/foodScanApi";
import { showToast } from "@/lib/swal";
import { useAuthStore } from "@/store/auth";
import { usePatientDashboardStore } from "@/store/patientDashboard";
import type { FoodScanAnalysis } from "@/helpers/foodScans";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/food-scan",
}));

vi.mock("@/lib/foodScanApi", () => ({
  scanFoodImage: vi.fn(),
}));

vi.mock("@/lib/swal", () => ({
  showToast: vi.fn(),
}));

vi.mock("@/components/food-scan/FoodScanAnalysisView", () => ({
  default: ({ analysisData }: { readonly analysisData?: FoodScanAnalysis }) => <div>{analysisData?.scan.foodName ?? "Contoh hasil scan"}</div>,
}));

const analysis: FoodScanAnalysis = {
  scan: {
    id: "scan-1",
    patientId: "JVR-01",
    foodName: "Susu",
    image: "/scan.jpg",
    scannedAt: "2026-05-09T08:00:00.000Z",
    risk: "High Risk",
    aiReasoning: "Risiko tinggi",
    result: "Interaksi ditemukan",
    recommendation: "Beri jeda konsumsi",
  },
  schedules: [],
  interactions: [],
  overallRisk: "High Risk",
};

describe("food scan feature", () => {
  beforeEach(() => {
    replace.mockClear();
    vi.mocked(scanFoodImage).mockReset();
    vi.mocked(showToast).mockClear();
    usePatientDashboardStore.getState().resetPatientDashboardState();
    useAuthStore.setState({ user: { id: "patient-1", fullName: "Pasien", email: "patient@test.local", role: "patient", accountStatus: "active", age: 30 }, token: "token", isAuthenticated: true, hasHydrated: true });
  });

  it("uploads image, shows scan result, and stores last scan", async () => {
    vi.mocked(scanFoodImage).mockResolvedValueOnce(analysis);
    const { container } = render(<FoodScanPage />);
    const input = container.querySelector("input[type='file']") as HTMLInputElement;

    fireEvent.change(input, { target: { files: [new File(["image"], "food.jpg", { type: "image/jpeg" })] } });

    await waitFor(() => expect(scanFoodImage).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("Susu")).toBeInTheDocument();
    expect(showToast).toHaveBeenCalledWith("Scan makanan selesai.", "success");
    expect(usePatientDashboardStore.getState().lastScan?.id).toBe("scan-1");
  });

  it("redirects operational admin roles away from food scan", async () => {
    useAuthStore.setState({ user: { id: "admin-1", fullName: "Admin", email: "admin@test.local", role: "admin", accountStatus: "active", age: 30 }, token: "token", isAuthenticated: true, hasHydrated: true });

    render(<FoodScanPage />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/dashboard"));
  });
});
