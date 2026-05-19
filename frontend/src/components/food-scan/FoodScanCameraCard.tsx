"use client";

import { useRef } from "react";
import type { ChangeEvent, RefObject } from "react";
import { motion } from "motion/react";
import { Camera, CameraOff, ImagePlus, Loader2, ScanLine } from "lucide-react";
import Webcam from "react-webcam";
import Button from "@/components/ui/Button";
import SelectField from "@/components/ui/SelectField";
import { getCameraLabel, getVideoConstraints } from "@/helpers/foodScanCamera";

interface FoodScanCameraCardProps {
  readonly cameraDevices: MediaDeviceInfo[];
  readonly cameraError: string | null;
  readonly cameraAspectRatio: number | null;
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
  readonly onUploadImage: (file: File) => void;
  readonly selectedCameraId: string | null;
  readonly webcamRef: RefObject<Webcam | null>;
}

export default function FoodScanCameraCard({ cameraDevices, cameraError, cameraAspectRatio, cameraKey, isCameraEnabled, isCameraReady, isCameraStarting, isScanning, onCameraError, onCameraReady, onRetryCamera, onScan, onSelectCamera, onUploadImage, selectedCameraId, webcamRef }: FoodScanCameraCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    onUploadImage(file);
  };

  return (
    <motion.section className="min-w-0 overflow-hidden rounded-[32px] bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.08)] sm:p-8" initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: 0.08 }}>
      {/* <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-3xl bg-primary/10 p-4">
          <div className="flex items-center gap-3 text-primary"><Camera className="h-5 w-5" aria-hidden="true" /><p className="text-sm font-extrabold uppercase tracking-[0.12em]">Scan Kamera</p></div>
          <p className="mt-2 text-sm font-semibold leading-6 text-muted">Ambil foto langsung dari kamera perangkat, lalu gambar disimpan sebelum dianalisis AI.</p>
        </div>
        <div className="rounded-3xl bg-surface p-4">
          <div className="flex items-center gap-3 text-primary"><ImagePlus className="h-5 w-5" aria-hidden="true" /><p className="text-sm font-extrabold uppercase tracking-[0.12em]">Upload Gambar</p></div>
          <p className="mt-2 text-sm font-semibold leading-6 text-muted">Pilih foto dari galeri. File tetap melewati alur upload yang sama ke Supabase Storage.</p>
        </div>
      </div> */}

      <div data-food-scan-camera className="relative mx-auto flex w-full max-w-[520px] min-w-0 items-center justify-center overflow-hidden rounded-[28px] border-2 border-dashed border-primary/45 bg-surface" style={{ aspectRatio: cameraAspectRatio ? String(cameraAspectRatio) : "1 / 1" }}>
        {isCameraEnabled && !cameraError && (
          <Webcam key={cameraKey} ref={webcamRef} audio={false} className="h-full w-full object-cover" disablePictureInPicture forceScreenshotSourceSize imageSmoothing muted screenshotFormat="image/jpeg" screenshotQuality={0.92} videoConstraints={getVideoConstraints(selectedCameraId)} onUserMedia={onCameraReady} onUserMediaError={onCameraError} />
        )}

        {isCameraStarting && !isScanning && <div className="absolute inset-[2px] rounded-[26px] flex items-center justify-center bg-dark/75 text-white"><Loader2 className="h-12 w-12 animate-spin" aria-hidden="true" /></div>}

        {isScanning && <div className="absolute inset-[2px] flex min-w-0 flex-col items-center justify-center gap-4 rounded-[26px] bg-dark/55 px-4 text-center text-white backdrop-blur-sm"><Loader2 className="h-12 w-12 shrink-0 animate-spin" /><p className="max-w-full text-xs font-bold uppercase tracking-[0.14em] sm:text-sm">Menganalisis makanan</p></div>}

        {(!isCameraEnabled || cameraError) && !isCameraStarting && !isScanning && (
          <div className="absolute inset-[2px] flex flex-col items-center justify-center gap-4 rounded-[26px] bg-surface px-6 text-center">
            {cameraError ? <CameraOff className="h-12 w-12 text-danger" /> : <Camera className="h-12 w-12 text-primary" />}
            <div>
              <h2 className="font-display text-2xl font-extrabold tracking-[-0.05em] text-text-main">{cameraError ? "Kamera belum aktif" : "Aktifkan kamera"}</h2>
              <p className="mt-3 text-sm font-semibold leading-6 text-muted">{cameraError || "Izinkan akses kamera agar bisa membantu deteksi makanan Anda."}</p>
            </div>
          </div>
        )}

        {isCameraEnabled && !cameraError && !isCameraStarting && !isCameraReady && <div className="absolute inset-[2px] flex flex-col items-center justify-center gap-4 rounded-[26px] bg-surface px-6 text-center"><Camera className="h-12 w-12 text-primary" /><p className="text-sm font-bold uppercase tracking-[0.14em] text-muted">Menunggu kamera</p></div>}
      </div>

      <div className="mt-6 grid min-w-0 grid-cols-1 justify-center gap-3 min-[420px]:grid-cols-2">
        {(!isCameraEnabled || cameraError) && <Button type="button" size="sm" variant="outline" className="w-full min-w-0 px-4" icon={<Camera size={16} />} loading={isCameraStarting} onClick={onRetryCamera}>{cameraError ? "Coba Kamera" : "Aktifkan Kamera"}</Button>}
        {isCameraEnabled && !cameraError && <Button type="button" size="sm" className="w-full min-w-0 px-4" icon={<ScanLine size={16} />} loading={isScanning} disabled={!isCameraReady} onClick={onScan}>Scan Sekarang</Button>}
        <input ref={fileInputRef} type="file" className="sr-only" accept="image/jpeg,image/png,image/webp" aria-label="Upload gambar makanan" onChange={handleUploadChange} />
        <Button type="button" size="sm" variant="outline" className="w-full min-w-0 px-4" icon={<ImagePlus size={16} />} loading={isScanning} onClick={() => fileInputRef.current?.click()}>Upload Gambar</Button>
      </div>

      {isCameraEnabled && cameraDevices.length > 1 && (
        <div className="mt-4">
          <label htmlFor="food-scan-camera" className="mb-2 block text-center text-xs font-bold uppercase tracking-[0.12em] text-muted">Pilih Kamera</label>
          <SelectField id="food-scan-camera" value={selectedCameraId ?? ""} options={cameraDevices.map((device, index) => ({ label: getCameraLabel(device, index), value: device.deviceId }))} optionsPlacement="top" className="h-12 w-full rounded-full border-0 bg-surface px-5 text-sm font-bold text-text-main outline-none transition-colors hover:bg-line/40" onChange={onSelectCamera} />
        </div>
      )}
    </motion.section>
  );
}
