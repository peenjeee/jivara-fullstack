"use client";

import { useEffect, useRef, useState } from "react";

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
  const containerRef = useRef<HTMLDivElement>(null);
  const modelRef = useRef<HTMLElement | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);

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

    import("@google/model-viewer")
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!ready || !containerRef.current) return;

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
    mv.addEventListener("load", () => {
      mv.style.opacity = "1";
    });

    containerRef.current.appendChild(mv);
    modelRef.current = mv;

    return () => {
      if (modelRef.current) {
        modelRef.current.remove();
        modelRef.current = null;
      }
    };
  }, [ready, src, alt, poster, autoRotate, cameraControls, disableZoom, disablePan, cameraOrbit, fieldOfView, shadowIntensity, shadowSoftness, exposure, environmentImage]);

  if (error) return null;

  return <div ref={containerRef} className={className} style={style} />;
}
