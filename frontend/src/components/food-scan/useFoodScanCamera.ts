"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";
import { dataUrlToFile, getCameraErrorMessage, getPreferredCameraId, queryCameraPermission, requestCameraAccess } from "@/helpers/foodScanCamera";

export function useFoodScanCamera() {
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isCameraStarting, setIsCameraStarting] = useState(false);
  const [isCameraEnabled, setIsCameraEnabled] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraPermission, setCameraPermission] = useState<PermissionState | null>(null);
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [cameraKey, setCameraKey] = useState(0);
  const webcamRef = useRef<Webcam>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  const refreshCameraDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;

    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter((device) => device.kind === "videoinput");
    setCameraDevices(videoDevices);

    if (!selectedCameraId && videoDevices.length > 0) setSelectedCameraId(getPreferredCameraId(videoDevices));
  }, [selectedCameraId]);

  const markCameraUnavailable = useCallback(() => {
    setIsCameraReady(false);
    setIsCameraStarting(false);
    setIsCameraEnabled(false);
    setCameraError("Akses kamera berubah. Izinkan kamera lalu klik Coba Kamera.");
  }, []);

  const retryCamera = useCallback(async () => {
    setIsCameraStarting(true);
    setCameraError(null);
    setIsCameraReady(false);

    const permission = await queryCameraPermission();
    setCameraPermission(permission);

    if (permission === "denied") {
      setCameraError("Izin kamera tidak diizinkan. Silahkan izinkan akses kamera terlebih dahulu.");
      setIsCameraReady(false);
      setIsCameraStarting(false);
      setIsCameraEnabled(false);
      return;
    }

    try {
      await requestCameraAccess();
      setCameraPermission("granted");
      await refreshCameraDevices();
      setIsCameraEnabled(true);
      setCameraKey((key) => key + 1);
    } catch (error) {
      setCameraError(getCameraErrorMessage(error instanceof DOMException ? error : undefined));
      setIsCameraEnabled(false);
      setIsCameraStarting(false);
    }
  }, [refreshCameraDevices]);

  const handleCameraReady = useCallback((stream: MediaStream) => {
    cameraStreamRef.current = stream;
    stream.getVideoTracks().forEach((track) => {
      track.onended = markCameraUnavailable;
      track.onmute = markCameraUnavailable;
    });
    setIsCameraReady(true);
    setIsCameraStarting(false);
    setCameraPermission("granted");
    setCameraError(null);
    void refreshCameraDevices();
  }, [markCameraUnavailable, refreshCameraDevices]);

  const handleCameraError = useCallback((error: string | DOMException) => {
    setIsCameraReady(false);
    setIsCameraStarting(false);
    setIsCameraEnabled(false);
    setCameraError(getCameraErrorMessage(error));
  }, []);

  const selectCamera = useCallback((deviceId: string) => {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    setSelectedCameraId(deviceId);
    setIsCameraReady(false);
    setIsCameraStarting(true);
    setCameraKey((key) => key + 1);
  }, []);

  const captureFoodImage = useCallback(async () => {
    let screenshot = webcamRef.current?.getScreenshot({ width: 1280, height: 720 });

    if (!screenshot) {
      const video = (webcamRef.current as (Webcam & { video?: HTMLVideoElement }) | null)?.video ?? document.querySelector<HTMLVideoElement>('[data-food-scan-camera] video');
      if (video && video.videoWidth > 0 && video.videoHeight > 0) {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
        screenshot = canvas.toDataURL("image/jpeg", 0.92);
      }
    }

    if (!screenshot) throw new Error("Kamera belum siap.");
    return dataUrlToFile(screenshot, `food-scan-${Date.now()}.jpg`);
  }, []);

  useEffect(() => {
    let permissionStatus: PermissionStatus | null = null;

    void (async () => {
      if (!("permissions" in navigator)) {
        setCameraPermission(null);
        return;
      }

      try {
        permissionStatus = await navigator.permissions.query({ name: "camera" as PermissionName });
        setCameraPermission(permissionStatus.state);
        permissionStatus.onchange = () => {
          const nextState = permissionStatus?.state ?? null;
          setCameraPermission(nextState);

          if (nextState === "denied") {
            markCameraUnavailable();
            return;
          }

          if (nextState === "granted") {
            setCameraError(null);
            setIsCameraStarting(true);
            setIsCameraEnabled(true);
            setCameraKey((key) => key + 1);
          }
        };
      } catch {
        setCameraPermission(null);
      }
    })();

    return () => {
      if (permissionStatus) permissionStatus.onchange = null;
    };
  }, [markCameraUnavailable]);

  useEffect(() => {
    const refreshCameraOnFocus = () => {
      if (cameraPermission !== "granted" || !isCameraEnabled || isCameraReady) return;
      setCameraError(null);
      setIsCameraStarting(true);
      setCameraKey((key) => key + 1);
    };

    window.addEventListener("focus", refreshCameraOnFocus);
    document.addEventListener("visibilitychange", refreshCameraOnFocus);

    return () => {
      window.removeEventListener("focus", refreshCameraOnFocus);
      document.removeEventListener("visibilitychange", refreshCameraOnFocus);
    };
  }, [cameraPermission, isCameraEnabled, isCameraReady]);

  useEffect(() => {
    return () => {
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return {
    cameraDevices,
    cameraError,
    cameraKey,
    captureFoodImage,
    handleCameraError,
    handleCameraReady,
    isCameraEnabled,
    isCameraReady,
    isCameraStarting,
    retryCamera,
    selectCamera,
    selectedCameraId,
    webcamRef,
  };
}
