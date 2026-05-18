export const CAMERA_CONSTRAINTS: MediaTrackConstraints = {
  facingMode: { ideal: "environment" },
  width: { ideal: 1280 },
  height: { ideal: 720 },
};

export const getVideoConstraints = (deviceId: string | null): MediaTrackConstraints => ({
  ...(deviceId ? { deviceId: { exact: deviceId } } : { facingMode: { ideal: "environment" } }),
  width: { ideal: 1280 },
  height: { ideal: 720 },
});

export const getCameraLabel = (device: Pick<MediaDeviceInfo, "label">, index: number) => {
  if (device.label) return device.label;
  return `Kamera ${index + 1}`;
};

export const getPreferredCameraId = (devices: readonly Pick<MediaDeviceInfo, "deviceId" | "label">[]) => {
  const environmentCamera = devices.find((device) => /back|rear|environment|belakang/i.test(device.label));
  return (environmentCamera ?? devices[0])?.deviceId ?? null;
};

export const dataUrlToFile = async (dataUrl: string, fileName: string) => {
  const matches = dataUrl.match(/^data:([^;,]+)?(?:;base64)?,(.*)$/);
  if (!matches) throw new Error("Format gambar kamera tidak valid.");

  const mimeType = matches[1] || "image/jpeg";
  const encodedData = matches[2] || "";
  const binary = atob(encodedData);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new File([bytes], fileName, { type: mimeType });
};

export const isSecureCameraContext = () => {
  if (typeof window === "undefined") return false;
  return window.isSecureContext || ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
};

export const getCameraErrorMessage = (error?: string | DOMException) => {
  if (!isSecureCameraContext()) return "Akses kamera hanya tersedia di HTTPS atau localhost.";

  const name = typeof error === "string" ? error : error?.name;
  if (name === "NotAllowedError" || name === "PermissionDeniedError") return "Izin kamera diblokir browser. Klik ikon gembok/kamera di address bar, ubah Camera ke Allow, lalu refresh halaman.";
  if (name === "NotFoundError" || name === "DevicesNotFoundError") return "Kamera tidak ditemukan di perangkat ini.";
  if (name === "NotReadableError" || name === "TrackStartError") return "Kamera sedang dipakai aplikasi lain. Tutup aplikasi tersebut lalu coba lagi.";
  if (name === "OverconstrainedError" || name === "ConstraintNotSatisfiedError") return "Kamera belakang tidak tersedia. Coba aktifkan kamera dengan mode fallback.";

  return "Kamera tidak bisa diakses. Pastikan permission kamera diizinkan.";
};

export const queryCameraPermission = async () => {
  if (typeof navigator === "undefined" || !("permissions" in navigator)) return null;

  try {
    const status = await navigator.permissions.query({ name: "camera" as PermissionName });
    return status.state;
  } catch {
    return null;
  }
};

export const requestCameraAccess = async () => {
  if (!isSecureCameraContext()) throw new DOMException("Camera requires HTTPS or localhost", "SecurityError");
  if (!navigator.mediaDevices?.getUserMedia) throw new DOMException("Camera API is unavailable", "NotSupportedError");

  const preferredConstraints: MediaStreamConstraints = { audio: false, video: CAMERA_CONSTRAINTS };
  const fallbackConstraints: MediaStreamConstraints = { audio: false, video: true };
  const stream = await navigator.mediaDevices.getUserMedia(preferredConstraints).catch(() => navigator.mediaDevices.getUserMedia(fallbackConstraints));
  stream.getTracks().forEach((track) => track.stop());
};
