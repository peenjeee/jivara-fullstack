"use client";

import { useEffect, type ReactNode } from "react";
import { showToast } from "@/lib/swal";

interface PwaInstallPromptProviderProps {
  readonly children: ReactNode;
}

export default function PwaInstallPromptProvider({ children }: PwaInstallPromptProviderProps) {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        window.__jivaraInstallPrompt = null;
      });
    }

    const handleAppInstalled = () => {
      window.__jivaraInstallPrompt = null;
      window.localStorage.setItem("jivara-pwa-installed", "true");
      showToast("Jivara berhasil dipasang.", "success");
    };

    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
    if (isStandalone) window.localStorage.setItem("jivara-pwa-installed", "true");

    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  return <>{children}</>;
}
