"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardPageHeader from "@/components/dashboard/DashboardPageHeader";
import DashboardPageShell from "@/components/dashboard/DashboardPageShell";
import { getDashboardRole, isOperationalAdminRole } from "@/components/dashboard/navigation";
import type { FoodScanAnalysis } from "@/helpers/foodScans";
import { scanFoodImage } from "@/lib/foodScanApi";
import type { FoodScanRecord } from "@/lib/mocks/foodScans";
import { showToast } from "@/lib/swal";
import { useAuthStore } from "@/store/auth";
import { usePatientDashboardStore } from "@/store/patientDashboard";
import FoodScanCameraCard from "./FoodScanCameraCard";
import FoodScanResultPanel from "./FoodScanResultPanel";
import { useFoodScanCamera } from "./useFoodScanCamera";

export default function FoodScanPage() {
  const router = useRouter();
  const userRole = useAuthStore((state) => state.user?.role);
  const hasAuthHydrated = useAuthStore((state) => state.hasHydrated);
  const dashboardRole = getDashboardRole(userRole);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<FoodScanRecord | null>(null);
  const [scanAnalysis, setScanAnalysis] = useState<FoodScanAnalysis | null>(null);
  const setLastScan = usePatientDashboardStore((state) => state.setLastScan);
  const camera = useFoodScanCamera();

  useEffect(() => {
    const isBlockedRole = isOperationalAdminRole(dashboardRole) || dashboardRole === "super_admin";
    if (!hasAuthHydrated || !isBlockedRole) return;
    router.replace("/dashboard");
  }, [dashboardRole, hasAuthHydrated, router]);

  if (!hasAuthHydrated || isOperationalAdminRole(dashboardRole) || dashboardRole === "super_admin") return null;

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

    setIsScanning(true);

    try {
      const file = await camera.captureFoodImage();
      const analysis = await scanFoodImage(file);
      setScanAnalysis(analysis);
      setScanResult(analysis.scan);
      setLastScan(analysis.scan);
      showToast("Scan makanan selesai.", "success");
    } catch {
      setScanAnalysis(null);
      setScanResult(null);
      showToast("Scan makanan gagal.", "error");
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <DashboardPageShell>
      <DashboardPageHeader title="Scan Makanan" />

      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <FoodScanCameraCard
          cameraDevices={camera.cameraDevices}
          cameraError={camera.cameraError}
          isCameraEnabled={camera.isCameraEnabled}
          isCameraReady={camera.isCameraReady}
          isCameraStarting={camera.isCameraStarting}
          isScanning={isScanning}
          cameraKey={camera.cameraKey}
          selectedCameraId={camera.selectedCameraId}
          onCameraReady={camera.handleCameraReady}
          onCameraError={camera.handleCameraError}
          onRetryCamera={camera.retryCamera}
          onScan={runScan}
          onSelectCamera={camera.selectCamera}
          webcamRef={camera.webcamRef}
        />
        <FoodScanResultPanel isScanning={isScanning} result={scanResult} analysis={scanAnalysis} />
      </div>
    </DashboardPageShell>
  );
}
