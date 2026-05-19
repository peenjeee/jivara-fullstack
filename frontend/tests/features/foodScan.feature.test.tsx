import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import FoodScanPage from "@/components/food-scan/FoodScanPage";
import { scanFoodImage } from "@/lib/foodScanApi";
import { showToast } from "@/lib/swal";
import { useAuthStore } from "@/store/auth";
import { usePatientDashboardStore } from "@/store/patientDashboard";
import type { FoodScanAnalysis } from "@/helpers/foodScans";

const replace = vi.fn();
const getScreenshot = vi.fn(() => "data:image/jpeg;base64,aW1hZ2U=");
const mediaTrack = { stop: vi.fn(), onended: null, onmute: null };
const mediaStream = { getTracks: () => [mediaTrack], getVideoTracks: () => [mediaTrack] };

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/food-scan",
}));

vi.mock("react-webcam", async () => {
  const React = await import("react");
  const MockWebcam = React.forwardRef(({ onUserMedia }: { readonly onUserMedia?: (stream: MediaStream) => void }, ref) => {
    React.useImperativeHandle(ref, () => ({ getScreenshot }));
    React.useEffect(() => {
      onUserMedia?.(mediaStream as unknown as MediaStream);
    }, [onUserMedia]);
    return <div data-testid="camera-preview" />;
  });
  MockWebcam.displayName = "MockWebcam";

  return {
    default: MockWebcam,
  };
});

vi.mock("@/lib/foodScanApi", () => ({
  scanFoodImage: vi.fn(),
}));

vi.mock("@/lib/swal", () => ({
  showToast: vi.fn(),
}));

vi.mock("@/components/food-scan/FoodScanAnalysisView", () => ({
  default: ({ analysisData }: { readonly analysisData?: FoodScanAnalysis }) => <div>{analysisData?.scan.foodName ?? "Contoh hasil scan"}</div>,
}));

const cameraDevices = [
  { deviceId: "front-camera", kind: "videoinput", label: "HP True Vision FHD Camera", groupId: "group-1", toJSON: () => ({}) },
  { deviceId: "rear-camera", kind: "videoinput", label: "Rear Camera", groupId: "group-2", toJSON: () => ({}) },
] satisfies MediaDeviceInfo[];

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

const seedPatientAuth = () => {
  usePatientDashboardStore.getState().resetPatientDashboardState();
  useAuthStore.setState({ user: { id: "patient-1", fullName: "Pasien", email: "patient@test.local", role: "patient", accountStatus: "active", age: 30 }, isAuthenticated: true, hasHydrated: true });
};

const setupCameraApis = () => {
  Object.defineProperty(window, "isSecureContext", { value: true, configurable: true });
  Object.defineProperty(navigator, "permissions", { value: { query: vi.fn().mockResolvedValue({ state: "prompt", onchange: null }) }, configurable: true });
  Object.defineProperty(navigator, "mediaDevices", {
    value: {
      getUserMedia: vi.fn().mockResolvedValue(mediaStream),
      enumerateDevices: vi.fn().mockResolvedValue(cameraDevices),
    },
    configurable: true,
  });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ blob: () => Promise.resolve(new Blob(["image"], { type: "image/jpeg" })) }));
};

describe("food scan feature", () => {
  beforeEach(() => {
    replace.mockClear();
    mediaTrack.stop.mockClear();
    getScreenshot.mockClear();
    vi.mocked(scanFoodImage).mockReset();
    vi.mocked(scanFoodImage).mockResolvedValue(analysis);
    vi.mocked(showToast).mockClear();
    setupCameraApis();
    seedPatientAuth();
  });

  it("captures a live camera frame, uploads it, shows scan result, and stores last scan", async () => {
    render(<FoodScanPage />);
    expect(screen.queryByRole("button", { name: /scan sekarang/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /aktifkan kamera/i }));

    await screen.findByTestId("camera-preview");
    await waitFor(() => expect(screen.getByRole("button", { name: /scan sekarang/i })).not.toBeDisabled());
    fireEvent.click(screen.getByRole("button", { name: /scan sekarang/i }));

    await waitFor(() => expect(scanFoodImage).toHaveBeenCalledTimes(1));
    expect(getScreenshot).toHaveBeenCalledWith();
    expect(vi.mocked(scanFoodImage).mock.calls[0][0]).toBeInstanceOf(File);
    expect(await screen.findByText("Susu", {}, { timeout: 3000 })).toBeInTheDocument();
    expect(showToast).toHaveBeenCalledWith("Scan makanan selesai.", "success");
    expect(usePatientDashboardStore.getState().lastScan?.id).toBe("scan-1");
  });

  it("uploads a gallery image through the same food scan flow", async () => {
    render(<FoodScanPage />);
    const file = new File(["image"], "meal.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText(/upload gambar makanan/i), { target: { files: [file] } });

    await waitFor(() => expect(scanFoodImage).toHaveBeenCalledWith(file));
    expect(await screen.findByText("Susu", {}, { timeout: 3000 })).toBeInTheDocument();
    expect(showToast).toHaveBeenCalledWith("Upload gambar selesai.", "success");
    expect(usePatientDashboardStore.getState().lastScan?.id).toBe("scan-1");
  });

  it("shows a custom camera selector and switches camera devices", async () => {
    render(<FoodScanPage />);
    fireEvent.click(screen.getByRole("button", { name: /aktifkan kamera/i }));

    expect(await screen.findByText("Pilih Kamera")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /rear camera/i }));
    fireEvent.click(screen.getByRole("option", { name: /hp true vision/i }));

    expect(screen.getByRole("button", { name: /hp true vision/i })).toBeInTheDocument();
  });

  it("redirects operational admin roles away from food scan", async () => {
    useAuthStore.setState({ user: { id: "admin-1", fullName: "Admin", email: "admin@test.local", role: "admin", accountStatus: "active", age: 30 }, isAuthenticated: true, hasHydrated: true });

    render(<FoodScanPage />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/dashboard"));
  });
});
