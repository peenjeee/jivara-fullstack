"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import Webcam from "react-webcam";
import { dataUrlToFile, getCameraErrorMessage, getPreferredCameraId, queryCameraPermission, requestCameraAccess } from "@/helpers/foodScanCamera";

interface CameraState {
  readonly cameraAspectRatio: number | null;
  readonly cameraDevices: MediaDeviceInfo[];
  readonly cameraError: string | null;
  readonly cameraKey: number;
  readonly cameraPermission: PermissionState | null;
  readonly isCameraEnabled: boolean;
  readonly isCameraReady: boolean;
  readonly isCameraStarting: boolean;
  readonly selectedCameraId: string | null;
}

type CameraAction =
  | { readonly type: "denied" }
  | { readonly type: "devicesLoaded"; readonly devices: MediaDeviceInfo[]; readonly selectedCameraId: string | null }
  | { readonly type: "enabled" }
  | { readonly type: "error"; readonly error: string }
  | { readonly type: "permission"; readonly permission: PermissionState | null }
  | { readonly type: "ready"; readonly aspectRatio: number | null }
  | { readonly type: "restart" }
  | { readonly type: "selectCamera"; readonly deviceId: string }
  | { readonly type: "starting" }
  | { readonly type: "unavailable" };

const initialCameraState: CameraState = {
  cameraAspectRatio: null,
  cameraDevices: [],
  cameraError: null,
  cameraKey: 0,
  cameraPermission: null,
  isCameraEnabled: false,
  isCameraReady: false,
  isCameraStarting: false,
  selectedCameraId: null,
};

function cameraReducer(state: CameraState, action: CameraAction): CameraState {
  switch (action.type) {
    case "devicesLoaded":
      return {
        ...state,
        cameraDevices: action.devices,
        selectedCameraId: state.selectedCameraId ?? action.selectedCameraId ?? (action.devices.length > 0 ? getPreferredCameraId(action.devices) : null),
      };
    case "starting":
      return { ...state, cameraError: null, cameraAspectRatio: null, isCameraReady: false, isCameraStarting: true };
    case "permission":
      return { ...state, cameraPermission: action.permission };
    case "denied":
      return { ...state, cameraAspectRatio: null, cameraError: "Izin kamera tidak diizinkan. Silahkan izinkan akses kamera terlebih dahulu.", isCameraEnabled: false, isCameraReady: false, isCameraStarting: false };
    case "enabled":
      return { ...state, cameraError: null, cameraKey: state.cameraKey + 1, isCameraEnabled: true, isCameraStarting: true };
    case "ready":
      return { ...state, cameraAspectRatio: action.aspectRatio, cameraError: null, cameraPermission: "granted", isCameraReady: true, isCameraStarting: false };
    case "error":
      return { ...state, cameraAspectRatio: null, cameraError: action.error, isCameraEnabled: false, isCameraReady: false, isCameraStarting: false };
    case "selectCamera":
      return { ...state, cameraAspectRatio: null, cameraKey: state.cameraKey + 1, isCameraReady: false, isCameraStarting: true, selectedCameraId: action.deviceId };
    case "restart":
      return { ...state, cameraError: null, cameraKey: state.cameraKey + 1, isCameraStarting: true };
    case "unavailable":
      return { ...state, cameraAspectRatio: null, cameraError: "Akses kamera berubah. Izinkan kamera lalu klik Coba Kamera.", isCameraEnabled: false, isCameraReady: false, isCameraStarting: false };
    default:
      return state;
  }
}

export function useFoodScanCamera() {
  const [state, dispatch] = useReducer(cameraReducer, initialCameraState);
  const { cameraAspectRatio, cameraDevices, cameraError, cameraKey, cameraPermission, isCameraEnabled, isCameraReady, isCameraStarting, selectedCameraId } = state;
  const webcamRef = useRef<Webcam>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const activeStreamsRef = useRef<Set<MediaStream>>(new Set());
  const isMountedRef = useRef(false);

  const stopCameraStream = useCallback(() => {
    const streams = new Set(activeStreamsRef.current);
    if (cameraStreamRef.current) streams.add(cameraStreamRef.current);

    const video = (webcamRef.current as (Webcam & { video?: HTMLVideoElement }) | null)?.video ?? document.querySelector<HTMLVideoElement>('[data-food-scan-camera] video');
    if (typeof MediaStream !== "undefined" && video?.srcObject instanceof MediaStream) streams.add(video.srcObject);

    streams.forEach((stream) => {
      stream.getTracks().forEach((track) => {
        track.onended = null;
        track.onmute = null;
        track.stop();
      });
    });

    activeStreamsRef.current.clear();
    cameraStreamRef.current = null;

    if (video) video.srcObject = null;
  }, []);

  const refreshCameraDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;

    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter((device) => device.kind === "videoinput");
    dispatch({ type: "devicesLoaded", devices: videoDevices, selectedCameraId });
  }, [selectedCameraId]);

  const markCameraUnavailable = useCallback(() => {
    dispatch({ type: "unavailable" });
  }, []);

  const retryCamera = useCallback(async () => {
    dispatch({ type: "starting" });

    const permission = await queryCameraPermission();
    dispatch({ type: "permission", permission });

    if (permission === "denied") {
      dispatch({ type: "denied" });
      return;
    }

    try {
      await requestCameraAccess();
      dispatch({ type: "permission", permission: "granted" });
      await refreshCameraDevices();
      dispatch({ type: "enabled" });
    } catch (error) {
      dispatch({ type: "error", error: getCameraErrorMessage(error instanceof DOMException ? error : undefined) });
    }
  }, [refreshCameraDevices]);

  const handleCameraReady = useCallback((stream: MediaStream) => {
    if (!isMountedRef.current) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }

    cameraStreamRef.current = stream;
    activeStreamsRef.current.add(stream);
    const videoTrack = stream.getVideoTracks()[0];
    const settings = typeof videoTrack?.getSettings === "function" ? videoTrack.getSettings() : undefined;
    const nextAspectRatio = settings?.aspectRatio || (settings?.width && settings?.height ? settings.width / settings.height : null);

    const safeAspectRatio = nextAspectRatio && Number.isFinite(nextAspectRatio) ? nextAspectRatio : null;
    stream.getVideoTracks().forEach((track) => {
      track.onended = () => {
        activeStreamsRef.current.delete(stream);
        markCameraUnavailable();
      };
      track.onmute = markCameraUnavailable;
    });
    dispatch({ type: "ready", aspectRatio: safeAspectRatio });
    void refreshCameraDevices();
  }, [markCameraUnavailable, refreshCameraDevices]);

  const handleCameraError = useCallback((error: string | DOMException) => {
    dispatch({ type: "error", error: getCameraErrorMessage(error) });
  }, []);

  const selectCamera = useCallback((deviceId: string) => {
    stopCameraStream();
    dispatch({ type: "selectCamera", deviceId });
  }, [stopCameraStream]);

  const captureFoodImage = useCallback(async () => {
    let screenshot = webcamRef.current?.getScreenshot();

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
        dispatch({ type: "permission", permission: null });
        return;
      }

      try {
        permissionStatus = await navigator.permissions.query({ name: "camera" as PermissionName });
        dispatch({ type: "permission", permission: permissionStatus.state });
        permissionStatus.onchange = () => {
          const nextState = permissionStatus?.state ?? null;
          dispatch({ type: "permission", permission: nextState });

          if (nextState === "denied") {
            markCameraUnavailable();
            return;
          }

        };
      } catch {
        dispatch({ type: "permission", permission: null });
      }
    })();

    return () => {
      if (permissionStatus) permissionStatus.onchange = null;
    };
  }, [markCameraUnavailable]);

  useEffect(() => {
    const refreshCameraOnFocus = () => {
      if (cameraPermission !== "granted" || !isCameraEnabled || isCameraReady) return;
      dispatch({ type: "restart" });
    };

    window.addEventListener("focus", refreshCameraOnFocus);
    document.addEventListener("visibilitychange", refreshCameraOnFocus);

    return () => {
      window.removeEventListener("focus", refreshCameraOnFocus);
      document.removeEventListener("visibilitychange", refreshCameraOnFocus);
    };
  }, [cameraPermission, isCameraEnabled, isCameraReady]);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      stopCameraStream();
    };
  }, [stopCameraStream]);

  return {
    cameraDevices,
    cameraError,
    cameraAspectRatio,
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
    stopCameraStream,
    webcamRef,
  };
}
