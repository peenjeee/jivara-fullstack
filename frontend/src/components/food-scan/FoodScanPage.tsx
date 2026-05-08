"use client";

import { useEffect, useRef, useState, type ChangeEvent, type RefObject } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Camera, Loader2, ScanLine } from "lucide-react";
import DashboardPageHeader from "@/components/dashboard/DashboardPageHeader";
import DashboardPageShell from "@/components/dashboard/DashboardPageShell";
import Button from "@/components/ui/Button";
import type { FoodScanAnalysis } from "@/helpers/foodScans";
import { scanFoodImage } from "@/lib/foodScanApi";
import { foodScans, type FoodScanRecord } from "@/lib/mocks/foodScans";
import { patients } from "@/lib/mocks/patients";
import { showToast } from "@/lib/swal";
import { usePatientDashboardStore } from "@/store/patientDashboard";
import { getDashboardRole } from "@/components/dashboard/navigation";
import { useAuthStore } from "@/store/auth";
import { useRouter } from "next/navigation";
import FoodScanAnalysisView from "./FoodScanAnalysisView";

const mockPatient = patients[0];
const patientScanResults = foodScans.filter((scan) => scan.patientId === mockPatient.id);

export default function FoodScanPage() {
  const router = useRouter();
  const userRole = useAuthStore((state) => state.user?.role);
  const hasAuthHydrated = useAuthStore((state) => state.hasHydrated);
  const dashboardRole = getDashboardRole(userRole);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<FoodScanRecord | null>(null);
  const [scanAnalysis, setScanAnalysis] = useState<FoodScanAnalysis | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const setLastScan = usePatientDashboardStore((state) => state.setLastScan);

  useEffect(() => {
    if (!hasAuthHydrated || dashboardRole !== "admin") return;
    router.replace("/dashboard");
  }, [dashboardRole, hasAuthHydrated, router]);

  if (!hasAuthHydrated || dashboardRole === "admin") return null;

  const runScan = () => {
    if (!isScanning) fileInputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    setIsScanning(true);

    try {
      const analysis = await scanFoodImage(file);
      setScanAnalysis(analysis);
      setScanResult(analysis.scan);
      setLastScan(analysis.scan);
      showToast("Scan makanan selesai.", "success");
    } catch {
      const result = patientScanResults[0] ?? foodScans[0];
      setScanAnalysis(null);
      setScanResult(result);
      setLastScan(result);
      showToast("Scan makanan gagal terhubung ke API, menampilkan data contoh.", "error");
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <DashboardPageShell>
      <DashboardPageHeader
        title="Scan Makanan"
      />

      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <ScanInputCard isScanning={isScanning} onScan={runScan} fileInputRef={fileInputRef} onFileChange={handleFileChange} />
        <ScanResultPanel isScanning={isScanning} result={scanResult} analysis={scanAnalysis} />
      </div>
    </DashboardPageShell>
  );
}

function ScanInputCard({ isScanning, onScan, fileInputRef, onFileChange }: { readonly isScanning: boolean; readonly onScan: () => void; readonly fileInputRef: RefObject<HTMLInputElement | null>; readonly onFileChange: (event: ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <motion.section
      className="overflow-hidden rounded-[32px] bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.08)] sm:p-8"
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: 0.08 }}
    >
      <div className="flex h-64 items-center justify-center rounded-[28px] border-2 border-dashed border-primary/45 bg-surface sm:h-80">
        <div className="text-center gap-2">
          <motion.div
            className="mx-auto flex items-center justify-center text-primary"
            animate={isScanning ? { scale: [1, 1.08, 1], rotate: [0, 4, -4, 0] } : { scale: 1 }}
            transition={{ duration: 0.9, repeat: isScanning ? Infinity : 0 }}
          >
            {isScanning ? <Loader2 className="h-14 w-14 animate-spin" /> : <Camera className="h-14 w-14" />}
          </motion.div>
          <h2 className="mt-6 font-display text-3xl font-extrabold tracking-[-0.05em] text-text-main">Scan Makanan</h2>
        </div>
      </div>

      <div className="mt-6 flex justify-center">
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onFileChange} />
        <Button size="sm" className="min-w-44" icon={<ScanLine size={16} />} loading={isScanning} onClick={onScan}>
          Mulai Scan
        </Button>
      </div>
    </motion.section>
  );
}

function ScanResultPanel({ isScanning, result, analysis }: { readonly isScanning: boolean; readonly result: FoodScanRecord | null; readonly analysis: FoodScanAnalysis | null }) {
  return (
    <motion.section
      className="min-h-[460px] rounded-[32px] bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.08)] sm:p-8"
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: 0.16 }}
    >
      <AnimatePresence mode="wait">
        {isScanning ? (
          <motion.div key="loading" className="flex h-full min-h-[420px] flex-col items-center justify-center gap-6 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <h2 className="font-display text-3xl font-extrabold tracking-[-0.05em] text-text-main">AI sedang menganalisis</h2>
            <p className="mt-3 max-w-md text-sm font-semibold leading-6 text-muted">Menganalisis makanan, mencocokkan jadwal obat aktif, dan menyusun rekomendasi.</p>
          </motion.div>
        ) : result ? (
          <motion.div key="result" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
            <FoodScanAnalysisView scanId={result.id} analysisData={analysis ?? undefined} />
          </motion.div>
        ) : (
          <motion.div key="empty" className="flex h-full min-h-[420px] flex-col items-center justify-center gap-6 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ScanLine className="h-14 w-14 text-primary" />
            <h2 className="font-display text-3xl font-extrabold tracking-[-0.05em] text-text-main">Belum ada hasil scan</h2>
            <p className="mt-6 max-w-md text-sm font-semibold leading-6 text-muted">Klik “Mulai Scan” untuk melihat hasil deteksi makanan, analisis AI, dan rekomendasi.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
