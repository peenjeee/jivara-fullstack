"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardPageHeader from "@/components/dashboard/DashboardPageHeader";
import DashboardPageShell from "@/components/dashboard/DashboardPageShell";
import { getDashboardRole, isOperationalAdminRole } from "@/components/dashboard/navigation";
import type { FoodScanAnalysis } from "@/helpers/foodScans";
import { getApiErrorMessage } from "@/lib/apiErrors";
import { scanFoodImage } from "@/lib/foodScanApi";
import type { FoodScanRecord } from "@/lib/mocks/foodScans";
import { showToast } from "@/lib/swal";
import { useAuthStore } from "@/store/auth";
import { usePatientDashboardStore } from "@/store/patientDashboard";
import FoodScanCameraCard from "./FoodScanCameraCard";
import FoodScanResultPanel from "./FoodScanResultPanel";
import { useFoodScanCamera } from "./useFoodScanCamera";

let foodScanViewCache: {
  scanResult: FoodScanRecord | null;
  scanAnalysis: FoodScanAnalysis | null;
} | null = null;

export default function FoodScanPage() {
  const { replace } = useRouter();
  const userRole = useAuthStore((state) => state.user?.role);
  const hasAuthHydrated = useAuthStore((state) => state.hasHydrated);
  const dashboardRole = getDashboardRole(userRole);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<FoodScanRecord | null>(() => foodScanViewCache?.scanResult ?? null);
  const [scanAnalysis, setScanAnalysis] = useState<FoodScanAnalysis | null>(() => foodScanViewCache?.scanAnalysis ?? null);
  const setLastScan = usePatientDashboardStore((state) => state.setLastScan);
  const camera = useFoodScanCamera();
  const { stopCameraStream } = camera;

  useEffect(() => () => {
    stopCameraStream();
  }, [stopCameraStream]);

  useEffect(() => {
    const isBlockedRole = isOperationalAdminRole(dashboardRole) || dashboardRole === "super_admin";
    if (!hasAuthHydrated || !isBlockedRole) return;
      replace("/dashboard");
  }, [dashboardRole, hasAuthHydrated, replace]);

  if (!hasAuthHydrated || isOperationalAdminRole(dashboardRole) || dashboardRole === "super_admin") return null;

  const analyzeFoodImage = async (file: File, successMessage: string, failureMessage: string) => {
    setIsScanning(true);

    try {
      const analysis = await scanFoodImage(file);
      setScanAnalysis(analysis);
      setScanResult(analysis.scan);
      foodScanViewCache = { scanAnalysis: analysis, scanResult: analysis.scan };
      setLastScan(analysis.scan);
      showToast(successMessage, "success");
    } catch (error) {
      setScanAnalysis(null);
      setScanResult(null);
      foodScanViewCache = { scanAnalysis: null, scanResult: null };
      showToast(getApiErrorMessage(error, failureMessage), "error");
    } finally {
      setIsScanning(false);
    }
  };

  const runScan = async () => {
    if (isScanning) return;

    if (!camera.isCameraEnabled) {
      void camera.retryCamera();
      return;
    }

    if (!camera.isCameraReady) {
      showToast("Tunggu kamera aktif terlebih dahulu.", "warning");
      return;
    }

    try {
      const file = await camera.captureFoodImage();
      await analyzeFoodImage(file, "Scan makanan selesai.", "Scan makanan gagal.");
    } catch (error) {
      setScanAnalysis(null);
      setScanResult(null);
      showToast(error instanceof Error && error.message ? error.message : "Scan makanan gagal.", "error");
    }
  };

  const uploadImage = async (file: File) => {
    if (isScanning) return;
    await analyzeFoodImage(file, "Upload gambar selesai.", "Upload gambar gagal.");
  };

  return (
    <DashboardPageShell>
      <DashboardPageHeader title="Scan Makanan" />

      <div className="mt-6 min-w-0 space-y-6">
        <div className="mx-auto w-full max-w-3xl">
          <FoodScanCameraCard
            cameraDevices={camera.cameraDevices}
            cameraError={camera.cameraError}
            cameraAspectRatio={camera.cameraAspectRatio}
            cameraStatus={camera.cameraError ? "error" : camera.isCameraStarting ? "starting" : camera.isCameraEnabled && camera.isCameraReady ? "ready" : "disabled"}
            isScanning={isScanning}
            cameraKey={camera.cameraKey}
            selectedCameraId={camera.selectedCameraId}
            onCameraReady={camera.handleCameraReady}
            onCameraError={camera.handleCameraError}
            onRetryCamera={camera.retryCamera}
            onScan={runScan}
            onSelectCamera={camera.selectCamera}
            onUploadImage={uploadImage}
            webcamRef={camera.webcamRef}
          />
        </div>

        <div className="mx-auto w-full max-w-5xl">
          <FoodScanResultPanel isScanning={isScanning} result={scanResult} analysis={scanAnalysis} />
        </div>
      </div>
    </DashboardPageShell>
  );
}
