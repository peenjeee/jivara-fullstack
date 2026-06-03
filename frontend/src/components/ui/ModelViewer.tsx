"use client";

import Image from "next/image";
import { useEffect, useReducer, useRef } from "react";

interface ModelViewerProps {
  src: string;
  alt?: string;
  poster?: string;
  className?: string;
  autoRotate?: boolean;
  cameraControls?: boolean;
  disableZoom?: boolean;
  disablePan?: boolean;
  cameraOrbit?: string;
  fieldOfView?: string;
  shadowIntensity?: string;
  shadowSoftness?: string;
  exposure?: string;
  environmentImage?: string;
  style?: React.CSSProperties;
}

type IdleWindow = Window & {
  requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
  cancelIdleCallback?: (handle: number) => void;
};

export default function ModelViewer({
  src,
  alt = "3D Model",
  poster,
  className = "",
  autoRotate = true,
  cameraControls = true,
  disableZoom = false,
  disablePan = false,
  cameraOrbit,
  fieldOfView,
  shadowIntensity = "0",
  shadowSoftness = "0",
  exposure = "1",
  environmentImage = "neutral",
  style,
}: ModelViewerProps) {
  type ModelViewerState = { loaded: boolean; error: boolean };
  type ModelViewerAction = { type: "loading" } | { type: "loaded" } | { type: "error" };

  const modelViewerReducer = (_state: ModelViewerState, action: ModelViewerAction): ModelViewerState => {
    switch (action.type) {
      case "loading": return { loaded: false, error: false };
      case "loaded": return { loaded: true, error: false };
      case "error": return { loaded: false, error: true };
    }
  };

  const containerRef = useRef<HTMLDivElement>(null);
  const modelRef = useRef<HTMLElement | null>(null);
  const [state, dispatch] = useReducer(modelViewerReducer, { loaded: false, error: false });

  // Suppress Three.js texture blob rejection noise (non-fatal)
  useEffect(() => {
    const handler = (e: PromiseRejectionEvent) => {
      if (e.reason instanceof Event || (e.reason?.message && /texture|blob/i.test(e.reason.message))) {
        e.preventDefault();
      }
    };
    window.addEventListener("unhandledrejection", handler);
    return () => window.removeEventListener("unhandledrejection", handler);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;
    const idleWindow = window as IdleWindow;

    const createModelViewer = () => {
      if (cancelled || !containerRef.current) return;

      dispatch({ type: "loading" });

      if (modelRef.current) {
        modelRef.current.remove();
        modelRef.current = null;
      }

      const mv = document.createElement("model-viewer");
      mv.setAttribute("src", src);
      mv.setAttribute("alt", alt);
      mv.setAttribute("loading", "eager");
      mv.setAttribute("reveal", "auto");
      mv.setAttribute("interaction-prompt", "none");
      mv.setAttribute("shadow-intensity", shadowIntensity);
      mv.setAttribute("shadow-softness", shadowSoftness);
      mv.setAttribute("exposure", exposure);
      mv.setAttribute("environment-image", environmentImage);

      if (autoRotate) {
        mv.setAttribute("auto-rotate", "");
        mv.setAttribute("auto-rotate-delay", "0");
        mv.setAttribute("rotation-per-second", "36deg");
      }
      if (cameraControls) mv.setAttribute("camera-controls", "");
      if (disableZoom) mv.setAttribute("disable-zoom", "");
      if (disablePan) mv.setAttribute("disable-pan", "");
      if (cameraOrbit) mv.setAttribute("camera-orbit", cameraOrbit);
      if (fieldOfView) {
        mv.setAttribute("field-of-view", fieldOfView);
        mv.setAttribute("min-field-of-view", fieldOfView);
        mv.setAttribute("max-field-of-view", fieldOfView);
      }
      if (poster) mv.setAttribute("poster", poster);

      mv.style.width = "100%";
      mv.style.height = "100%";
      mv.style.outline = "none";
      mv.style.border = "none";
      mv.style.background = "transparent";
      mv.style.setProperty("--poster-color", "transparent");

      // Hide default progress bar
      const hideBar = document.createElement("div");
      hideBar.slot = "progress-bar";
      mv.appendChild(hideBar);

      // Hide default poster/spinner
      const hidePoster = document.createElement("div");
      hidePoster.slot = "poster";
      mv.appendChild(hidePoster);

      // Fade in once model is fully loaded
      mv.style.opacity = "0";
      mv.style.transition = "opacity 0.4s ease";
      const handleLoad = () => {
        mv.style.opacity = "1";
        dispatch({ type: "loaded" });
      };
      mv.addEventListener("load", handleLoad);

      containerRef.current.appendChild(mv);
      modelRef.current = mv;
    };

    const loadModelViewer = () => {
      import("@google/model-viewer")
        .then(() => {
          if (!cancelled) createModelViewer();
        })
        .catch(() => {
          if (!cancelled) dispatch({ type: "error" });
        });
    };

    if (idleWindow.requestIdleCallback && idleWindow.cancelIdleCallback) {
      const idleId = idleWindow.requestIdleCallback(loadModelViewer, { timeout: 1800 });
      return () => {
        cancelled = true;
        idleWindow.cancelIdleCallback?.(idleId);
      };
    }

    fallbackTimer = setTimeout(loadModelViewer, 450);
    return () => {
      cancelled = true;
      if (fallbackTimer) clearTimeout(fallbackTimer);
    };
  }, [src, alt, poster, autoRotate, cameraControls, disableZoom, disablePan, cameraOrbit, fieldOfView, shadowIntensity, shadowSoftness, exposure, environmentImage]);

  if (state.error) return null;

  return (
    <div ref={containerRef} className={`relative overflow-hidden ${className}`} style={style}>
      {poster && (
        <Image
          src={poster}
          alt=""
          aria-hidden="true"
          fill
          sizes="(min-width: 1024px) 460px, 70vw"
          className={`pointer-events-none object-contain transition-opacity duration-500 ${state.loaded ? "opacity-0" : "opacity-100"}`}
          preload
          fetchPriority="high"
        />
      )}
    </div>
  );
}
