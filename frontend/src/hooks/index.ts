"use client";

import { useState, useEffect } from "react";

/**
 * Hook untuk melacak posisi scroll.
 * Digunakan untuk transisi.
 */
export const useScrollThreshold = (threshold: number = 20) => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > threshold);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [threshold]);

  return isScrolled;
};

/**
 * Hook untuk mengunci body scroll saat modal atau drawer terbuka.
 */
export const useLockBodyScroll = (lock: boolean) => {
  useEffect(() => {
    if (lock) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [lock]);
};

/**
 * Hook untuk mendeteksi app dibuka sebagai installed PWA/standalone.
 */
export const useIsStandalonePwa = () => {
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    const getIsStandalone = () => mediaQuery.matches || Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone) || window.localStorage.getItem("jivara-pwa-preview") === "true";
    const updateStandaloneState = () => setIsStandalone(getIsStandalone());
    const searchParams = new URLSearchParams(window.location.search);

    if (searchParams.get("pwaPreview") === "true") window.localStorage.setItem("jivara-pwa-preview", "true");
    if (searchParams.get("pwaPreview") === "false") window.localStorage.removeItem("jivara-pwa-preview");

    updateStandaloneState();
    mediaQuery.addEventListener("change", updateStandaloneState);
    return () => mediaQuery.removeEventListener("change", updateStandaloneState);
  }, []);

  return isStandalone;
};
