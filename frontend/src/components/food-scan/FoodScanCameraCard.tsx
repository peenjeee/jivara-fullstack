"use client";

import type { RefObject } from "react";
import { motion } from "motion/react";
import { Camera, CameraOff, Loader2, ScanLine } from "lucide-react";
import Webcam from "react-webcam";
import Button from "@/components/ui/Button";
import SelectField from "@/components/ui/SelectField";
import { getCameraLabel, getVideoConstraints } from "@/helpers/foodScanCamera";

interface FoodScanCameraCardProps {
  readonly cameraDevices: MediaDeviceInfo[];
  readonly cameraError: string | null;
  readonly cameraKey: number;
  readonly isCameraEnabled: boolean;
  readonly isCameraReady: boolean;
  readonly isCameraStarting: boolean;
  readonly isScanning: boolean;
  readonly onCameraError: (error: string | DOMException) => void;
  readonly onCameraReady: (stream: MediaStream) => void;
  readonly onRetryCamera: () => void;
  readonly onScan: () => void;
  readonly onSelectCamera: (deviceId: string) => void;
  readonly selectedCameraId: string | null;
  readonly webcamRef: RefObject<Webcam | null>;
}

export default function FoodScanCameraCard({ cameraDevices, cameraError, cameraKey, isCameraEnabled, isCameraReady, isCameraStarting, isScanning, onCameraError, onCameraReady, onRetryCamera, onScan, onSelectCamera, selectedCameraId, webcamRef }: FoodScanCameraCardProps) {
  return (
    <motion.section className="overflow-visible rounded-[32px] bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.08)] sm:p-8" initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: 0.08 }}>
      <div data-food-scan-camera className="relative flex h-64 items-center justify-center overflow-hidden rounded-[28px] bg-dark outline-2 outline-dashed outline-primary/45 sm:h-80">
        {isCameraEnabled && !cameraError && (
          <Webcam key={cameraKey} ref={webcamRef} audio={false} className="h-full w-full object-cover" disablePictureInPicture forceScreenshotSourceSize imageSmoothing muted screenshotFormat="image/jpeg" screenshotQuality={0.92} videoConstraints={getVideoConstraints(selectedCameraId)} onUserMedia={onCameraReady} onUserMediaError={onCameraError} />
        )}

        {isCameraStarting && !isScanning && <div className="absolute inset-0 flex items-center justify-center bg-dark/75 text-white"><Loader2 className="h-12 w-12 animate-spin" aria-hidden="true" /></div>}

        {isScanning && <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-dark/55 text-white backdrop-blur-sm"><Loader2 className="h-12 w-12 animate-spin" /><p className="text-sm font-bold uppercase tracking-[0.14em]">Menganalisis makanan</p></div>}

        {(!isCameraEnabled || cameraError) && !isCameraStarting && !isScanning && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-surface px-6 text-center">
            {cameraError ? <CameraOff className="h-12 w-12 text-danger" /> : <Camera className="h-12 w-12 text-primary" />}
            <div>
              <h2 className="font-display text-2xl font-extrabold tracking-[-0.05em] text-text-main">{cameraError ? "Kamera belum aktif" : "Aktifkan kamera"}</h2>
              <p className="mt-3 text-sm font-semibold leading-6 text-muted">{cameraError || "Izinkan akses kamera agar bisa membantu deteksi makanan Anda."}</p>
            </div>
          </div>
        )}

        {isCameraEnabled && !cameraError && !isCameraStarting && !isCameraReady && <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-surface px-6 text-center"><Camera className="h-12 w-12 text-primary" /><p className="text-sm font-bold uppercase tracking-[0.14em] text-muted">Menunggu kamera</p></div>}
      </div>

      <div className="mx-auto mt-6 flex w-full max-w-xl flex-col justify-center gap-3 min-[420px]:flex-row">
        {(!isCameraEnabled || cameraError) && <Button type="button" size="sm" variant="outline" className="w-full min-w-0 min-[420px]:max-w-64" icon={<Camera size={16} />} loading={isCameraStarting} onClick={onRetryCamera}>{cameraError ? "Coba Kamera" : "Aktifkan Kamera"}</Button>}
        <Button type="button" size="sm" className="w-full min-w-0 min-[420px]:max-w-64" icon={<ScanLine size={16} />} loading={isScanning} disabled={!isCameraReady} onClick={onScan}>Scan Sekarang</Button>
      </div>

      {isCameraEnabled && cameraDevices.length > 1 && (
        <div className="mx-auto mt-4 w-full max-w-xl">
          <label htmlFor="food-scan-camera" className="mb-2 block text-center text-xs font-bold uppercase tracking-[0.12em] text-muted">Pilih Kamera</label>
          <SelectField id="food-scan-camera" value={selectedCameraId ?? ""} options={cameraDevices.map((device, index) => ({ label: getCameraLabel(device, index), value: device.deviceId }))} className="h-12 w-full rounded-full border-0 bg-surface px-5 text-sm font-bold text-text-main outline-none transition-colors hover:bg-line/40" onChange={onSelectCamera} />
        </div>
      )}
    </motion.section>
  );
}
